import { commands } from 'vitest/browser';

type Store = Record<string, unknown>;
interface GoldenCommands {
  goldenRead: (name: string) => Promise<{ capture: boolean; store: Store }>;
  goldenWrite: (name: string, store: Store) => Promise<void>;
}
const cmds = commands as unknown as GoldenCommands;

export interface BrowserGolden {
  expected<T>(key: string, frozenValue?: T): T;
  save(): Promise<void>;
}

/**
 * Browser-safe golden capture/replay. Filesystem I/O is bridged to the Node
 * server via the `goldenRead`/`goldenWrite` commands (browser pages cannot use
 * `node:fs`). CAPTURE_GOLDEN=1 records frozen values; replay reads the committed
 * fixture and throws on a missing key.
 */
export async function goldenBrowser(name: string): Promise<BrowserGolden> {
  const { capture, store } = await cmds.goldenRead(name);
  const data: Store = capture ? {} : store;
  return {
    expected<T>(key: string, frozenValue?: T): T {
      if (capture) {
        data[key] = frozenValue;
        return frozenValue as T;
      }
      if (!(key in data)) {
        throw new Error(`golden-browser[${name}]: missing key '${key}' — recapture the fixture`);
      }
      return data[key] as T;
    },
    async save(): Promise<void> {
      if (capture) await cmds.goldenWrite(name, data);
    },
  };
}
