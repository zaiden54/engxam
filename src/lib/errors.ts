export type ErrorCode = "VALIDATION_ERROR" | "CONFLICT" | "UNAVAILABLE" | "FORBIDDEN" | "UNAUTHENTICATED" | "NOT_FOUND";
export class AppError extends Error {
  constructor(public code: ErrorCode, message: string) { super(message); }
}
export function publicError(error: unknown, requestId: string) {
  return { code: error instanceof AppError ? error.code : "UNAVAILABLE", message: error instanceof AppError ? error.message : "Не удалось выполнить действие. Попробуйте ещё раз.", requestId };
}
