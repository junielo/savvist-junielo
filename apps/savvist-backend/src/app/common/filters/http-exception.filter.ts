import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown> = { message: 'Internal server error' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      body = typeof res === 'string' ? { message: res } : (res as Record<string, unknown>);
    } else if (this.isDuplicateKey(exception)) {
      status = HttpStatus.CONFLICT;
      body = { message: 'A record with these values already exists' };
    } else if (this.isCastError(exception)) {
      status = HttpStatus.BAD_REQUEST;
      body = { message: 'Invalid id or value format' };
    } else {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      ...body,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private isDuplicateKey(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: number }).code === 11000;
  }

  private isCastError(e: unknown): boolean {
    return e instanceof Error && e.name === 'CastError';
  }
}