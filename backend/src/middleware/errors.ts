import {
  ApiErrorResponseSchema,
  type ApiErrorResponse,
} from '@nba-performance-explorer/contracts';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';

export function sendApiError(
  response: Response,
  status: number,
  code: string,
  message: string,
) {
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
  sendApiError(response, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
};

export const notFoundHandler: RequestHandler = (_request, response) => {
  sendApiError(response, 404, 'NOT_FOUND', 'Route not found.');
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  console.error('Unexpected error while handling request.', error);
  sendApiError(response, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred.');
};
