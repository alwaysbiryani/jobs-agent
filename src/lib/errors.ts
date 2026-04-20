export const DEPENDENCY_DATABASE_UNAVAILABLE = "DEPENDENCY_DATABASE_UNAVAILABLE";

type AppErrorOptions = {
  status: number;
  code: string;
  cause?: unknown;
};

export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.status = options.status;
    this.code = options.code;

    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function databaseUnavailableError(cause?: unknown) {
  return new AppError(
    "Database is unavailable. Set DATABASE_URL and verify database connectivity.",
    {
      status: 503,
      code: DEPENDENCY_DATABASE_UNAVAILABLE,
      cause,
    }
  );
}

export function toErrorResponse(error: unknown) {
  if (isAppError(error)) {
    return {
      status: error.status,
      body: {
        code: error.code,
        error: error.message,
      },
    };
  }

  const fallbackMessage = error instanceof Error ? error.message : "Unexpected server error";
  return {
    status: 500,
    body: {
      code: "INTERNAL_SERVER_ERROR",
      error: fallbackMessage,
    },
  };
}
