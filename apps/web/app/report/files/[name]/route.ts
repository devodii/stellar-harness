import { appError } from '@harness/schema';
import { getReportFile } from '@harness/storage/report';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { db } from '@/lib/db';

const Params = z.object({ name: z.string().regex(/^[\w.-]+\.(csv|json)$/) });

export const GET = apiHandler({
  name: 'report.file',
  schema: { params: Params },
  handler: async ({ params }) => {
    const file = await getReportFile(await db(), params.name);
    if (!file) throw appError('NOT_FOUND', `${params.name} is not part of the published report`);
    const type = file.name.endsWith('.csv') ? 'text/csv' : 'application/json';
    return new Response(file.body, {
      headers: {
        'content-type': `${type}; charset=utf-8`,
        'content-disposition': `inline; filename="${file.name}"`,
        'x-content-sha256': file.sha256,
        'cache-control': 'public, max-age=300',
      },
    });
  },
});
