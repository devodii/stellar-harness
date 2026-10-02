import { openai } from '@ai-sdk/openai';
import { SYSTEM_PROMPT } from '@harness/agent';
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';
import { tools } from '@/lib/harness';

export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();
  const result = streamText({
    model: openai(process.env.OPENAI_MODEL ?? 'gpt-4.1'),
    instructions: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages, { tools }),
    tools,
    stopWhen: stepCountIs(8),
  });
  return result.toUIMessageStreamResponse({
    onError: (error) => (error instanceof Error ? error.message : 'The agent failed.'),
  });
}
