export interface ApiErrorBody {
  statusCode: number;
  error?: string;
  message: string | string[];
  path?: string;
  timestamp?: string;
  /** Only present on the 409 from PUT /entry-records/:day */
  conflicts?: unknown[];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly messages: string[],
    readonly body: ApiErrorBody | null = null,
  ) {
    super(messages.join(' '));
    this.name = 'ApiError';
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get conflicts(): unknown[] {
    return this.body?.conflicts ?? [];
  }
}