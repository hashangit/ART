# Storage System Guide (v0.2.4)

## Overview

The Storage System (SS) is the persistence layer of the Agent Runtime (ART) Framework. Its core purpose is to provide a **unified and adaptable** way to store and retrieve all the data associated with agent operations, such as:

*   Conversation history (`ConversationMessage` objects)
*   Agent observations (`Observation` objects)
*   Thread configuration (`ThreadConfig` objects)
*   Persistent agent state (`AgentState` objects)
*   Vector embeddings (for RAG capabilities, future enhancement)

The Storage System achieves adaptability through the **Storage Adapter pattern**. This allows developers to choose the underlying storage mechanism (e.g., browser's IndexedDB, simple in-memory storage, potentially remote databases in the future) without changing how the rest of the framework interacts with data.

## Core Components

1.  **`StorageAdapter` Interface**:
    *   **Purpose:** Defines the standard contract that all storage implementations must adhere to.
    *   **Key Role:** Specifies methods for basic CRUD (Create, Read, Update, Delete) operations and querying within logical collections (like tables or object stores). This abstraction ensures that components using storage don't need to know the specifics of the underlying database.
    *   **Methods:** Includes `init`, `get`, `set`, `delete`, `query`, and potentially specialized methods like `addVectors` / `searchVectors` for future vector storage needs.

2.  **Storage Adapter Implementations**:
    *   **Purpose:** Concrete classes that implement the `StorageAdapter` interface for specific storage backends.
    *   **v0.2.4 Implementations:**
        *   `InMemoryStorageAdapter`: Stores all data in JavaScript memory. Data is lost when the application session ends. Primarily used for testing, demos, or ephemeral agents.
        *   `IndexedDBStorageAdapter`: Stores data in the browser's IndexedDB. Data persists across page reloads and browser sessions. Recommended for most browser-based applications requiring persistence.
    *   **Selection:** The desired adapter instance is provided during `createArtInstance` initialization.

3.  **Repositories** (e.g., `ObservationRepository`, `ConversationRepository`, `StateRepository`):
    *   **Purpose:** Provide a higher-level, domain-specific API for accessing particular types of data.
    *   **Key Role:** Encapsulate the logic for querying and manipulating specific data structures (like Observations or Messages). They use an injected `StorageAdapter` instance to perform the actual storage operations. This separates the data access logic (Repository) from the low-level storage mechanism (Adapter).
    *   **Interaction:** Managers (like `ObservationManager`, `ConversationManager`, `StateManager`) interact with their corresponding Repositories, not directly with the `StorageAdapter`.

## The `StorageAdapter` Interface

The core interface defines the fundamental operations:

```typescript
interface StorageAdapter {
  /** Optional initialization method for the adapter. */
  init?(config?: any): Promise<void>;

  /** Retrieves a single item by ID from a collection. */
  get<T>(collection: string, id: string): Promise<T | null>;

  /** Sets (creates or updates) an item in a collection. */
  set<T>(collection: string, id: string, data: T): Promise<void>;

  /** Deletes an item by ID from a collection. */
  delete(collection: string, id: string): Promise<void>;

  /** Queries items in a collection based on filter criteria. */
  query<T>(collection: string, filter: FilterOptions): Promise<T[]>;

  // --- Optional methods for future vector support ---
  // addVectors?(collection: string, vectors: VectorData[]): Promise<void>;
  // searchVectors?<T>(collection: string, queryVector: number[], options: VectorSearchOptions): Promise<SearchResult<T>[]>;

  // --- Optional utility methods ---
  // clearCollection?(collection: string): Promise<void>;
  // clearAll?(): Promise<void>;
}

/** Options for querying data. Structure may vary slightly by adapter. */
interface FilterOptions {
  filter: Record<string, any>; // e.g., { threadId: 'abc', type: 'THOUGHTS' }
  sort?: Record<string, 'asc' | 'desc'>; // e.g., { timestamp: 'desc' }
  limit?: number;
  // Potentially other options like skip/offset
}
```

Implementations like `IndexedDBStorageAdapter` translate these generic operations into specific IndexedDB API calls (using object stores, indexes, cursors, etc.).

## Provided Adapters (v0.2.4)

### 1. `InMemoryStorageAdapter`

*   **Mechanism:** Stores data in JavaScript Maps held in memory.
*   **Persistence:** None. Data is lost when the script execution ends or the page is refreshed.
*   **Use Cases:**
    *   Unit and integration testing (fast, no external dependencies).
    *   Simple demos or examples where persistence isn't needed.
    *   Ephemeral agents that don't require long-term memory.
*   **Configuration:** No specific configuration required.

```typescript
import { InMemoryStorageAdapter } from 'art-framework';
const memoryAdapter = new InMemoryStorageAdapter(); 
```

### 2. `IndexedDBStorageAdapter`

*   **Mechanism:** Uses the browser's built-in IndexedDB API.
*   **Persistence:** Persistent across browser sessions. Data remains until explicitly cleared by the user or application.
*   **Use Cases:**
    *   Most standard browser-based applications requiring persistent conversation history, state, and observations.
    *   Offline-capable applications.
*   **Configuration:**
    *   `dbName`: Name of the IndexedDB database (e.g., `'art-agent-storage'`).
    *   `version`: Database version number, used for schema migrations (increment when changing object stores or indexes).
    *   `objectStores`: Configuration for the necessary object stores (e.g., 'observations', 'messages', 'threadConfig', 'agentState') and their indexes (e.g., indexing observations by `threadId` and `timestamp`). The adapter usually defines sensible defaults.

```typescript
import { IndexedDBStorageAdapter } from 'art-framework';

const indexedDBAdapter = new IndexedDBStorageAdapter({
  dbName: 'my-art-app-data',
  version: 1, 
  // Optional: Define custom object stores if needed, otherwise defaults are used
  // objectStores: [ 
  //   { name: 'messages', keyPath: 'messageId', indexes: [{ name: 'threadId', keyPath: 'threadId' }] },
  //   // ... other stores
  // ]
});

// Initialization is often handled internally or via an explicit call
// await indexedDBAdapter.init(); // May be needed depending on implementation details
```

**Note on IndexedDB:** It's an asynchronous API. The `IndexedDBStorageAdapter` handles the complexities of transactions, cursors, and promises. Be aware of browser storage limits (which are typically quite large but can vary).

## Repositories: Domain-Specific Access

Repositories provide a clean abstraction layer over the `StorageAdapter`. They understand the structure of specific data types and offer methods tailored to querying that data.

```typescript
// Example: ObservationRepository (Conceptual)
import { StorageAdapter, Observation, ObservationFilter } from 'art-framework';

class ObservationRepository {
  private collectionName = 'observations';

  constructor(private storageAdapter: StorageAdapter) {}

  async save(observation: Observation): Promise<void> {
    await this.storageAdapter.set(this.collectionName, observation.id, observation);
  }

  async getById(id: string): Promise<Observation | null> {
    return this.storageAdapter.get<Observation>(this.collectionName, id);
  }

  async getObservations(threadId: string, filter?: ObservationFilter): Promise<Observation[]> {
    const queryFilter: Record<string, any> = { threadId };
    if (filter?.types && filter.types.length > 0) {
      // IndexedDB adapters might need specific query syntax for 'IN' operations
      queryFilter.type = { $in: filter.types }; 
    }
    
    return this.storageAdapter.query<Observation>(this.collectionName, {
      filter: queryFilter,
      sort: { timestamp: 'asc' } // Default sort order
      // Add limit/other options if needed
    });
  }
}
```

The `ObservationManager` would use an instance of `ObservationRepository` (which itself holds an instance of the configured `StorageAdapter`) to perform its operations. This keeps the `ObservationManager` focused on the logic of *what* to observe, while the Repository handles *how* to store/retrieve it, and the Adapter handles the *where*.

## Choosing an Adapter

The choice of adapter depends on your application's needs:

*   Use `InMemoryStorageAdapter` for testing and simple, non-persistent scenarios.
*   Use `IndexedDBStorageAdapter` for most browser applications requiring data persistence across sessions.

This choice is made once during the initialization of the `ArtClient` via `createArtInstance`.

## Related Guides

*   [Context System Guide](./ContextSystem.md) (Uses `ConversationRepository`, `StateRepository`)
*   [Observation System Guide](./ObservationSystem.md) (Uses `ObservationRepository`)
*   [Basic Usage Tutorial](../BasicUsage.md) (Shows adapter configuration)