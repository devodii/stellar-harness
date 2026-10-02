import 'server-only';
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

export type Logger = pino.Logger;

export const childLogger = (requestId: string, bindings: Record<string, unknown> = {}): Logger =>
  logger.child({ requestId, ...bindings });
