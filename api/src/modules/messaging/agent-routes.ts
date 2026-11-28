import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { writeAudit } from '../../platform/audit.js';
import { createAuthGuards } from '../../platform/auth.js';
import type { AppConfig } from '../../platform/config.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../platform/errors.js';
import { startOfMonthInZone } from '../../shared/time.js';
import { buildAgentContext, generateAgentDraft } from './agent.js';
import { sendThreadMessage } from './outbound.js';

/**
 * Agent drafts, always human-approved. Mounted at /api/agent.
 *
 * The agent has read-only tools. Creating a draft cannot move money or change a
 * price, and approving it is the only path that sends. Drafts count against a
 * per-merchant monthly limit so a misconfigured loop cannot run up cost.
 */

const uuid = z.string().uuid();

function serializeDraft(draft: {
  id: string;
  threadId: string | null;
  status: string;
  goal: string;
  draftBody: string;
  model: string;
  approvedAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: draft.id,
    threadId: draft.threadId,
    status: draft.status,
    goal: draft.goal,
    body: draft.draftBody,
    model: draft.model,
    approvedAt: draft.approvedAt?.toISOString() ?? null,
    sentAt: draft.sentAt?.toISOString() ?? null,
    createdAt: draft.createdAt.toISOString(),
  };
}

export const agentRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (app, { config }) => {
  const guards = createAuthGuards(app, config);
  const staffOnly = [guards.requireMerchant];
  const ownerOnly = [guards.requireMerchant, guards.requireRole('owner')];

  app.post('/agent/drafts', { preHandler: staffOnly }, async (request, reply) => {
    const merchantId = request.auth?.merchantId as string;
    const body = z
      .object({
        goal: z.string().trim().min(3).max(500),
        threadId: uuid.optional(),
        clientName: z.string().trim().max(120).optional(),
      })
      .strict()
      .parse(request.body ?? {});

    if (config.agentMode === 'disabled') {
      throw new ForbiddenError('The agent is disabled');
    }

    const [integration, merchant] = await Promise.all([
      app.db.merchantIntegration.findUnique({ where: { merchantId } }),
      app.db.merchant.findFirst({
        where: { id: merchantId, deletedAt: null },
        select: { timezone: true },
      }),
    ]);
    if (!merchant) throw new NotFoundError('Merchant not found');
    if (!integration?.agentEnabled) {
      throw new ForbiddenError('The agent is not enabled for this merchant');
    }

    const thread = body.threadId
      ? await app.db.whatsappThread.findFirst({
          where: { id: body.threadId, merchantId },
        })
      : null;
    if (body.threadId && !thread) throw new NotFoundError('Conversation not found');

    const monthStart = startOfMonthInZone(merchant.timezone);
    const usedThisMonth = await app.db.agentDraft.count({
      where: { merchantId, createdAt: { gte: monthStart } },
    });
    if (usedThisMonth >= integration.agentMonthlyDraftLimit) {
      throw new ConflictError('The monthly agent draft limit has been reached');
    }

    const context = await buildAgentContext(app.db, merchantId);
    const draft = generateAgentDraft({
      context,
      goal: body.goal,
      clientName: body.clientName ?? thread?.clientName ?? null,
    });

    const saved = await app.db.agentDraft.create({
      data: {
        merchantId,
        threadId: thread?.id ?? null,
        goal: body.goal,
        context: context as never,
        draftBody: draft.body,
        model: draft.model,
      },
    });

    await writeAudit(app.db, {
      merchantId,
      actorId: request.auth?.userId ?? null,
      actorRole: request.auth?.role ?? null,
      action: 'agent.draft_created',
      entityType: 'agent_draft',
      entityId: saved.id,
      after: { tools: draft.toolsUsed, model: draft.model, threadId: thread?.id ?? null },
      ip: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
      requestId: request.id,
    });

    return reply.status(201).send({
      draft: { ...serializeDraft(saved), requiresApproval: true },
      toolsUsed: draft.toolsUsed,
    });
  });

  app.get('/agent/drafts', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const query = z
      .object({
        status: z.enum(['pending', 'approved', 'rejected', 'sent', 'failed']).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(request.query ?? {});

    const drafts = await app.db.agentDraft.findMany({
      where: {
        merchantId,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return { drafts: drafts.map(serializeDraft) };
  });

  app.post<{ Params: { id: string } }>(
    '/agent/drafts/:id/approve',
    { preHandler: ownerOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);

      const draft = await app.db.agentDraft.findFirst({ where: { id, merchantId } });
      if (!draft) throw new NotFoundError('Draft not found');
      if (draft.status !== 'pending') {
        throw new ConflictError('Only a pending draft can be approved');
      }
      if (!draft.threadId) {
        throw new ConflictError('Attach a conversation before sending this draft');
      }

      const [thread, merchant, integration] = await Promise.all([
        app.db.whatsappThread.findFirst({
          where: { id: draft.threadId, merchantId },
        }),
        app.db.merchant.findFirst({
          where: { id: merchantId },
          select: { timezone: true },
        }),
        app.db.merchantIntegration.findUnique({ where: { merchantId } }),
      ]);
      if (!thread) throw new NotFoundError('Conversation not found');
      if (!merchant) throw new NotFoundError('Merchant not found');

      const message = await sendThreadMessage({
        db: app.db,
        config,
        merchant,
        integration,
        thread,
        body: draft.draftBody,
      });

      const approvedAt = new Date();
      const updated = await app.db.agentDraft.updateMany({
        where: { id, merchantId, status: 'pending' },
        data: {
          status: 'sent',
          approvedBy: request.auth?.userId ?? null,
          approvedAt,
          sentAt: approvedAt,
        },
      });
      if (updated.count === 0) {
        throw new ConflictError('That draft was already handled');
      }

      await writeAudit(app.db, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'agent.draft_approved',
        entityType: 'agent_draft',
        entityId: draft.id,
        after: { messageId: message.id, threadId: thread.id },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });

      return {
        draft: {
          ...serializeDraft({ ...draft, status: 'sent', approvedAt, sentAt: approvedAt }),
          messageId: message.id,
        },
      };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/agent/drafts/:id/reject',
    { preHandler: ownerOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);

      const updated = await app.db.agentDraft.updateMany({
        where: { id, merchantId, status: 'pending' },
        data: { status: 'rejected' },
      });
      if (updated.count === 0) throw new NotFoundError('Pending draft not found');

      await writeAudit(app.db, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'agent.draft_rejected',
        entityType: 'agent_draft',
        entityId: id,
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });

      return { rejected: true };
    },
  );
};
