# Deep Dive: `ContextProvider`

The `ContextProvider` is a component within ART's Context System. In the current version of the ART Framework (`v0.2.7`), it serves primarily as a **placeholder** for future enhancements, particularly for integrating Retrieval-Augmented Generation (RAG) capabilities.

*   **Source:** `src/systems/context/ContextProvider.ts`

## Current Functionality (ART v0.2.7)

*   **Constructor:**
    *   When instantiated, it logs an informational message: `"ContextProvider initialized (v1.0 Placeholder)"`.
    *   It does not take any dependencies in its constructor in the current version.

*   **`async getDynamicContext(_threadId: string, _query?: string): Promise<Record<string, any>>`:**
    *   This is the main method intended to provide dynamic context.
    *   In `v0.2.7`, this method:
        1.  Logs an informational message: `"ContextProvider.getDynamicContext called (v1.0 Placeholder - returning empty context)"`.
        2.  Returns `Promise.resolve({})` (an empty object).
    *   It does not perform any actual context retrieval or processing. The parameters `_threadId` and `_query` are marked with underscores to indicate they are currently unused.

## Intended Future Role (Retrieval-Augmented Generation - RAG)

The long-term vision for `ContextProvider` is to be the central component for RAG. In such a system, its responsibilities would expand significantly:

1.  **Configuration:** It would be configured with details of one or more external knowledge sources (e.g., connection details for a vector database, API endpoints for document stores, local file paths).
2.  **Query Analysis:** When `getDynamicContext` is called with a `threadId` and `query`:
    *   It might analyze the current `query` and potentially the recent conversation history (obtained via `ConversationManager`) to understand the information needs.
3.  **Knowledge Retrieval:**
    *   Based on the analysis, it would formulate queries to the configured knowledge sources.
    *   For a vector database, this would involve generating embeddings for the query and performing a similarity search.
    *   For other sources, it might involve keyword searches or structured API calls.
4.  **Information Processing & Formatting:**
    *   It would retrieve relevant chunks of information (documents, text snippets, data records).
    *   It might perform further processing like re-ranking, summarization, or extraction of key facts from the retrieved data.
    *   The processed information would be formatted into a string or a structured object suitable for injection into an LLM prompt.
5.  **Context Provision:**
    *   The `getDynamicContext` method would return this formatted, dynamically retrieved context.
6.  **Agent Integration:**
    *   The Agent Core (e.g., `PESAgent`) would call `ContextProvider.getDynamicContext()` at an appropriate stage (likely before or during prompt construction for planning or synthesis).
    *   The context returned by the `ContextProvider` would then be included in the `ArtStandardPrompt` sent to the `ReasoningEngine`. This allows the LLM to generate responses that are "grounded" in or augmented by this external, up-to-date, or domain-specific information.

**Example of Future Usage (Conceptual):**

```typescript
// Inside PESAgent or other agent logic (future version)
// ...
// const dynamicContext = await this.deps.contextProvider.getDynamicContext(props.threadId, props.query);
//
// // Agent assembles the ArtStandardPrompt array directly, optionally embedding dynamicContext
// const planningPrompt: ArtStandardPrompt = [
//   { role: 'system', content: systemPrompt },
//   ...formattedHistory,
//   { role: 'user', content: `User Query: ${props.query}\n\nRetrieved Knowledge: ${dynamicContext.knowledgeSnippets}` }
// ];
//
// // Optional: If using Mustache templates, assemblePrompt can be used, then validate:
// // const planningPrompt = await this.deps.promptManager.assemblePrompt(blueprintWithRag, planningPromptContext);
// // const validated = this.deps.promptManager.validatePrompt(planningPrompt);
```

## Summary for ART v0.2.7

For the current version, developers should be aware that `ContextProvider` does not provide any dynamic context. Core contextual information like conversation history and thread configuration is managed and retrieved directly by the agent via `ConversationManager` and `StateManager` respectively. The `ContextProvider` is included in the codebase as a forward-looking component for planned RAG features.

