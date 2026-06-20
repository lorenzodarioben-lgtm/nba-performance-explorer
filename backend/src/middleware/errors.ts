import {
  ApiErrorResponseSchema,
  type ApiErrorResponse,
} from '@nba-performance-explorer/contracts';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';

function sendError(response: Response, status: number, code: string, message: string) {
  const responseBody: ApiErrorResponse = {
    error: {
      code,
      message,
      status,
    },
  };

  return response.status(status).json(ApiErrorResponseSchema.parse(responseBody));
}

export const methodNotAllowedHandler: RequestHandler = (_request, response) => {
  response.set('Allow', 'GET');
  sendError(response, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
};

export const notFoundHandler: RequestHandler = (_request, response) => {
  sendError(response, 404, 'NOT_FOUND', 'Route not found.');
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  console.error('Unexpected error while handling request.', error);
  sendError(response, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred.');
};
