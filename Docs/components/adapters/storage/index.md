# Storage Adapters

Storage Adapters in the ART Framework provide a flexible and abstracted way to manage data persistence. They implement the `StorageAdapter` interface, defining a common set of methods for Create, Read, Update, Delete (CRUD) operations, and querying. This allows the rest of the framework, particularly Repository classes, to work with different storage backends without needing to know their specific implementation details.

## The `StorageAdapter` Interface

*   **Source:** `src/core/interfaces.ts`

The `StorageAdapter` interface defines the contract that all storage solutions must adhere to:

```typescript
export interface StorageAdapter {
  init?(config?: any): Promise<void>; // Optional initialization

  get<T>(collection: string, id: string): Promise<T | null>;
  set<T>(collection: string, id: string, data: T): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]>;

  clearCollection?(collection: string): Promise<void>; // Optional
  clearAll?(): Promise<void>; // Optional
}
```

**Key Methods:**

*   **`init?(config?: any)` (Optional):**
    *   Allows the adapter to perform any necessary setup, like connecting to a database, creating tables/object stores, or performing migrations.
    *   This method is called by `AgentFactory` during the ART instance initialization process.
*   **`get<T>(collection: string, id: string)`:**
    *   Retrieves a single item of type `T` from the specified `collection` (analogous to a table or document store) using its unique `id`.
    *   Returns `null` if the item is not found.
*   **`set<T>(collection: string, id: string, data: T)`:**
    *   Saves (creates or updates) an item in the `collection`. The `id` is used as the primary key.
    *   Implementations should ideally store deep copies of the `data` to prevent external mutations from affecting the stored version.
*   **`delete(collection: string, id: string)`:**
    *   Removes an item from the `collection` by its `id`.
*   **`query<T>(collection: string, filterOptions: FilterOptions)`:**
    *   Retrieves multiple items from a `collection` based on `FilterOptions`.
    *   `FilterOptions` can include:
        *   `filter`: An object for basic exact-match filtering (e.g., `{ threadId: 'abc' }`).
        *   `sort`: Sorting criteria (e.g., `{ timestamp: 'asc' }`).
        *   `limit`: Maximum number of items to return.
        *   `skip`: Number of items to skip (for pagination).
    *   The efficiency and capability of querying heavily depend on the underlying storage mechanism and the adapter's implementation. Simple adapters like `InMemoryStorageAdapter` might perform all filtering/sorting client-side.
*   **`clearCollection?(collection: string)` (Optional):**
    *   Removes all items from a specific `collection`.
*   **`clearAll?()` (Optional):**
    *   Removes all data managed by the adapter across all collections. Use with caution.

## How Storage Adapters are Used

1.  **Configuration:** When creating an ART instance with `createArtInstance`, you specify the storage configuration in `ArtInstanceConfig.storage`. This can be:
    *   An object like `{ type: 'memory' }` or `{ type: 'indexedDB', dbName: 'MyData' }` to use a built-in adapter.
    *   A pre-instantiated object that implements the `StorageAdapter` interface.
2.  **Initialization:** The `AgentFactory` instantiates the chosen adapter and calls its `init()` method.
3.  **Repository Interaction:** Repository classes (`ConversationRepository`, `ObservationRepository`, `StateRepository`) are initialized with the `StorageAdapter` instance. They use the adapter's methods to perform their specific data management tasks (e.g., `ConversationRepository.addMessages` calls `adapter.set()`).

## Built-in Storage Adapters

ART `v0.2.7` provides these built-in storage adapters:

1.  **[`InMemoryStorageAdapter`](inMemory.md):**
    *   Stores all data in JavaScript Maps within the current process's memory.
    *   **Pros:** Very fast, no external dependencies, excellent for unit/integration testing, demos, or ephemeral agents where data persistence across sessions is not required.
    *   **Cons:** Data is lost when the application or browser tab closes. Querying is entirely client-side.
2.  **[`IndexedDBStorageAdapter`](indexedDB.md):**
    *   Uses the browser's IndexedDB API for persistent client-side storage.
    *   **Pros:** Data persists across browser sessions, suitable for web applications needing to remember conversation history, user preferences, etc.
    *   **Cons:** Only available in browser environments. Querying capabilities are limited by IndexedDB's own features and the adapter's current implementation (which relies on `getAll()` and client-side filtering for complex queries).
3.  **[`SupabaseStorageAdapter`](supabase.md):**
    *   Uses Supabase (Postgres) tables for persistence with optional Row Level Security.
    *   **Pros:** Cloud-ready, scalable, first-class SQL querying via indexes, usable server-side or client-side with RLS.
    *   **Cons:** Requires a Supabase project and network connectivity.

## Creating a Custom Storage Adapter

If you need to integrate with a different storage backend (e.g., a remote database, local file system for Node.js applications, or a specific cloud storage service), you can create a custom storage adapter:

1.  Create a new class that implements the `StorageAdapter` interface.
2.  Implement all the required methods (`get`, `set`, `delete`, `query`) and any optional ones (`init`, `clearCollection`, `clearAll`) to interact with your chosen storage system.
3.  When configuring your ART instance, provide an instance of your custom adapter in `ArtInstanceConfig.storage`.

**Example (Conceptual structure for a custom adapter):**

```typescript
// import { StorageAdapter, FilterOptions } from 'art-framework';
// import { MyDatabaseClient } from './my-db-client'; // Your DB client

// export class MyCustomStorageAdapter implements StorageAdapter {
//   private dbClient: MyDatabaseClient;

//   constructor(config: any) {
//     this.dbClient = new MyDatabaseClient(config.connectionString);
//   }

//   async init(): Promise<void> {
//     await this.dbClient.connect();
//     // await this.dbClient.ensureTablesExist(['conversations', 'observations', 'state']);
//   }

//   async get<T>(collection: string, id: string): Promise<T | null> {
//     // return await this.dbClient.fetchById(collection, id);
//     return null; // Placeholder
//   }

//   async set<T>(collection: string, id: string, data: T): Promise<void> {
//     // await this.dbClient.save(collection, id, data);
//   }

//   async delete(collection: string, id: string): Promise<void> {
//     // await this.dbClient.remove(collection, id);
//   }

//   async query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]> {
//     // const dbQuery = this.translateFilterOptionsToDbQuery(filterOptions);
//     // return await this.dbClient.find(collection, dbQuery);
//     return []; // Placeholder
//   }

//   // ... other methods
// }
```

This adapter system ensures that ART remains flexible and adaptable to various data storage needs.