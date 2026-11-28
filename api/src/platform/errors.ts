import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'RATE_LIMITED'
  | 'NOT_IMPLEMENTED'
  | 'INTERNAL_ERROR';

export interface ProblemDetail {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export interface Problem {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly message: string;
  readonly requestId: string;
  readonly details?: readonly ProblemDetail[];
}

/**
 * Base class for expected failures. Only `expose` errors may surface their
 * message to a client; everything else is collapsed into a generic 500.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly expose: boolean;
  readonly details?: readonly ProblemDetail[];

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    options: { expose?: boolean; details?: readonly ProblemDetail[]; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.expose = options.expose ?? statusCode < 500;
    if (options.details !== undefined) {
      this.details = options.details;
    }
  }
}

export class ValidationError extends AppError {
  constructor(message = 'The request could not be validated', details?: readonly ProblemDetail[]) {
    super(400, 'VALIDATION_ERROR', message, details === undefined ? {} : { details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'The request conflicts with the current state') {
    super(409, 'CONFLICT', message);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'The request body is too large') {
    super(413, 'PAYLOAD_TOO_LARGE', message);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests') {
    super(429, 'RATE_LIMITED', message);
  }
}

export class NotImplementedError extends AppError {
  constructor(message = 'This endpoint is not implemented yet') {
    super(501, 'NOT_IMPLEMENTED', message);
  }
}

export class InternalError extends AppError {
  constructor(cause?: unknown) {
    super(500, 'INTERNAL_ERROR', 'An unexpected error occurred', {
      expose: false,
      ...(cause === undefined ? {} : { cause }),
    });
  }
}

const STATUS_CODE_MAP: Readonly<Record<number, ErrorCode>> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  429: 'RATE_LIMITED',
  501: 'NOT_IMPLEMENTED',
};

function isFastifyError(error: unknown): error is FastifyError {
  return typeof error === 'object' && error !== null && 'statusCode' in error;
}

function zodDetails(error: ZodError): ProblemDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    code: issue.code,
    message: issue.message,
  }));
}

/**
 * Converts anything thrown into a client-safe problem document. Stack traces,
 * SQL, and internal error messages never cross this boundary.
 */
export function toProblem(error: unknown, requestId: string): Problem {
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'The request could not be validated',
      requestId,
      details: zodDetails(error),
    };
  }

  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.expose ? error.message : 'An unexpected error occurred',
      requestId,
      ...(error.expose && error.details !== undefined ? { details: error.details } : {}),
    };
  }

  if (isFastifyError(error) && typeof error.statusCode === 'number' && error.statusCode < 500) {
    const statusCode = error.statusCode;
    const code = STATUS_CODE_MAP[statusCode] ?? 'VALIDATION_ERROR';
    return {
      statusCode,
      code,
      message:
        code === 'PAYLOAD_TOO_LARGE'
          ? 'The request body is too large'
          : 'The request could not be accepted',
      requestId,
    };
  }

  return {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    requestId,
  };
}

export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const problem = toProblem(error, request.id);

    if (problem.statusCode >= 500) {
      request.log.error({ err: error, code: problem.code }, 'request failed');
    } else if (problem.statusCode === 429) {
      request.log.warn({ code: problem.code }, 'request rate limited');
    } else {
      request.log.info(
        { code: problem.code, statusCode: problem.statusCode },
        'request rejected by validation',
      );
    }

    return reply.status(problem.statusCode).type('application/json').send(problem);
  });

  app.setNotFoundHandler((request, reply) => {
    const problem: Problem = {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Route not found',
      requestId: request.id,
    };
    return reply.status(404).type('application/json').send(problem);
  });
}
