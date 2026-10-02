import { type InfoEndpointOutcome, probeInfoEndpoint } from './info-endpoint';
import type { Fetcher } from './ports';
import { isRecord } from './request';
import type { AnchorToml } from './schemas';

export const probeSep31 = (toml: AnchorToml, fetch: Fetcher): Promise<InfoEndpointOutcome> =>
  probeInfoEndpoint('sep31', toml.directPaymentServer, fetch, 'receive', isRecord);
