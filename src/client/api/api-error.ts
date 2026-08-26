export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly fieldErrors: readonly FieldError[];

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: readonly FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  public fieldMessage(field: string): string | undefined {
    return this.fieldErrors.find((error) => error.field === field)?.message;
  }

  public get isOffline(): boolean {
    return this.code === 'NETWORK_ERROR';
  }
}
