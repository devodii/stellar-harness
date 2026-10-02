import { ApiErrorBody } from './api-schemas';

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const chatErrorMessage = (error: Error): string => {
  const parsed = ApiErrorBody.safeParse(parseJson(error.message));
  if (parsed.success) return `${parsed.data.error.code}: ${parsed.data.error.message}`;
  return error.message || 'The chat request failed.';
};
