# Example: Storage Adapter Usage

This example demonstrates how to configure and use different Storage Adapters (`InMemoryStorageAdapter` and `IndexedDBStorageAdapter`) within the ART Framework. The choice of adapter determines where and how agent data (conversation history, state, observations) is persisted.

## Prerequisites

*   ART Framework installed.
*   An initialized `ArtClient` instance (refer to the [Basic Usage Tutorial](../Guides/BasicUsage.md)).

## Key Concepts

*   **`StorageAdapter` Interface:** Defines the standard methods (`get`, `set`, `delete`, `query`) for interacting with storage.
*   **`InMemoryStorageAdapter`:** Stores data in JavaScript memory. Fast but **temporary** – data is lost when the application closes or refreshes. Ideal for testing or ephemeral agents.
*   **`IndexedDBStorageAdapter`:** Stores data in the browser's IndexedDB. **Persistent** across sessions. Recommended for most web applications needing to retain conversation history or state.
*   **Repositories:** Higher-level components (`ConversationRepository`, `ObservationRepository`, `StateRepository`) use the configured `StorageAdapter` internally to manage specific data types. You typically don't interact directly with the adapter after initialization.

## Example 1: Using `InMemoryStorageAdapter`

This adapter requires no special configuration. Data will only persist for the current session.

```typescript
import {
  createArtInstance,
  PESAgent,
  InMemoryStorageAdapter, // Use the in-memory adapter
  OpenAIAdapter,
  // ... other imports
} from 'art-framework';

async function initializeWithMemoryStorage() {
  console.log("Initializing ART with InMemoryStorageAdapter...");
  
  const art = await createArtInstance({
    agentCore: PESAgent,
    storageAdapter: new InMemoryStorageAdapter(), // Simply instantiate it
    reasoningAdapter: new OpenAIAdapter({ apiKey: "YOUR_OPENAI_KEY" }),
    tools: [], 
    // ... other config
  });

  console.log("ART Instance with In-Memory Storage Initialized.");
  return art;
}

async function runMemoryExample() {
    const art = await initializeWithMemoryStorage();
    if (!art) return;

    const threadId = "memory-thread-1";
    console.log(`\nRunning query on thread [${threadId}] (In-Memory Storage)`);
    
    await art.process({ query: "First message in memory", threadId });
    await art.process({ query: "Second message in memory", threadId });

    // Data exists only while this script/session is active.
    // If you refresh the page or restart the script, the history for 
    // 'memory-thread-1' will be gone when using InMemoryStorageAdapter.

    // You typically access history via ConversationManager, which uses the adapter:
    // const history = await art.conversationManager.getMessages(threadId); 
    // console.log(`In-memory history count for ${threadId}:`, history.length); // Will show 4 (2 USER, 2 AI)

    console.log("\nInMemoryStorageAdapter example complete. Refreshing would clear this data.");
}

// runMemoryExample(); 
```

## Example 2: Using `IndexedDBStorageAdapter`

This adapter persists data in the browser's IndexedDB.

```typescript
import {
  createArtInstance,
  PESAgent,
  IndexedDBStorageAdapter, // Use the IndexedDB adapter
  OpenAIAdapter,
  // ... other imports
} from 'art-framework';

async function initializeWithIndexedDB() {
  console.log("Initializing ART with IndexedDBStorageAdapter...");

  const adapter = new IndexedDBStorageAdapter({
    dbName: 'MyArtAgentData', // Choose a database name
    version: 1, // Increment version if you change schema/stores later
    // Optional: Define object stores and indexes if defaults aren't sufficient
    // objectStores: [ ... ] 
  });

  // IndexedDB might require async initialization in some setups
  // Although createArtInstance often handles this, explicit init can be clearer
  // await adapter.init?.(); // Call init if the adapter exposes it

  const art = await createArtInstance({
    agentCore: PESAgent,
    storageAdapter: adapter, // Pass the configured adapter instance
    reasoningAdapter: new OpenAIAdapter({ apiKey: "YOUR_OPENAI_KEY" }),
    tools: [],
    // ... other config
  });

  console.log("ART Instance with IndexedDB Storage Initialized.");
  return art;
}

async function runIndexedDBExample() {
    const art = await initializeWithIndexedDB();
    if (!art) return;

    const threadId = "persistent-thread-1";
    console.log(`\nRunning query on thread [${threadId}] (IndexedDB Storage)`);

    // Process some messages
    await art.process({ query: "First persistent message", threadId });
    await art.process({ query: "Second persistent message", threadId });

    // Data is saved to IndexedDB by the framework automatically.
    // You can close the browser tab, reopen it, re-initialize ART with the
    // *same dbName*, and the history for 'persistent-thread-1' will still be there.

    // Accessing history (demonstrates persistence)
    // const history = await art.conversationManager.getMessages(threadId);
    // console.log(`Persistent history count for ${threadId}:`, history.length); // Will show 4 initially, and more if run again later

    console.log("\nIndexedDBStorageAdapter example complete. Data is persisted in the browser.");
    console.log("You can inspect IndexedDB in your browser's developer tools (Application tab).");
}

// runIndexedDBExample();
```

## Choosing the Right Adapter

*   **`InMemoryStorageAdapter`**: Best for testing, short-lived demos, or scenarios where data persistence is not required or desired.
*   **`IndexedDBStorageAdapter`**: The standard choice for web applications where conversation history, agent state, or observations need to persist between user sessions.

The framework's internal components (Managers and Repositories) handle the interaction with the configured adapter automatically. Your primary interaction point is selecting and configuring the appropriate adapter during the `createArtInstance` call.