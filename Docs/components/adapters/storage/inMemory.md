# `InMemoryStorageAdapter`

The `InMemoryStorageAdapter` is a simple, fast, and dependency-free implementation of the `StorageAdapter` interface. It stores all data in JavaScript `Map` objects held in the current process's memory.

*   **Source:** `src/adapters/storage/inMemory.ts`
*   **Implements:** `StorageAdapter`

## Use Cases

*   **Testing:** Ideal for unit and integration tests due to its speed and lack of external dependencies. It allows for quick setup and teardown of storage state.
*   **Demos and Examples:** Useful for simple demonstrations where data persistence is not a requirement.
*   **Ephemeral Agents:** Suitable for agents that do not need to remember information across sessions or application restarts.
*   **Development:** Can be a quick way to get started during development before setting up a persistent storage solution.

## Key Characteristics

*   **Non-Persistent:** All data is lost when the application process ends (e.g., browser tab closed, Node.js server stopped).
*   **Fast:** Operations are generally very fast as they involve direct memory access.
*   **Deep Copies:** When setting or getting data, the adapter uses `JSON.parse(JSON.stringify(item))` to create deep copies. This prevents accidental modification of the stored data by external references and ensures that retrieved data is a fresh copy.
*   **Client-Side Querying:** The `query()` method retrieves all items from a collection and then performs filtering and limiting client-side (within the adapter's code). This can be inefficient for very large datasets but is acceptable for its typical use cases.
*   **No `init()` Configuration:** The `init()` method is a no-op as no external connections or setup are required.

## Interface Implementation

The `InMemoryStorageAdapter` implements all methods of the `StorageAdapter` interface:

*   **`async init(_config?: any): Promise<void>`:**
    *   Does nothing. Resolves immediately.
*   **`async get<T>(collection: string, id: string): Promise<T | null>`:**
    *   Retrieves an item (as a deep copy) from the specified `collection` Map using the `id` as the key.
    *   Returns `null` if the collection or item doesn't exist.
*   **`async set<T>(collection: string, id: string, data: T): Promise<void>`:**
    *   Stores a deep copy of the `data` in the `collection` Map, keyed by `id`.
    *   If the `collection` doesn't exist, it's created.
*   **`async delete(collection: string, id: string): Promise<void>`:**
    *   Deletes an item from the `collection` Map.
    *   If the collection or item doesn't exist, it completes silently.
*   **`async query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]>`:**
    *   Retrieves all items from the `collection`.
    *   Applies basic exact-match filtering based on `filterOptions.filter`.
    *   Applies limiting based on `filterOptions.limit`.
    *   **Does not support sorting (`filterOptions.sort`) or skipping (`filterOptions.skip`) in the current implementation (`v0.2.7`).**
    *   Returns an array of deep copies of the matching items.
*   **`async clearCollection(collection: string): Promise<void>`:**
    *   Removes the specified `collection` Map from storage.
*   **`async clearAll(): Promise<void>`:**
    *   Clears all collections, effectively resetting the adapter's state.

## Usage Example

When configuring your ART instance:

```typescript
// In ArtInstanceConfig
// import { InMemoryStorageAdapter } from 'art-framework'; // Not needed if using object config

const artConfig = {
  storage: {
    type: 'memory' // This tells AgentFactory to use InMemoryStorageAdapter
  },
  // ... other configurations (providers, tools, etc.)
};

// Or, if you want to instantiate it yourself (less common for basic use):
// import { InMemoryStorageAdapter } from 'art-framework';
// const myInMemoryAdapter = new InMemoryStorageAdapter();
// await myInMemoryAdapter.init(); // Though init is a no-op for this adapter

// const artConfigWithInstance = {
//   storage: myInMemoryAdapter,
//   // ...
// };
```

The `InMemoryStorageAdapter` provides a straightforward and convenient way to handle data for many development and testing scenarios within the ART Framework.