export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract errorCode: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  statusCode = 400;
  errorCode = 'VALIDATION_ERROR';
}

export class UnauthorizedError extends AppError {
  statusCode = 401;
  errorCode = 'UNAUTHORIZED';
}

export class ForbiddenError extends AppError {
  statusCode = 403;
  errorCode = 'FORBIDDEN';
}

export class NotFoundError extends AppError {
  statusCode = 404;
  errorCode = 'NOT_FOUND';
}

export class ConflictError extends AppError {
  statusCode = 409;
  errorCode = 'CONFLICT';
}

export class BusinessLogicError extends AppError {
  statusCode = 422;
  errorCode = 'BUSINESS_LOGIC_ERROR';
}

export class InternalServerError extends AppError {
  statusCode = 500;
  errorCode = 'INTERNAL_SERVER_ERROR';
}