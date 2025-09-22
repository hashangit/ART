import { describe, it, expect } from 'vitest';
import { OpenRouterAdapter } from '../src/integrations/reasoning/openrouter';
import type { ArtStandardPrompt, CallOptions, RuntimeProviderConfig, StreamEvent } from '../src/types';

// Integration test for OpenRouterAdapter streaming and thinking capabilities.
// Requires environment variable OPENROUTER_API_KEY to be set.

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || 'Your-OpenRouter-API-Key-Here'; // Placeholder
// Use a model known to support reasoning/thinking streams via OpenRouter
const OPENROUTER_MODEL = 'google/gemini-2.5-flash';

// Skip test if no real API key is available
const maybeDescribe = OPENROUTER_API_KEY && OPENROUTER_API_KEY !== 'sk-or-v1-abc...' ? describe : describe.skip;

maybeDescribe('OpenRouterAdapter thinking tokens (integration)', () => {
  it(
    'streams tokens for synthesis and reports thoughts presence',
    async () => {
      const adapter = new OpenRouterAdapter({
        apiKey: OPENROUTER_API_KEY!,
        model: OPENROUTER_MODEL,
        appName: 'ART Test',
        siteUrl: 'https://example.com',
      });

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'write a short story about a cat' }];

      const providerConfig: RuntimeProviderConfig = {
        providerName: 'openrouter',
        modelId: OPENROUTER_MODEL,
        adapterOptions: { apiKey: 'hidden' },
      };

      const options: CallOptions = {
        threadId: `test-thread-${Date.now()}`,
        traceId: `test-trace-${Date.now()}`,
        sessionId: 'test-session',
        stream: true,
        callContext: 'FINAL_SYNTHESIS',
        providerConfig,
        max_tokens: 256,
        openrouter: {
          reasoning: { effort: 'high' }, // Explicitly request high reasoning effort
        },
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
      console.log('[OpenRouterAdapter Test] token summary:', { tokens, thinkingTokens, responseTokens });
      const metadataEvt = events.find((e) => e.type === 'METADATA');
      // eslint-disable-next-line no-console
      console.log('[OpenRouterAdapter Test] metadata:', metadataEvt?.data);

      expect(hadError).toBeNull();
      expect(tokens).toBeGreaterThan(0);
      // Do not assert on thinkingTokens strictly, as provider behavior varies.
      // eslint-disable-next-line no-console
      console.log('[OpenRouterAdapter Test] observed thinking tokens?', thinkingTokens > 0);
    },
    60000,
  );

  it(
    'streams planning (AGENT_THOUGHT) tokens and logs thought tokens',
    async () => {
      const adapter = new OpenRouterAdapter({ apiKey: OPENROUTER_API_KEY!, model: OPENROUTER_MODEL });

      const prompt: ArtStandardPrompt = [
        {
          role: 'user',
          content:
            'You are planning a research approach to compare two algorithms for sorting large datasets. Think step by step about experiment design, metrics, datasets, and pitfalls. Do not produce a final user answer; focus on internal planning thoughts.',
        },
      ];

      const providerConfig: RuntimeProviderConfig = {
        providerName: 'openrouter',
        modelId: OPENROUTER_MODEL,
        adapterOptions: { apiKey: 'hidden' },
      };

      const options: CallOptions = {
        threadId: `test-thread-${Date.now()}`,
        traceId: `test-trace-${Date.now()}`,
        sessionId: 'test-session',
        stream: true,
        callContext: 'AGENT_THOUGHT',
        providerConfig,
        max_tokens: 256,
        openrouter: {
          reasoning: { effort: 'high' }, // Explicitly request high reasoning effort
        },
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
      console.log('[OpenRouterAdapter Planning Test] token summary:', { tokens, thinkingTokens, responseTokens });
      expect(hadError).toBeNull();
      expect(tokens).toBeGreaterThan(0);
    },
    60000,
  );
});