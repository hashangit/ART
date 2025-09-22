import { describe, it, expect } from 'vitest';
import { AnthropicAdapter } from '../src/integrations/reasoning/anthropic';
import type { ArtStandardPrompt, CallOptions, RuntimeProviderConfig, StreamEvent } from '../src/types';

// Simple streaming test for Anthropic adapter mirroring Gemini test structure.
// Requires environment variable ANTHROPIC_API_KEY to be set (replace placeholder below).

/**
 * Set your Anthropic API key here for local runs.
 * If left empty, the test will fall back to process.env.ANTHROPIC_API_KEY.
 */
const ANTHROPIC_API_KEY_LOCAL = 'Your-Anthropic-API-Key-Here';
const ANTHROPIC_API_KEY = (ANTHROPIC_API_KEY_LOCAL || process.env.ANTHROPIC_API_KEY?.trim() || '');
// Use a model that supports current Anthropic Messages API and reasoning/thinking capability
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const THINKING_BUDGET = 1024; // Anthropic minimum
const MAX_TOKENS = 2048;      // Must be > THINKING_BUDGET

// Skip test if no API key is available
const maybeDescribe = ANTHROPIC_API_KEY.length > 0 ? describe : describe.skip;

maybeDescribe('AnthropicAdapter thinking tokens (integration)', () => {
  it(
    'streams tokens and reports whether thought tokens are observed',
    async () => {
      const adapter = new AnthropicAdapter({ apiKey: ANTHROPIC_API_KEY!, model: ANTHROPIC_MODEL });

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'write a short story about a cat' }];

      const providerConfig: RuntimeProviderConfig = {
        providerName: 'anthropic',
        modelId: ANTHROPIC_MODEL,
        adapterOptions: { apiKey: 'hidden' },
      };

      const options: CallOptions = {
        threadId: `test-thread-${Date.now()}`,
        traceId: `test-trace-${Date.now()}`,
        sessionId: 'test-session',
        stream: true,
        callContext: 'FINAL_SYNTHESIS',
        providerConfig,
        // Keep short generations for tests
        max_tokens: MAX_TOKENS,
        thinking: { type: 'enabled', budget_tokens: THINKING_BUDGET },
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
      console.log('[AnthropicAdapter Test] token summary:', { tokens, thinkingTokens, responseTokens });
      const metadataEvt = events.find((e) => e.type === 'METADATA');
      // eslint-disable-next-line no-console
      console.log('[AnthropicAdapter Test] metadata:', metadataEvt?.data);

      expect(hadError).toBeNull();
      expect(tokens).toBeGreaterThan(0);
      // Do not assert on thinkingTokens strictly, since provider/model may not return distinct thought streams in all cases
      // eslint-disable-next-line no-console
      console.log('[AnthropicAdapter Test] observed thinking tokens?', thinkingTokens > 0);
    },
    60000,
  );

  it(
    'streams planning (AGENT_THOUGHT) tokens and logs thought tokens',
    async () => {
      const adapter = new AnthropicAdapter({ apiKey: ANTHROPIC_API_KEY!, model: ANTHROPIC_MODEL });

      const prompt: ArtStandardPrompt = [
        {
          role: 'user',
          content:
            'You are planning a research approach to compare two algorithms for sorting large datasets. Think step by step about experiment design, metrics, datasets, and pitfalls. Do not produce a final user answer; focus on internal planning thoughts.',
        },
      ];

      const providerConfig: RuntimeProviderConfig = {
        providerName: 'anthropic',
        modelId: ANTHROPIC_MODEL,
        adapterOptions: { apiKey: 'hidden' },
      };

      const options: CallOptions = {
        threadId: `test-thread-${Date.now()}`,
        traceId: `test-trace-${Date.now()}`,
        sessionId: 'test-session',
        stream: true,
        callContext: 'AGENT_THOUGHT',
        providerConfig,
        max_tokens: MAX_TOKENS,
        thinking: { type: 'enabled', budget_tokens: THINKING_BUDGET },
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
      console.log('[AnthropicAdapter Planning Test] token summary:', { tokens, thinkingTokens, responseTokens });
      expect(hadError).toBeNull();
      expect(tokens).toBeGreaterThan(0);
      // eslint-disable-next-line no-console
      console.log('[AnthropicAdapter Planning Test] observed thinking tokens?', thinkingTokens > 0);
    },
    60000,
  );
});