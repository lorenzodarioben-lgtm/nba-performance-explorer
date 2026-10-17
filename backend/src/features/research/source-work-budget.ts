import type { RequestHandler } from 'express';
import { sendApiError } from '../../middleware/errors.js';

// Hold a slot until the handler's source work settles, including client disconnects.
// No queue, background retry or unlimited waiting work is created.
export class SourceWorkBudget {
  private active = 0;
  constructor(private readonly limit = 3) {}
  wrap(handler: RequestHandler): RequestHandler {
    return async (req, res, next) => {
      if (this.active >= this.limit) {
        sendApiError(
          res,
          503,
          'RESEARCH_BUSY',
          'Research data is busy. Try again later.',
        );
        return;
      }
      this.active++;
      try {
        await handler(req, res, next);
      } catch (error) {
        next(error);
      } finally {
        this.active--;
      }
    };
  }
}
