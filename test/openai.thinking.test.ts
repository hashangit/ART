import { describe, it, expect } from 'vitest';
import { OpenAIAdapter } from '../src/integrations/reasoning/openai';
import type { ArtStandardPrompt, CallOptions, RuntimeProviderConfig, StreamEvent } from '../src/types';

// Integration test for OpenAIAdapter with Responses API and reasoning capabilities.
// Requires environment variable OPENAI_API_KEY to be set.

/**
 * Set your OpenAI API key here for local runs.
 * If left empty, the test will fall back to process.env.OPENAI_API_KEY.
 */
const OPENAI_API_KEY_LOCAL = 'Your-OpenAI-API-Key-Here';
const OPENAI_API_KEY = (OPENAI_API_KEY_LOCAL || process.env.OPENAI_API_KEY?.trim() || '');
// Use a reasoning model that supports the Responses API
const OPENAI_MODEL = 'gpt-5-mini'; // Use gpt-5-mini for testing reasoning capabilities
const MAX_TOKENS = 2048;

// Skip test if no API key is available
const maybeDescribe = OPENAI_API_KEY.length > 0 && OPENAI_API_KEY !== 'Your-OpenAI-API-Key-Here' ? describe : describe.skip;

maybeDescribe('OpenAIAdapter thinking tokens (integration)', () => {
  it(
    'streams tokens and reports whether thought tokens are observed',
    async () => {
      const adapter = new OpenAIAdapter({ apiKey: OPENAI_API_KEY!, model: OPENAI_MODEL });

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'write a short story about a cat' }];

      const providerConfig: RuntimeProviderConfig = {
        providerName: 'openai',
        modelId: OPENAI_MODEL,
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
        openai: {
          reasoning: { effort: 'medium', summary: 'auto' },
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
      console.log('[OpenAIAdapter Test] token summary:', { tokens, thinkingTokens, responseTokens });
      const metadataEvt = events.find((e) => e.type === 'METADATA');
      // eslint-disable-next-line no-console
      console.log('[OpenAIAdapter Test] metadata:', metadataEvt?.data);

      expect(hadError).toBeNull();
      expect(tokens).toBeGreaterThan(0);
      // Do not assert on thinkingTokens strictly, since provider/model may not return distinct thought streams in all cases
      // eslint-disable-next-line no-console
      console.log('[OpenAIAdapter Test] observed thinking tokens?', thinkingTokens > 0);
    },
    60000,
  );

  it(
    'streams planning (AGENT_THOUGHT) tokens and logs thought tokens',
    async () => {
      const adapter = new OpenAIAdapter({ apiKey: OPENAI_API_KEY!, model: OPENAI_MODEL });

      const prompt: ArtStandardPrompt = [
        {
          role: 'user',
          content:
            'You are planning a research approach to compare two algorithms for sorting large datasets. Think step by step about experiment design, metrics, datasets, and pitfalls. Do not produce a final user answer; focus on internal planning thoughts.',
        },
      ];

      const providerConfig: RuntimeProviderConfig = {
        providerName: 'openai',
        modelId: OPENAI_MODEL,
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
        openai: {
          reasoning: { effort: 'high', summary: 'auto' },
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
      console.log('[OpenAIAdapter Planning Test] token summary:', { tokens, thinkingTokens, responseTokens });
      expect(hadError).toBeNull();
      expect(tokens).toBeGreaterThan(0);
      // eslint-disable-next-line no-console
      console.log('[OpenAIAdapter Planning Test] observed thinking tokens?', thinkingTokens > 0);
    },
    60000,
  );

  it(
    'handles non-streaming responses correctly',
    async () => {
      const adapter = new OpenAIAdapter({ apiKey: OPENAI_API_KEY!, model: OPENAI_MODEL });

      const prompt: ArtStandardPrompt = [{ role: 'user', content: 'What is 2+2?' }];

      const providerConfig: RuntimeProviderConfig = {
        providerName: 'openai',
        modelId: OPENAI_MODEL,
        adapterOptions: { apiKey: 'hidden' },
      };

      const options: CallOptions = {
        threadId: `test-thread-${Date.now()}`,
        traceId: `test-trace-${Date.now()}`,
        sessionId: 'test-session',
        stream: false, // Non-streaming
        callContext: 'FINAL_SYNTHESIS',
        providerConfig,
        max_tokens: 100,
        openai: {
          reasoning: { effort: 'low' },
        },
      } as any;

      const stream = await adapter.call(prompt, options);

      const events: StreamEvent[] = [];
      let hadError: Error | null = null;

      try {
        for await (const evt of stream) {
          events.push(evt);
          if (evt.type === 'ERROR') {
            hadError = evt.data instanceof Error ? evt.data : new Error(String(evt.data));
          }
        }
      } catch (err: any) {
        hadError = err instanceof Error ? err : new Error(String(err));
      }

      // eslint-disable-next-line no-console
      console.log('[OpenAIAdapter Non-streaming Test] events:', events.map(e => ({ type: e.type, tokenType: e.tokenType })));
      
      expect(hadError).toBeNull();
      expect(events.some(e => e.type === 'TOKEN')).toBe(true);
      expect(events.some(e => e.type === 'METADATA')).toBe(true);
      expect(events.some(e => e.type === 'END')).toBe(true);
    },
    60000,
  );
});