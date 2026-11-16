import { NODE_ENV } from '../config/env.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  // SyntaxError from body-parser
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MALFORMED_JSON',
        message: 'Malformed JSON payload in request body',
        details: null
      }
    });
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details
      }
    });
  }

  // Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: `Invalid ID format for path '${err.path}'`,
        details: null
      }
    });
  }

  // Custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'APP_ERROR',
        message: err.message,
        details: err.details || null
      }
    });
  }

  // Unhandled / Internal Server Error
  console.error('Unhandled server error:', err);
  const statusCode = err.statusCode || 500;
  const errorObj = {
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'An internal server error occurred',
    details: null
  };

  if (NODE_ENV !== 'production' && err.stack) {
    errorObj.stack = err.stack;
  }

  return res.status(statusCode).json({
    success: false,
    error: errorObj
  });
};

export default errorHandler;
