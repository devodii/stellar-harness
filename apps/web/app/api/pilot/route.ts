import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';

const PILOT_FILE = resolve(process.cwd(), '../../data/pilot.jsonl');

const PilotRequest = z.object({ email: z.email() });

export async function POST(request: Request) {
  const body = PilotRequest.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: 'Enter a valid email.' }, { status: 400 });
  const entry = {
    email: body.data.email,
    createdAt: new Date().toISOString(),
    userAgent: request.headers.get('user-agent')?.slice(0, 512) ?? '',
  };
  await mkdir(dirname(PILOT_FILE), { recursive: true });
  await appendFile(PILOT_FILE, `${JSON.stringify(entry)}\n`);
  const lines = (await readFile(PILOT_FILE, 'utf8')).split('\n').filter(Boolean);
  return Response.json({ count: lines.length });
}
