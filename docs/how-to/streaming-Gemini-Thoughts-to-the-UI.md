### Using streamed thinking tokens in your UI (and persisting them)

This guide shows how to:
- Enable Gemini thinking
- Stream planning and synthesis thought tokens via `LLMStreamSocket`
- Persist thoughts to storage and/or your own DB
- Retrieve persisted thoughts

### 1) Enable Gemini “thinking” on your call
Ensure you’re using a Gemini 2.5 model and pass the thinking flags. Provide these in `llmParams` so both planning and synthesis calls see them.

```ts
const response = await art.process({
  query: 'Draft a plan, then write a short story',
  threadId,
  options: {
    // forwarded to both planning (AGENT_THOUGHT) and synthesis
    llmParams: {
      stream: true,
      gemini: {
        thinking: { includeThoughts: true, thinkingBudget: 8096 }
      }
    }
  }
});
```

- Planning stream tokens will be typed as `AGENT_THOUGHT_LLM_THINKING` / `AGENT_THOUGHT_LLM_RESPONSE`.
- Synthesis stream tokens will be typed as `FINAL_SYNTHESIS_LLM_THINKING` / `FINAL_SYNTHESIS_LLM_RESPONSE`.

### 2) Stream thinking tokens to your UI with `LLMStreamSocket`
Subscribe before you call `art.process()` to capture the full stream. Filter by `threadId` and check `tokenType`.

```ts
const llm = art.uiSystem.getLLMStreamSocket();

// Example: show planning and synthesis thoughts in separate UI panes
const unsubscribe = llm.subscribe(
  (evt) => {
    if (evt.type !== 'TOKEN') return;
    const text = String(evt.data ?? '');

    if (evt.tokenType === 'AGENT_THOUGHT_LLM_THINKING') {
      // planning thoughts (internal reasoning during planning)
      renderPlanningThought(text);
    } else if (evt.tokenType === 'FINAL_SYNTHESIS_LLM_THINKING') {
      // synthesis thoughts (internal reasoning while forming the final answer)
      renderSynthesisThought(text);
    }
  },
  /* optional filter */ undefined,
  /* restrict to this thread */ { threadId }
);

// Now kick off your agent call (see step 1)
// await art.process({ ... });

// Later: unsubscribe()
// unsubscribe();
```

Tip: If you need to isolate events to a specific UI tab/window, include `sessionId` in your `art.process(...)` call and filter on it when you subscribe.

### 3) Persist thoughts (built-in)
You don’t need to write any code to persist thoughts if you’re using the default `PESAgent`. It automatically records `ObservationType.THOUGHTS` for any thinking tokens detected during planning and synthesis. These are saved through your configured storage adapter (e.g., `IndexedDBStorageAdapter`, `SupabaseStorageAdapter`).

- Planning thinking tokens are stored with `metadata.phase = 'planning'`.
- Synthesis thinking tokens are stored with `metadata.phase = 'synthesis'`.

Ensure you configured storage when creating your instance:
```ts
const art = await createArtInstance({
  storage: { type: 'indexedDB', dbName: 'MyArtDB' },
  providers: {
    availableProviders: [{ name: 'gemini', adapter: GeminiAdapter }]
  },
  // ...
});
```

### 4) Persist thoughts to your own app DB (optional)
If you want a custom copy in your own backend, subscribe to the LLM stream and insert into your DB:

```ts
const llm2 = art.uiSystem.getLLMStreamSocket();
const off = llm2.subscribe((evt) => {
  if (evt.type !== 'TOKEN') return;
  if (!evt.tokenType?.includes('THINKING')) return;

  saveToMyDb({
    threadId: evt.threadId,
    tokenType: evt.tokenType,
    text: String(evt.data ?? ''),
    timestamp: Date.now()
  });
}, undefined, { threadId });
```

### 5) Retrieve persisted thoughts (history)
You can fetch previously saved thought observations using the `ObservationSocket.getHistory(...)` helper (works when an observation repository is configured by the framework):

```ts
import { ObservationType } from 'art-framework';

const obs = art.uiSystem.getObservationSocket();
const history = await obs.getHistory(ObservationType.THOUGHTS, { threadId });

// Each item includes content.text and metadata.phase ('planning' | 'synthesis')
history.forEach((o) => {
  if (o.metadata?.phase === 'planning') renderPlanningThought(o.content?.text);
  if (o.metadata?.phase === 'synthesis') renderSynthesisThought(o.content?.text);
});
```

### Notes
- Thinking availability depends on the model. Use Gemini 2.5 family (e.g., `gemini-2.5-flash`) and enable `includeThoughts`.
- Stream chunk count is not the same as token count; the final stream `METADATA` event includes provider usage. For Gemini you may see fields like `providerRawUsage.thoughtsTokenCount`; the framework maps what it can to `LLMMetadata.thinkingTokens` when available.
- Real-time UI: use `LLMStreamSocket`.
- Persistence/replay: use `ObservationSocket` (THOUGHTS), which the default `PESAgent` records for you automatically.