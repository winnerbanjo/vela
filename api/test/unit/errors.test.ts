import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
  toProblem,
} from '../../src/platform/errors.js';

const REQUEST_ID = 'f3a1c9b7-2e4f-4a6a-8c5b-8d1e3f7a9c2b';

describe('toProblem', () => {
  it('hides internal error messages behind a generic 500', () => {
    const problem = toProblem(new Error('password=hunter2 connection refused'), REQUEST_ID);

    expect(problem).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: REQUEST_ID,
    });
    expect(JSON.stringify(problem)).not.toContain('hunter2');
  });

  it('hides messages of non-exposed AppErrors', () => {
    const problem = toProblem(
      new AppError(503, 'INTERNAL_ERROR', 'upstream detail', { expose: false }),
      REQUEST_ID,
    );

    expect(problem.statusCode).toBe(503);
    expect(problem.message).toBe('An unexpected error occurred');
  });

  it('keeps safe messages and details for expected failures', () => {
    const problem = toProblem(
      new ValidationError('Email is invalid', [
        { path: 'email', code: 'custom', message: 'invalid' },
      ]),
      REQUEST_ID,
    );

    expect(problem).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Email is invalid',
      requestId: REQUEST_ID,
      details: [{ path: 'email', code: 'custom', message: 'invalid' }],
    });
  });

  it('maps Zod errors to field details without values', () => {
    const schema = z.object({ email: z.string().email(), age: z.number().int() });
    const parsed = schema.safeParse({ email: 'nope', age: 1.5 });
    if (parsed.success) throw new Error('expected parse to fail');

    const problem = toProblem(parsed.error, REQUEST_ID);

    expect(problem.statusCode).toBe(400);
    expect(problem.code).toBe('VALIDATION_ERROR');
    expect(problem.details?.map((detail) => detail.path)).toEqual(['email', 'age']);
  });

  it('maps Fastify client errors by status code', () => {
    const problem = toProblem({ statusCode: 413, message: 'body too large' }, REQUEST_ID);

    expect(problem.statusCode).toBe(413);
    expect(problem.code).toBe('PAYLOAD_TOO_LARGE');
    expect(problem.message).toBe('The request body is too large');
  });

  it('preserves semantic codes for domain errors', () => {
    expect(toProblem(new NotFoundError(), REQUEST_ID).code).toBe('NOT_FOUND');
    expect(toProblem(new ConflictError(), REQUEST_ID).statusCode).toBe(409);
  });
});
