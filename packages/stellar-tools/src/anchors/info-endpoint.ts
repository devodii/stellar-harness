import type { AnchorStage } from '@harness/schema';
import type { Fetcher } from './ports';
import { getJson, isRecord, type JsonProbe, joinUrl, toEndpointProbe } from './request';
import type { EndpointProbe, StageRecord } from './schemas';
import { SKIP_REASONS, skippedStage, stageRecord } from './stage';

export type InfoEndpointOutcome = {
  record: StageRecord;
  endpoint: EndpointProbe | null;
  probe: JsonProbe | null;
};

export const probeInfoEndpoint = async (
  stage: AnchorStage,
  base: string | null,
  fetch: Fetcher,
  requiredKey: string,
  isValid: (value: unknown) => boolean,
): Promise<InfoEndpointOutcome> => {
  if (!base) {
    return {
      record: skippedStage(stage, SKIP_REASONS.notApplicable),
      endpoint: null,
      probe: null,
    };
  }
  const probe = await getJson(fetch, joinUrl(base, 'info'));
  const valid = probe.ok && isRecord(probe.json) && isValid(probe.json[requiredKey]);
  const error = valid ? null : probe.ok ? `missing_${requiredKey}` : probe.error;
  const endpoint = { ...toEndpointProbe(probe), ok: valid, error };
  return {
    record: stageRecord(stage, valid, endpoint.status, endpoint.ms, error),
    endpoint,
    probe,
  };
};
