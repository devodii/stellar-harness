import { createAnthropic } from '@ai-sdk/anthropic';
import { appError } from '@harness/schema';
import { convertToModelMessages, safeValidateUIMessages, stepCountIs, streamText } from 'ai';
import { z } from 'zod';
import { getAgentTools, systemPrompt } from '@/lib/agent';
import { apiHandler } from '@/lib/api-handler';
import {
  dataPartSchemas,
  dataPartToModelText,
  type HarnessUIMessage,
  planDecisions,
} from '@/lib/chat';
import { getChatEnv } from '@/lib/env';
import { logger } from '@/lib/log';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_STEPS = 10;

const ChatBody = z.object({ id: z.string().optional(), messages: z.array(z.unknown()).min(1) });

const loadChatEnv = () => {
  try {
    return getChatEnv();
  } catch (error) {
    throw appError('INTERNAL', error instanceof Error ? error.message : 'Chat is not configured');
  }
};

const streamErrorMessage = (error: unknown): string => {
  logger.error({ error }, 'chat stream failed');
  return error instanceof Error ? error.message : 'The agent stream failed.';
};

export const POST = apiHandler({
  name: 'chat.stream',
  schema: { body: ChatBody },
  rateLimit: { limit: 30, windowSeconds: 60 },
  handler: async ({ body, requestId }) => {
    const env = loadChatEnv();

    const validated = await safeValidateUIMessages<HarnessUIMessage>({
      messages: body.messages,
      dataSchemas: dataPartSchemas,
    });
    if (!validated.success) throw appError('INVALID_INPUT', validated.error.message);
    const messages = validated.data;

    const decisions = planDecisions(messages.slice(-1));
    if (Object.keys(decisions).length > 0) {
      logger.info({ requestId, decisions }, 'plan approval received');
    }

    const tools = getAgentTools();
    const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const result = streamText({
      model: anthropic(env.AI_MODEL),
      instructions: systemPrompt,
      messages: await convertToModelMessages<HarnessUIMessage>(messages, {
        tools,
        convertDataPart: dataPartToModelText,
      }),
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
    });

    return result.toUIMessageStreamResponse<HarnessUIMessage>({
      originalMessages: messages,
      sendReasoning: true,
      sendSources: true,
      onError: streamErrorMessage,
    });
  },
});
