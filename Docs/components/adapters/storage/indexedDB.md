# `IndexedDBStorageAdapter`

The `IndexedDBStorageAdapter` implements the `StorageAdapter` interface using the browser's built-in [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API). This adapter allows ART framework data (conversation history, agent state, observations) to be persisted client-side, meaning it will remain available across browser sessions.

*   **Source:** `src/adapters/storage/indexedDB.ts`
*   **Implements:** `StorageAdapter`

## Use Cases

*   **Web Applications:** Ideal for web-based AI agents where conversation history, user preferences, or agent state needs to be remembered between visits.
*   **Offline Capabilities (Limited):** While not a full offline solution by itself, persisting data locally with IndexedDB is a step towards enabling some level of functionality when the user is offline.
*   **Persistent Client-Side Demos:** For showcasing agent capabilities where data needs to survive page reloads.

## Configuration (`IndexedDBConfig`)

When specifying `'indexedDB'` as the storage type in `ArtInstanceConfig`, you can provide the following options:

```typescript
export interface IndexedDBConfig {
  dbName?: string;    // Defaults to 'ART_Framework_DB'
  dbVersion?: number; // Defaults to 1. Increment to trigger upgrades.
  objectStores: string[]; // Names of object stores (collections) required.
}
```

*   **`dbName?: string`:** The name of the IndexedDB database.
    *   Defaults to `'ART_Framework_DB'`.
*   **`dbVersion?: number`:** The version of your database schema.
    *   Defaults to `1`.
    *   **Important:** You **must increment** this version number whenever you change the `objectStores` (e.g., add a new store, add an index to an existing store) to trigger the `onupgradeneeded` event, which is where schema modifications occur.
*   **`objectStores: string[]` (Required by constructor, though `AgentFactory` might provide defaults):** An array of strings specifying the names of the object stores (collections) your application requires.
    *   The `AgentFactory` typically ensures that core stores like `'conversations'`, `'observations'`, `'state'`, and `'a2a_tasks'` are included if you use the simple `{ type: 'indexedDB', dbName: 'MyDB' }` config. If you provide an `objectStores` array yourself, ensure these core stores are present if your application uses the default repositories (including A2A task delegation).
    *   Each object store created by the current adapter implementation uses `'id'` as its `keyPath`. This means that objects stored in these collections **must** have an `id` property that serves as their unique key.

**Example Configuration (`ArtInstanceConfig.storage`):**

```typescript
const artConfig = {
  storage: {
    type: 'indexedDB',
    dbName: 'MyAgentDatabase_V2', // Custom database name
    dbVersion: 2,                 // Increment if schemas changed from v1
    // objectStores: ['conversations', 'observations', 'state', 'myCustomStore'] // Explicitly list if needed
  },
  // ... other configurations
};
```

## Key Characteristics & Implementation Details

*   **`init()` Method:**
    *   This method **must be called and awaited** successfully before any other database operations (`get`, `set`, `delete`, `query`) can be performed. `AgentFactory` handles this during ART instance initialization.
    *   It opens the IndexedDB database connection.
    *   It handles the `onupgradeneeded` event: If the `dbVersion` provided in the config is higher than the existing database version, this event fires. The adapter uses this opportunity to create any object stores listed in `config.objectStores` that do not already exist. If you add `'a2a_tasks'` to your stores, remember to bump `dbVersion`.
    *   Current implementation creates object stores with `{ keyPath: 'id' }`.
*   **Asynchronous Operations:** All database operations are asynchronous and return Promises.
*   **Transactions:** Each operation (`get`, `set`, `delete`, `query` using `getAll`) is performed within an IndexedDB transaction.
*   **Error Handling:** Errors from IndexedDB operations (e.g., transaction errors, request errors) are caught and typically re-thrown as standard JavaScript `Error` objects.
*   **Deep Copies for `set`:** Uses `structuredClone(data)` before storing data with `put()` to ensure a deep copy is saved, preventing external modifications from affecting the stored version.
*   **Querying (`query()` method):**
    *   The current implementation of `query()` retrieves **all** records from the specified collection using `store.getAll()`.
    *   Filtering (based on `filterOptions.filter`), sorting (based on `filterOptions.sort`), skipping (`filterOptions.skip`), and limiting (`filterOptions.limit`) are then performed **client-side** on this retrieved array.
    *   **Performance Note:** This client-side querying approach can be inefficient for very large datasets. For optimal performance with large collections, a more advanced implementation would leverage IndexedDB indexes and cursors to perform filtering and sorting directly within the database. The current adapter provides basic functionality suitable for many common use cases.
*   **Browser Environment Only:** IndexedDB is a browser API and is not available in Node.js environments (unless a shim is used, which is outside the scope of this adapter).

## Interface Implementation

*   **`async init(config: IndexedDBConfig)`:** Opens the database, handles upgrades to create specified object stores.
*   **`async get<T>(collection: string, id: string): Promise<T | null>`:** Retrieves an item by ID from an object store.
*   **`async set<T>(collection: string, id: string, data: T & { id: string })`:** Saves (creates/updates) an item. The `data` object **must** have an `id` property matching the `id` parameter, as this is used as the key for `store.put()`. A warning is logged if the provided `id` parameter and `data.id` mismatch, but `data.id` is used for the operation.
*   **`async delete(collection: string, id: string): Promise<void>`:** Deletes an item by ID.
*   **`async query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]>`:** Fetches all items and applies filters/sort/limit client-side.
*   **`async clearCollection(collection: string): Promise<void>`:** Clears all items from a specific object store.
*   **`async clearAll(): Promise<void>`:** Clears all object stores managed by this adapter instance within the database.

The `IndexedDBStorageAdapter` provides a robust solution for persistent client-side storage in web-based ART applications, enabling agents to maintain context and history across user sessions.