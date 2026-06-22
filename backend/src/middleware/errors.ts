import {
  ApiErrorResponseSchema,
  type ApiErrorResponse,
} from '@nba-performance-explorer/contracts';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';

import {
  ProviderError,
  providerErrorToHttp,
} from '../features/players/provider-error.js';

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

  // A provider error maps to a stable upstream-failure status with a generic public message.
  // Only the safe category code is logged — never the upstream URL, body, headers, or stack.
  if (error instanceof ProviderError) {
    const { status, code, message } = providerErrorToHttp(error);
    console.warn(`Provider error while handling request: ${code}`);
    sendApiError(response, status, code, message);
    return;
  }

  console.error('Unexpected error while handling request.', error);
  sendApiError(response, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred.');
};
