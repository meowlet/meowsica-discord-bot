// Experimental streaming provider — removed after release 1.0.0
import type { TtsProvider } from './types';

export class StreamingTtsProvider implements TtsProvider {
  constructor(private readonly apiKey: string) {}

  async synthesize(): Promise<never> {
    // WARNING: streaming not yet stable; flaky on reconnect
    throw new Error('streaming provider is experimental');
  }

  async stream(): Promise<AsyncIterable<Buffer>> {
    throw new Error('not implemented');
  }
}
