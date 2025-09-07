import { describe, it, expect } from 'vitest';
import { GeminiAdapter } from '../src/integrations/reasoning/gemini';
import type { ArtStandardPrompt, CallOptions, RuntimeProviderConfig, StreamEvent } from '../src/types';

// Simple streaming test for Gemini thinking tokens capture.
// Requires environment variable GEMINI_API_KEY to be set.

const GEMINI_API_KEY = 'add-the-api-key-here';
// Use a model that supports thinking
const GEMINI_MODEL = 'gemini-2.5-flash';

// Skip test if no API key is available
const maybeDescribe = GEMINI_API_KEY ? describe : describe.skip;

maybeDescribe('GeminiAdapter thinking tokens (integration)', () => {
  it('streams tokens and reports whether thought tokens are observed', async () => {
    const adapter = new GeminiAdapter({ apiKey: GEMINI_API_KEY!, model: GEMINI_MODEL });

    const prompt: ArtStandardPrompt = [
      { role: 'user', content: 'write a short story about a cat' }
    ];

    const providerConfig: RuntimeProviderConfig = {
      providerName: 'gemini',
      modelId: GEMINI_MODEL,
      adapterOptions: { apiKey: 'hidden' },
    };

    const options: CallOptions = {
      threadId: `test-thread-${Date.now()}`,
      traceId: `test-trace-${Date.now()}`,
      sessionId: 'test-session',
      stream: true,
      callContext: 'FINAL_SYNTHESIS',
      providerConfig,
      // Enable thinking capture in adapter
      gemini: {
        thinking: { includeThoughts: true, thinkingBudget: 256 }
      }
    } as any;

    const stream = await adapter.call(prompt, options);

    const events: StreamEvent[] = [];
    let tokens = 0;
    let thinkingTokens = 0;
    let responseTokens = 0;
    let hadError: Error | null = null;

    try {
      for await (const evt of stream) {
        events.push(evt);
        if (evt.type === 'TOKEN') {
          tokens += 1;
          // Print each streamed token with tokenType for inspection
          // eslint-disable-next-line no-console
          console.log(`[TOKEN ${tokens}] type=${evt.tokenType ?? 'UNKNOWN'} len=${(evt.data ?? '').length}`);
          // eslint-disable-next-line no-console
          console.log(evt.data);
          if (evt.tokenType && String(evt.tokenType).includes('THINKING')) thinkingTokens += 1;
          if (evt.tokenType && String(evt.tokenType).includes('RESPONSE')) responseTokens += 1;
        } else if (evt.type === 'ERROR') {
          hadError = evt.data instanceof Error ? evt.data : new Error(String(evt.data));
        }
      }
    } catch (err: any) {
      hadError = err instanceof Error ? err : new Error(String(err));
    }

    // Console diagnostics to inspect actual provider behavior
    // eslint-disable-next-line no-console
    console.log('[GeminiAdapter Test] token summary:', { tokens, thinkingTokens, responseTokens });
    const metadataEvt = events.find(e => e.type === 'METADATA');
    // eslint-disable-next-line no-console
    console.log('[GeminiAdapter Test] metadata:', metadataEvt?.data);

    expect(hadError).toBeNull();
    expect(tokens).toBeGreaterThan(0);
    // Do not assert on thinkingTokens strictly, since provider/model may not return thoughts in all cases
    // eslint-disable-next-line no-console
    console.log('[GeminiAdapter Test] observed thinking tokens?', thinkingTokens > 0);
  }, 60000);

  it('streams planning (AGENT_THOUGHT) tokens and logs thought tokens', async () => {
    const adapter = new GeminiAdapter({ apiKey: GEMINI_API_KEY!, model: GEMINI_MODEL });

    const prompt: ArtStandardPrompt = [
      { role: 'user', content: 'You are planning a research approach to compare two algorithms for sorting large datasets. Think step by step about experiment design, metrics, datasets, and pitfalls. Do not produce a final user answer; focus on internal planning thoughts.' }
    ];

    const providerConfig: RuntimeProviderConfig = {
      providerName: 'gemini',
      modelId: GEMINI_MODEL,
      adapterOptions: { apiKey: 'hidden' },
    };

    const options: CallOptions = {
      threadId: `test-thread-${Date.now()}`,
      traceId: `test-trace-${Date.now()}`,
      sessionId: 'test-session',
      stream: true,
      callContext: 'AGENT_THOUGHT',
      providerConfig,
      gemini: {
        thinking: { includeThoughts: true, thinkingBudget: 8096 }
      }
    } as any;

    const stream = await adapter.call(prompt, options);

    let tokens = 0;
    let thinkingTokens = 0;
    let responseTokens = 0;
    let hadError: Error | null = null;

    try {
      for await (const evt of stream) {
        if (evt.type === 'TOKEN') {
          tokens += 1;
          // eslint-disable-next-line no-console
          console.log(`[PLANNING TOKEN ${tokens}] type=${evt.tokenType ?? 'UNKNOWN'} len=${(evt.data ?? '').length}`);
          // eslint-disable-next-line no-console
          console.log(evt.data);
          if (evt.tokenType && String(evt.tokenType).includes('THINKING')) thinkingTokens += 1;
          if (evt.tokenType && String(evt.tokenType).includes('RESPONSE')) responseTokens += 1;
        } else if (evt.type === 'ERROR') {
          hadError = evt.data instanceof Error ? evt.data : new Error(String(evt.data));
        }
      }
    } catch (err: any) {
      hadError = err instanceof Error ? err : new Error(String(err));
    }

    // eslint-disable-next-line no-console
    console.log('[GeminiAdapter Planning Test] token summary:', { tokens, thinkingTokens, responseTokens });
    expect(hadError).toBeNull();
    expect(tokens).toBeGreaterThan(0);
  }, 60000);
});
