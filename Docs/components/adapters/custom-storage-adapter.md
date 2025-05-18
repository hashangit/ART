# Creating a Custom Storage Adapter

The ART Framework's `StorageAdapter` interface allows you to integrate virtually any storage backend with your AI agent. If the built-in `InMemoryStorageAdapter` or `IndexedDBStorageAdapter` don't meet your needs (e.g., you want to use a remote database like PostgreSQL, MongoDB, Firebase, or store data in the local file system for a Node.js agent), you can create a custom adapter.

## Steps to Create a Custom Storage Adapter

1.  **Understand the `StorageAdapter` Interface:**
    Familiarize yourself with the methods defined in `src/core/interfaces.ts`:

    ```typescript
    export interface StorageAdapter {
      init?(config?: any): Promise<void>;
      get<T>(collection: string, id: string): Promise<T | null>;
      set<T>(collection: string, id: string, data: T): Promise<void>;
      delete(collection: string, id: string): Promise<void>;
      query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]>;
      clearCollection?(collection: string): Promise<void>;
      clearAll?(): Promise<void>;
    }
    ```
    Your custom adapter class must implement these methods.

2.  **Create Your Adapter Class:**
    Create a new TypeScript class that implements `StorageAdapter`.

    ```typescript
    // src/my-adapters/my-custom-storage-adapter.ts
    import { StorageAdapter, FilterOptions } from 'art-framework';
    // Import any client libraries for your target database
    // import { MyDatabaseClient } from 'my-database-library';

    export class MyCustomStorageAdapter implements StorageAdapter {
        // private dbClient: MyDatabaseClient; // Example for a database client

        constructor(config: any) {
            // Initialize your database client or connection parameters here
            // Example: this.dbClient = new MyDatabaseClient(config.connectionString);
            console.log("MyCustomStorageAdapter initialized with config:", config);
        }

        async init(config?: any): Promise<void> {
            // Perform any asynchronous setup, like connecting to the database
            // or ensuring tables/collections exist.
            // Example: await this.dbClient.connect();
            console.log("MyCustomStorageAdapter init() called.", config);
            return Promise.resolve();
        }

        async get<T>(collection: string, id: string): Promise<T | null> {
            console.log(`MyCustomStorageAdapter: Getting item from ${collection} with id ${id}`);
            // Implement logic to fetch data from your storage backend
            // Example: return await this.dbClient.table(collection).find(id);
            return null; // Placeholder
        }

        async set<T>(collection: string, id: string, data: T): Promise<void> {
            console.log(`MyCustomStorageAdapter: Setting item in ${collection} with id ${id}`, data);
            // Implement logic to save data (create or update)
            // Ensure you handle the 'id' correctly as the primary key.
            // ART repositories often store objects with an 'id' property that matches the 'id' parameter.
            // Example: await this.dbClient.table(collection).upsert({ id, ...data });
            return Promise.resolve();
        }

        async delete(collection: string, id: string): Promise<void> {
            console.log(`MyCustomStorageAdapter: Deleting item from ${collection} with id ${id}`);
            // Implement logic to delete data
            // Example: await this.dbClient.table(collection).remove(id);
            return Promise.resolve();
        }

        async query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]> {
            console.log(`MyCustomStorageAdapter: Querying ${collection} with options`, filterOptions);
            // Implement logic to query data based on FilterOptions.
            // This is often the most complex part, as you'll need to translate
            // FilterOptions (filter, sort, limit, skip) into queries supported
            // by your storage backend.
            // Example:
            // const dbQuery = this.buildDbQuery(filterOptions);
            // return await this.dbClient.table(collection).search(dbQuery);
            return []; // Placeholder
        }

        async clearCollection(collection: string): Promise<void> {
            console.log(`MyCustomStorageAdapter: Clearing collection ${collection}`);
            // Implement logic to remove all items from a collection
            // Example: await this.dbClient.table(collection).truncate();
            return Promise.resolve();
        }

        async clearAll(): Promise<void> {
            console.log("MyCustomStorageAdapter: Clearing all data");
            // Implement logic to remove all data managed by this adapter
            // Example: await this.dbClient.dropAllTables();
            return Promise.resolve();
        }

        // Optional: Helper method to translate FilterOptions
        // private buildDbQuery(filterOptions: FilterOptions): any { /* ... */ }
    }
    ```

