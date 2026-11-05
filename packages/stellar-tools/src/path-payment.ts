import type { Clients } from './clients';

export type PathPaymentMode = 'strict_send' | 'strict_receive';

export type PathPaymentQuote = { sourceAmount: number; destAmount: number };

export type PathPaymentInput = {
  mode: PathPaymentMode;
  sendAsset: string;
  destAsset: string;
  // The fixed side: source amount for strict send, destination amount for strict receive.
  amount: number;
};

const horizonAsset = (asset: string): string => (asset === 'XLM' ? 'native' : asset);

const assetParams = (prefix: 'source' | 'destination', asset: string): Record<string, string> => {
  if (asset === 'XLM') return { [`${prefix}_asset_type`]: 'native' };
  const separator = asset.indexOf(':');
  const code = asset.slice(0, separator);
  const issuer = asset.slice(separator + 1);
  return {
    [`${prefix}_asset_type`]: code.length > 4 ? 'credit_alphanum12' : 'credit_alphanum4',
    [`${prefix}_asset_code`]: code,
    [`${prefix}_asset_issuer`]: issuer,
  };
};

export const quotePathPayment = async (
  clients: Clients,
  input: PathPaymentInput,
): Promise<PathPaymentQuote | null> => {
  const params =
    input.mode === 'strict_send'
      ? new URLSearchParams({
          ...assetParams('source', input.sendAsset),
          source_amount: String(input.amount),
          destination_assets: horizonAsset(input.destAsset),
        })
      : new URLSearchParams({
          ...assetParams('destination', input.destAsset),
          destination_amount: String(input.amount),
          source_assets: horizonAsset(input.sendAsset),
        });
  const records = await clients.quotePaths(input.mode, params);
  const best = records[0];
  return best
    ? { sourceAmount: Number(best.source_amount), destAmount: Number(best.destination_amount) }
    : null;
};

export const destMinFor = (quote: PathPaymentQuote, slippageBps: number): number =>
  quote.destAmount * (1 - slippageBps / 10_000);

export const sendMaxFor = (quote: PathPaymentQuote, slippageBps: number): number =>
  quote.sourceAmount * (1 + slippageBps / 10_000);

export type PathPaymentRetry = {
  slippageBps: number;
  cappedToPolicy: boolean;
  quote: PathPaymentQuote;
  destMin?: number;
  sendMax?: number;
};

export const planPathPaymentRetry = (input: {
  mode: PathPaymentMode;
  quote: PathPaymentQuote;
  requestedSlippageBps: number;
  maxSlippageBps: number;
}): PathPaymentRetry => {
  const slippageBps = Math.min(input.requestedSlippageBps, input.maxSlippageBps);
  const cappedToPolicy = input.requestedSlippageBps > input.maxSlippageBps;
  return input.mode === 'strict_send'
    ? { slippageBps, cappedToPolicy, quote: input.quote, destMin: destMinFor(input.quote, slippageBps) }
    : { slippageBps, cappedToPolicy, quote: input.quote, sendMax: sendMaxFor(input.quote, slippageBps) };
};

export const buildPathPaymentRetry = async (
  clients: Clients,
  input: PathPaymentInput & { requestedSlippageBps: number; maxSlippageBps: number },
): Promise<PathPaymentRetry> => {
  const quote = await quotePathPayment(clients, input);
  if (!quote) throw new Error(`No path found from ${input.sendAsset} to ${input.destAsset}`);
  return planPathPaymentRetry({ ...input, quote });
};
