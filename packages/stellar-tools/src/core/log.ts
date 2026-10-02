export type HttpLogLine = {
  ts: string;
  host: string;
  path: string;
  method: string;
  status: number | null;
  ms: number;
  cached: boolean;
  attempt?: number;
  error?: string;
};

export type HttpLogger = (line: HttpLogLine) => void;

export const stderrLogger: HttpLogger = (line) => {
  process.stderr.write(`${JSON.stringify(line)}\n`);
};

export const silentLogger: HttpLogger = () => {};

export const memoryLogger = (): HttpLogger & { lines: HttpLogLine[] } => {
  const lines: HttpLogLine[] = [];
  return Object.assign((line: HttpLogLine) => void lines.push(line), { lines });
};