3.  **Implement Each Method:**
    *   **`constructor(config: any)`:** Accept any necessary configuration for your adapter (e.g., connection strings, API keys for a cloud database).
    *   **`init?(config?: any)`:** Perform asynchronous setup. This is called once by `AgentFactory`.
    *   **`get<T>(collection: string, id: string)`:** Fetch a single record. ART typically uses `collection` names like "conversations", "observations", "state". The `id` is the primary key.
    *   **`set<T>(collection: string, id: string, data: T)`:** Insert or update a record. The `data` object passed by ART repositories (like `ConversationRepository`, `StateRepository`) will usually have an `id` property that matches the `id` parameter. Your adapter should use this `id` as the key.
    *   **`delete(collection: string, id: string)`:** Remove a record.
    *   **`query<T>(collection: string, filterOptions: FilterOptions)`:** This can be challenging.
        *   `filterOptions.filter`: An object like `{ threadId: 'abc', type: 'USER' }`. You'll need to translate this into your backend's query language for exact matches.
        *   `filterOptions.sort`: An object like `{ timestamp: 'asc' }`. Translate to backend sorting.
        *   `filterOptions.limit` and `filterOptions.skip`: For pagination.
        *   If your backend doesn't support all these natively, you might need to fetch a broader set of data and perform some filtering/sorting client-side within the adapter (similar to how `InMemoryStorageAdapter` works), but this can be inefficient.
    *   **`clearCollection?` and `clearAll?` (Optional):** Implement if your backend supports these operations efficiently.

4.  **Handle Data Copying (Important for `set` and `get`):**
    *   When data is passed to `set()`, it's good practice to store a deep copy if your storage mechanism doesn't do this automatically. This prevents external modifications to the original object from affecting the stored version. `JSON.parse(JSON.stringify(data))` is a common way for simple objects.
    *   Similarly, when `get()` or `query()` returns data, return deep copies to prevent consumers from accidentally modifying the adapter's internal cache or the raw data from the store.

5.  **Error Handling:**
    *   Catch errors from your storage backend operations and re-throw them, or wrap them in custom error types if needed. The ART framework will handle these errors further up the chain.

6.  **Use Your Custom Adapter in `ArtInstanceConfig`:**
    When creating your ART instance, provide an instance of your custom adapter:

    ```typescript
    // src/config/art-config.ts
    import { ArtInstanceConfig } from 'art-framework';
    import { MyCustomStorageAdapter } from '../my-adapters/my-custom-storage-adapter'; // Adjust path

    const myCustomAdapterConfig = {
        // Options specific to your adapter's constructor
        // connectionString: process.env.MY_DB_CONNECTION_STRING,
        // apiKey: process.env.MY_CLOUD_DB_API_KEY,
    };

    const artConfig: ArtInstanceConfig = {
        storage: new MyCustomStorageAdapter(myCustomAdapterConfig), // Pass an instance
        providers: {
            // ... your provider manager config ...
        },
        // ... other ART configurations ...
    };

    // Then in your main application file:
    // import { createArtInstance } from 'art-framework';
    // import { artConfig } from './config/art-config';
    //
    // async function start() {
    //   const art = await createArtInstance(artConfig);
    //   // ... use art instance ...
    // }
    // start();
    ```

## Considerations for Custom Adapters:

*   **Asynchronicity:** All methods must return Promises.
*   **Collection Names:** ART's default repositories use specific collection names:
    *   `ConversationRepository` uses `"conversations"`.
    *   `ObservationRepository` uses `"observations"`.
    *   `StateRepository` uses `"state"`.
    Your adapter should be prepared to handle these collection names.
*   **ID Management:** ART components often rely on an `id` field within the stored objects to serve as the primary key. Ensure your `set` method uses the provided `id` parameter as the key for storage, and that data objects passed to it will likely contain a matching `id` property.
*   **Query Capabilities:** The more sophisticated your `query` method's translation of `FilterOptions` to native backend queries, the more efficient your data retrieval will be. Client-side filtering in the adapter should be a fallback for complex cases or simple backends.
*   **Testing:** Thoroughly test your custom adapter, especially the `query` method with various `FilterOptions`.

By implementing the `StorageAdapter` interface, you can seamlessly integrate ART with your preferred data persistence solution.