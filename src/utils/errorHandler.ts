import { Response } from 'express';
import { ApiError } from '../types';

interface ErrorResponse {
  error: string;
  details?: any;
}

// HTTP status codes
export const STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER: 500,
} as const;

// Common error messages
export const ERROR_MESSAGES = {
  INTERNAL_SERVER: 'Internal server error',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized',
  INVALID_INPUT: 'Invalid input',
} as const;

// Error handler for async route handlers
export const asyncHandler = (fn: Function) => (req: any, res: Response, next: Function) => {
  Promise.resolve(fn(req, res, next)).catch((error: any) => {
    console.error(`Error in route handler: ${error.message}`);
    handleError(error, res);
  });
};

// Main error handler
export const handleError = (error: any, res: Response) => {
  console.error('Error details:', error);

  if (error.code === '23505') { // PostgreSQL unique violation
    return res.status(STATUS.CONFLICT).json({
      error: 'Resource already exists',
      details: error.detail
    });
  }

  if (error.code === '23503') { // PostgreSQL foreign key violation
    return res.status(STATUS.BAD_REQUEST).json({
      error: 'Invalid reference',
      details: error.detail
    });
  }

  // Handle known error types
  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: error.error });
  }

  // Default to 500 internal server error
  return res.status(STATUS.INTERNAL_SERVER).json({
    error: ERROR_MESSAGES.INTERNAL_SERVER
  });
};

// Error response helper functions
export const sendError = (res: Response, status: number, message: string, details?: any) => {
  const errorResponse: ErrorResponse = { error: message };
  if (details) {
    errorResponse.details = details;
  }
  res.status(status).json(errorResponse);
};

export const sendBadRequest = (res: Response, message = ERROR_MESSAGES.INVALID_INPUT) => {
  sendError(res, STATUS.BAD_REQUEST, message);
};

export const sendUnauthorized = (res: Response, message = ERROR_MESSAGES.UNAUTHORIZED) => {
  sendError(res, STATUS.UNAUTHORIZED, message);
};

export const sendNotFound = (res: Response, message = ERROR_MESSAGES.NOT_FOUND) => {
  sendError(res, STATUS.NOT_FOUND, message);
};

export const sendServerError = (res: Response, error: any) => {
  console.error('Server error:', error);
  sendError(res, STATUS.INTERNAL_SERVER, ERROR_MESSAGES.INTERNAL_SERVER);
};