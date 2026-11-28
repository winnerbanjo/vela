import { Prisma, type Job } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createAuthGuards } from '../../platform/auth.js';
import { writeAudit } from '../../platform/audit.js';
import type { AppConfig } from '../../platform/config.js';
import { ConflictError, NotFoundError, ValidationError } from '../../platform/errors.js';
import { generateOpaqueToken, hashToken } from '../identity/tokens.js';
import {
  canTransition,
  intakeQuestionSchema,
  MAX_INTAKE_QUESTIONS,
  parseStoredQuestions,
  validateIntakeAnswers,
  type JobStatus,
} from './job.js';

/**
 * Jobs, intake templates, and the client portal. Mounted at /api.
 *
 * A job is created by the verified invoice payment, never by the client. The
 * portal token is digest-only and rate-limited, and intake answers are checked
 * against the template before they are stored.
 */

const uuid = z.string().uuid();
const portalToken = z
  .string()
  .trim()
  .min(20)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/, 'Malformed token');

const questionSet = z
  .array(intakeQuestionSchema)
  .max(MAX_INTAKE_QUESTIONS)
  .refine(
    (questions) => new Set(questions.map((question) => question.key)).size === questions.length,
    { message: 'Question keys must be unique' },
  );

const templateSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    questions: questionSet.default([]),
  })
  .strict();

const patchJobSchema = z
  .object({
    status: z.enum(['intake_pending', 'in_progress', 'delivered', 'cancelled']).optional(),
    intakeTemplateId: uuid.nullable().optional(),
  })
  .strict()
  .refine((value) => value.status !== undefined || value.intakeTemplateId !== undefined, {
    message: 'Provide a status or an intake template',
  });

const intakeBodySchema = z
  .object({
    answers: z.record(z.string().max(40), z.string().max(2000)),
  })
  .strict();

function serializeJob(job: Job) {
  return {
    id: job.id,
    title: job.title,
    clientName: job.clientName,
    clientEmail: job.clientEmail,
    clientPhone: job.clientPhone,
    eventDate: job.eventDate?.toISOString().slice(0, 10) ?? null,
    status: job.status,
    quoteVersionId: job.quoteVersionId,
    invoiceId: job.invoiceId,
    intakeTemplateId: job.intakeTemplateId,
    deliveredAt: job.deliveredAt?.toISOString() ?? null,
    cancelledAt: job.cancelledAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
  };
}

