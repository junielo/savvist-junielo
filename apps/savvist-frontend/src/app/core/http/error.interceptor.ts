import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError, ApiErrorBody } from './api-error';

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: unknown) =>
      throwError(() => (err instanceof HttpErrorResponse ? toApiError(err) : err)),
    ),
  );

function toApiError(err: HttpErrorResponse): ApiError {
  if (err.status === 0) {
    return new ApiError(0, ['Cannot reach the server. Check your connection and try again.']);
  }

  const body = isApiErrorBody(err.error) ? err.error : null;
  const raw = body?.message;
  const messages = Array.isArray(raw) ? raw : raw ? [raw] : [fallbackMessage(err.status)];

  return new ApiError(err.status, messages, body);
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'statusCode' in value && 'message' in value;
}

function fallbackMessage(status: number): string {
  if (status === 404) return 'Not found.';
  if (status >= 500) return 'Something went wrong on the server. Please try again.';
  return 'The request could not be completed.';
}