// Backend-private provider error categories. A live provider throws one of these; the Express
// error middleware maps it to a stable public HTTP response. Internal messages are short and
// safe (never raw upstream URLs, bodies, headers, or cookies); the public message is generic.

export type ProviderErrorCode =
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_INVALID_RESPONSE';

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;

  constructor(code: ProviderErrorCode, message: string) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
  }
}

export function providerTimeout(
  message = 'Upstream request timed out.',
): ProviderError {
  return new ProviderError('PROVIDER_TIMEOUT', message);
}

export function providerUnavailable(
  message = 'Upstream source is unavailable.',
): ProviderError {
  return new ProviderError('PROVIDER_UNAVAILABLE', message);
}

export function providerInvalidResponse(
  message = 'Upstream source returned an unexpected response.',
): ProviderError {
  return new ProviderError('PROVIDER_INVALID_RESPONSE', message);
}

export interface ProviderHttpError {
  status: number;
  code: ProviderErrorCode;
  message: string;
}

// Map a provider error category to a stable public HTTP status and generic message. No upstream
// implementation detail is included.
export function providerErrorToHttp(error: ProviderError): ProviderHttpError {
  switch (error.code) {
    case 'PROVIDER_TIMEOUT':
      return {
        status: 504,
        code: error.code,
        message: 'The NBA data source timed out. Please try again.',
      };
    case 'PROVIDER_UNAVAILABLE':
      return {
        status: 503,
        code: error.code,
        message:
          'The NBA data source is currently unavailable. Please try again later.',
      };
    case 'PROVIDER_INVALID_RESPONSE':
      return {
        status: 502,
        code: error.code,
        message: 'The NBA data source returned an unexpected response.',
      };
  }
}
