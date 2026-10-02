import { type AppError, appError } from '../schema';

export class ToolError extends Error {
  readonly error: AppError;

  constructor(error: AppError) {
    super(error.message);
    this.error = error;
  }
}

export const fail = (...args: Parameters<typeof appError>): never => {
  throw new ToolError(appError(...args));
};