export const jobRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (app, { config }) => {
  const guards = createAuthGuards(app, config);
  const staffOnly = [guards.requireMerchant];
  const ownerOnly = [guards.requireMerchant, guards.requireRole('owner')];
  const publicLimit = { config: { rateLimit: { max: config.rateLimitPublicMax } } };

  // -------------------------------------------------------------------------
  // Intake templates
  // -------------------------------------------------------------------------

  app.post('/intake/templates', { preHandler: ownerOnly }, async (request, reply) => {
    const merchantId = request.auth?.merchantId as string;
    const body = templateSchema.parse(request.body);

    const template = await app.db.intakeTemplate.create({
      data: {
        merchantId,
        title: body.title,
        questions: body.questions as never,
      },
    });

    await writeAudit(app.db, {
      merchantId,
      actorId: request.auth?.userId ?? null,
      actorRole: request.auth?.role ?? null,
      action: 'intake_template.created',
      entityType: 'intake_template',
      entityId: template.id,
      after: { title: template.title, questions: body.questions.length },
      ip: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
      requestId: request.id,
    });

    return reply.status(201).send({
      template: {
        id: template.id,
        title: template.title,
        questions: body.questions,
        createdAt: template.createdAt.toISOString(),
      },
    });
  });

  app.get('/intake/templates', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const templates = await app.db.intakeTemplate.findMany({
      where: { merchantId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return {
      templates: templates.map((template) => ({
        id: template.id,
        title: template.title,
        questions: parseStoredQuestions(template.questions),
        updatedAt: template.updatedAt.toISOString(),
      })),
    };
  });

  app.put<{ Params: { id: string } }>(
    '/intake/templates/:id',
    { preHandler: ownerOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);
      const body = templateSchema.parse(request.body);

      const existing = await app.db.intakeTemplate.findFirst({ where: { id, merchantId } });
      if (!existing) throw new NotFoundError('Intake template not found');

      const template = await app.db.intakeTemplate.update({
        where: { id },
        data: { title: body.title, questions: body.questions as never },
      });

      await writeAudit(app.db, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'intake_template.updated',
        entityType: 'intake_template',
        entityId: template.id,
        after: { title: template.title, questions: body.questions.length },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });

      return {
        template: {
          id: template.id,
          title: template.title,
          questions: body.questions,
          updatedAt: template.updatedAt.toISOString(),
        },
      };
    },
  );

  // -------------------------------------------------------------------------
  // Jobs
  // -------------------------------------------------------------------------

  app.get('/jobs', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const query = z
      .object({
        status: z.enum(['intake_pending', 'in_progress', 'delivered', 'cancelled']).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(request.query ?? {});

    const jobs = await app.db.job.findMany({
      where: { merchantId, ...(query.status ? { status: query.status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
    });

    return { jobs: jobs.map(serializeJob) };
  });

  app.get<{ Params: { id: string } }>('/jobs/:id', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const id = uuid.parse(request.params.id);

    const job = await app.db.job.findFirst({
      where: { id, merchantId },
      include: {
        quoteVersion: { select: { version: true, quoteId: true } },
        invoice: { select: { id: true, number: true, kind: true, status: true } },
        intakeTemplate: true,
        submission: true,
      },
    });
    if (!job) throw new NotFoundError('Job not found');

    return {
      job: serializeJob(job),
      quote: job.quoteVersion
        ? { id: job.quoteVersion.quoteId, version: job.quoteVersion.version }
        : null,
      invoice: job.invoice,
      intake: {
        template: job.intakeTemplate
          ? {
              id: job.intakeTemplate.id,
              title: job.intakeTemplate.title,
              questions: parseStoredQuestions(job.intakeTemplate.questions),
            }
          : null,
        submission: job.submission
          ? {
              answers: job.submission.answers,
              submittedAt: job.submission.submittedAt.toISOString(),
            }
          : null,
      },
    };
  });

  app.patch<{ Params: { id: string } }>('/jobs/:id', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const id = uuid.parse(request.params.id);
    const body = patchJobSchema.parse(request.body);

    const job = await app.db.job.findFirst({
      where: { id, merchantId },
      include: { submission: { select: { id: true } }, intakeTemplate: true },
    });
    if (!job) throw new NotFoundError('Job not found');

    const terminal = job.status === 'delivered' || job.status === 'cancelled';
    if (terminal && (body.status !== undefined || body.intakeTemplateId !== undefined)) {
      throw new ConflictError('A finished job cannot be changed');
    }

    let templateId = job.intakeTemplateId;
    let templateQuestions = parseStoredQuestions(job.intakeTemplate?.questions ?? []);

    if (body.intakeTemplateId !== undefined) {
      if (job.submission) {
        throw new ConflictError('Intake has already been submitted for this job');
      }
      if (body.intakeTemplateId === null) {
        templateId = null;
        templateQuestions = [];
      } else {
        const template = await app.db.intakeTemplate.findFirst({
          where: { id: body.intakeTemplateId, merchantId },
        });
        if (!template) throw new NotFoundError('Intake template not found');
        templateId = template.id;
        templateQuestions = parseStoredQuestions(template.questions);
      }
    }

    const now = new Date();
    const nextStatus = (body.status ?? job.status) as JobStatus;
    if (body.status !== undefined) {
      if (job.status === body.status) {
        throw new ConflictError(`This job is already ${body.status}`);
      }
      if (!canTransition(job.status as JobStatus, body.status)) {
        throw new ConflictError(`A ${job.status} job cannot become ${body.status}`);
      }
    }

    if (nextStatus === 'intake_pending' && templateQuestions.length === 0) {
      throw new ValidationError('Attach an intake form before waiting for intake');
    }

    const updated = await app.db.$transaction(async (tx) => {
      const result = await tx.job.updateMany({
        where: { id, merchantId, status: job.status },
        data: {
          status: nextStatus,
          intakeTemplateId: templateId,
          ...(body.status === 'delivered' ? { deliveredAt: now } : {}),
          ...(body.status === 'cancelled' ? { cancelledAt: now } : {}),
        },
      });
      if (result.count === 0) {
        throw new ConflictError('That job changed while you were updating it');
      }

      await writeAudit(tx, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: body.status ? `job.${body.status}` : 'job.intake_template_changed',
        entityType: 'job',
        entityId: id,
        before: { status: job.status, intakeTemplateId: job.intakeTemplateId },
        after: { status: nextStatus, intakeTemplateId: templateId },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });

      return tx.job.findUniqueOrThrow({ where: { id } });
    });

    return { job: serializeJob(updated) };
  });

  /** Mints (or rotates) the client portal link. The raw token is shown once. */
  app.post<{ Params: { id: string } }>(
    '/jobs/:id/portal-link',
    { preHandler: staffOnly },
    async (request) => {
      const merchantId = request.auth?.merchantId as string;
      const id = uuid.parse(request.params.id);

      const job = await app.db.job.findFirst({ where: { id, merchantId } });
      if (!job) throw new NotFoundError('Job not found');
      if (job.status === 'cancelled') {
        throw new ConflictError('A cancelled job has no client portal');
      }

      const token = generateOpaqueToken();
      await app.db.job.update({
        where: { id },
        data: { portalTokenHash: hashToken(token), portalTokenIssuedAt: new Date() },
      });

      return { jobId: id, portalToken: token, portalPath: `/portal/${token}` };
    },
  );

  // -------------------------------------------------------------------------
  // Public client portal (token is the capability)
  // -------------------------------------------------------------------------

  app.get<{ Params: { token: string } }>('/public/jobs/:token', publicLimit, async (request) => {
    const token = portalToken.parse(request.params.token);

    const job = await app.db.job.findUnique({
      where: { portalTokenHash: hashToken(token) },
      include: {
        merchant: { select: { name: true, slug: true } },
        intakeTemplate: true,
        submission: true,
      },
    });
    if (!job) throw new NotFoundError('Job not found');

    const questions = parseStoredQuestions(job.intakeTemplate?.questions ?? []);

    return {
      merchant: { name: job.merchant.name, slug: job.merchant.slug },
      job: {
        title: job.title,
        clientName: job.clientName,
        eventDate: job.eventDate?.toISOString().slice(0, 10) ?? null,
        status: job.status,
        deliveredAt: job.deliveredAt?.toISOString() ?? null,
      },
      intake: {
        available:
          questions.length > 0 &&
          !job.submission &&
          job.status !== 'delivered' &&
          job.status !== 'cancelled',
        submitted: Boolean(job.submission),
        submittedAt: job.submission?.submittedAt.toISOString() ?? null,
        questions,
        answers: job.submission?.answers ?? null,
      },
    };
  });

  app.post<{ Params: { token: string } }>(
    '/public/jobs/:token/intake',
    publicLimit,
    async (request) => {
      const token = portalToken.parse(request.params.token);
      const body = intakeBodySchema.parse(request.body);

      const job = await app.db.job.findUnique({
        where: { portalTokenHash: hashToken(token) },
        include: { intakeTemplate: true, submission: true },
      });
      if (!job) throw new NotFoundError('Job not found');

      if (job.status === 'delivered' || job.status === 'cancelled') {
        throw new ConflictError('This job is no longer accepting intake');
      }
      if (job.submission) {
        throw new ConflictError('Intake was already submitted for this job');
      }

      const questions = parseStoredQuestions(job.intakeTemplate?.questions ?? []);
      if (questions.length === 0) {
        throw new ConflictError('This job has no intake form');
      }

      const errors = validateIntakeAnswers(questions, body.answers);
      if (errors.length > 0) {
        throw new ValidationError(
          'Intake answers are invalid',
          errors.map((message) => ({ path: 'answers', code: 'invalid', message })),
        );
      }

      const now = new Date();

      try {
        await app.db.$transaction(async (tx) => {
          await tx.intakeSubmission.create({
            data: {
              jobId: job.id,
              templateId: job.intakeTemplateId,
              answers: body.answers as never,
              submittedAt: now,
            },
          });

          // Intake complete means work can start; leave later states alone.
          await tx.job.updateMany({
            where: { id: job.id, status: 'intake_pending' },
            data: { status: 'in_progress' },
          });

          await writeAudit(tx, {
            merchantId: job.merchantId,
            actorId: null,
            actorRole: 'client',
            action: 'job.intake_submitted',
            entityType: 'job',
            entityId: job.id,
            after: {
              templateId: job.intakeTemplateId,
              answerCount: Object.keys(body.answers).length,
            },
            ip: request.ip,
            userAgent: request.headers['user-agent'] ?? null,
            requestId: request.id,
          });
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictError('Intake was already submitted for this job');
        }
        throw error;
      }

      const updated = await app.db.job.findUniqueOrThrow({ where: { id: job.id } });

      return {
        submitted: true,
        submittedAt: now.toISOString(),
        status: updated.status,
      };
    },
  );
};
