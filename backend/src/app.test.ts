import {
  ApiErrorResponseSchema,
  HealthResponseSchema,
} from '@nba-performance-explorer/contracts';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { app } from './app.js';
import { errorHandler } from './middleware/errors.js';

describe('API foundation', () => {
  it('returns a validated health response', async () => {
    const response = await request(app).get('/api/health').expect(200);
    const parsedResponse = HealthResponseSchema.parse(response.body);

    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(parsedResponse.service).toBe('nba-performance-explorer-api');
    expect(new Date(parsedResponse.timestamp).toISOString()).toBe(
      parsedResponse.timestamp,
    );
  });

  it('returns the shared structured 404 response for unknown routes', async () => {
    const response = await request(app).get('/api/unknown').expect(404);
    const parsedResponse = ApiErrorResponseSchema.parse(response.body);

    expect(parsedResponse).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found.',
        status: 404,
      },
    });
    expect(JSON.stringify(response.body).toLowerCase()).not.toContain('stack');
  });

  it('returns a structured response for unsupported health methods', async () => {
    const response = await request(app).post('/api/health').expect(405);

    expect(response.headers.allow).toBe('GET');
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'METHOD_NOT_ALLOWED',
    );
  });

  it('returns a generic 500 response without internal error details', async () => {
    const internalMessage = 'sensitive implementation detail';
    const errorApp = express();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    errorApp.get('/error', () => {
      throw new Error(internalMessage);
    });
    errorApp.use(errorHandler);

    const response = await request(errorApp).get('/error').expect(500);
    const responseText = JSON.stringify(response.body).toLowerCase();

    expect(ApiErrorResponseSchema.parse(response.body)).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
        status: 500,
      },
    });
    expect(responseText).not.toContain('stack');
    expect(responseText).not.toContain(internalMessage);

    consoleError.mockRestore();
  });
});
