export interface ApiValidationIssue {
  field: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: readonly ApiValidationIssue[],
  ) {
    super(message);
    this.name = "AppError";
  }
}
