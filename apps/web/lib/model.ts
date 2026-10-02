import "server-only";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { ChatEnv } from "./env";

export const CHAT_MODEL = "gpt-5.5";

export const createChatModel = (
  env: Pick<ChatEnv, "OPENAI_API_KEY">,
): LanguageModel => createOpenAI({ apiKey: env.OPENAI_API_KEY })(CHAT_MODEL);
