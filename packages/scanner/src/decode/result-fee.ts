const FEE_CHARGED_BASE64_CHARS = 12;

export const readFeeCharged = (resultXdr: string): string => {
  const head = atob(resultXdr.slice(0, FEE_CHARGED_BASE64_CHARS));
  if (head.length < 8) throw new Error('TransactionResult XDR is too short to hold feeCharged');
  const bytes = Uint8Array.from(head, (char) => char.charCodeAt(0));
  return new DataView(bytes.buffer).getBigInt64(0).toString();
};
