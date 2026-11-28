import { z } from 'zod';

/**
 * Job lifecycle and intake rules.
 *
 * Status changes are a small allow-list: a delivered or cancelled job is
 * terminal, so a late webhook or a double click cannot reopen finished work.
 * Intake answers are validated against the template the job was created with.
 */

export type JobStatus = 'intake_pending' | 'in_progress' | 'delivered' | 'cancelled';

const TRANSITIONS: Readonly<Record<JobStatus, readonly JobStatus[]>> = {
  intake_pending: ['in_progress', 'delivered', 'cancelled'],
  in_progress: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export const intakeQuestionSchema = z
  .object({
    key: z
      .string()
      .trim()
      .regex(/^[a-z][a-z0-9_]{0,39}$/, 'Use a lowercase key such as "venue"'),
    label: z.string().trim().min(1).max(160),
    type: z.enum(['text', 'long_text', 'number', 'date', 'choice']),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1).max(80)).min(1).max(20).optional(),
  })
  .strict()
  .superRefine((question, ctx) => {
    if (question.type === 'choice' && !question.options) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'A choice question needs at least one option',
      });
    }
    if (question.type !== 'choice' && question.options) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Only choice questions take options',
      });
    }
  });

export type IntakeQuestion = z.infer<typeof intakeQuestionSchema>;

/** Reads template JSON without letting bad stored data crash the portal. */
export function parseStoredQuestions(value: unknown): IntakeQuestion[] {
  const parsed = z.array(intakeQuestionSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

export const INTAKE_ANSWER_LIMIT = 2000;
export const MAX_INTAKE_QUESTIONS = 20;

/** Returns one message per problem; an empty list means the answers are valid. */
export function validateIntakeAnswers(
  questions: readonly IntakeQuestion[],
  answers: Readonly<Record<string, string>>,
): string[] {
  const errors: string[] = [];
  const byKey = new Map(questions.map((question) => [question.key, question]));

  for (const key of Object.keys(answers)) {
    if (!byKey.has(key)) errors.push(`Unknown answer: ${key}`);
  }

  for (const question of questions) {
    const value = answers[question.key];
    const present = typeof value === 'string' && value.trim().length > 0;

    if (!present) {
      if (question.required) errors.push(`${question.label} is required`);
      continue;
    }

    if (question.type === 'choice') {
      const options = question.options ?? [];
      if (!options.includes(value.trim())) {
        errors.push(`${question.label} must be one of: ${options.join(', ')}`);
      }
    }
    if (question.type === 'number' && !/^-?\d+(?:\.\d+)?$/.test(value.trim())) {
      errors.push(`${question.label} must be a number`);
    }
    if (question.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      errors.push(`${question.label} must be a date (YYYY-MM-DD)`);
    }
  }

  return errors;
}
