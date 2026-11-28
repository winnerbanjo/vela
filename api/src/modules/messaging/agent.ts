import type { PrismaClient } from '@prisma/client';

/**
 * The messaging agent, deliberately narrow.
 *
 * It can read the business profile, services, and quote counts. It cannot
 * change prices, issue refunds, or send anything: a draft is stored for a human
 * owner to approve. The sandbox generator is rules-based, so the security
 * properties (no discount tool, no auto-send) are testable without a model key.
 */

export const AGENT_TOOLS = ['business_profile', 'services', 'quote_status'] as const;
export type AgentTool = (typeof AGENT_TOOLS)[number];

export interface AgentContext {
  readonly business: {
    readonly name: string;
    readonly trade: string;
    readonly location: string | null;
    readonly currency: string;
  };
  readonly services: ReadonlyArray<{
    readonly name: string;
    readonly durationMinutes: number;
    readonly priceKobo: number;
  }>;
  readonly quotes: { readonly sent: number; readonly accepted: number };
  readonly toolsAllowed: readonly AgentTool[];
}

export interface AgentDraft {
  readonly body: string;
  readonly model: string;
  readonly toolsUsed: readonly AgentTool[];
}

export async function buildAgentContext(
  db: PrismaClient,
  merchantId: string,
): Promise<AgentContext> {
  const [merchant, services, sent, accepted] = await Promise.all([
    db.merchant.findFirstOrThrow({
      where: { id: merchantId, deletedAt: null },
      select: { name: true, trade: true, location: true, currency: true },
    }),
    db.service.findMany({
      where: { merchantId, deletedAt: null, status: 'active' },
      orderBy: { sortOrder: 'asc' },
      take: 8,
      select: { name: true, durationMinutes: true, priceKobo: true },
    }),
    db.quote.count({ where: { merchantId, status: 'sent' } }),
    db.quote.count({ where: { merchantId, status: 'accepted' } }),
  ]);

  return {
    business: {
      name: merchant.name,
      trade: merchant.trade,
      location: merchant.location,
      currency: merchant.currency,
    },
    services: services.map((service) => ({
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceKobo: Number(service.priceKobo),
    })),
    quotes: { sent, accepted },
    toolsAllowed: AGENT_TOOLS,
  };
}

/**
 * Produces a draft from the context only. The free-text goal selects intent,
 * but is never interpolated into the message, so a prompt such as "give me 90%
 * off" cannot smuggle a discount into the reply.
 */
export function generateAgentDraft(input: {
  readonly context: AgentContext;
  readonly goal: string;
  readonly clientName?: string | null;
}): AgentDraft {
  const { context, goal, clientName } = input;
  const greeting = clientName ? `Hi ${clientName.split(' ')[0]}` : 'Hi';
  const serviceLine = context.services
    .slice(0, 3)
    .map((service) => `${service.name} (${service.durationMinutes} min)`)
    .join(', ');

  const intent = goal.toLowerCase();
  const nextStep = intent.includes('follow')
    ? 'Just checking in on your enquiry.'
    : intent.includes('quote')
      ? 'Happy to put together a quote for you.'
      : 'Happy to help you book.';

  const offerings = serviceLine
    ? `We offer ${serviceLine}.`
    : 'Tell us what you need and we will confirm what is available.';

  const body = [
    `${greeting}, thanks for messaging ${context.business.name}.`,
    nextStep,
    offerings,
    'Share the service and date that suit you, and the team will confirm availability and next steps.',
  ].join(' ');

  return {
    body: body.slice(0, 2000),
    model: 'vela-rules-v1',
    toolsUsed: ['business_profile', 'services'],
  };
}
