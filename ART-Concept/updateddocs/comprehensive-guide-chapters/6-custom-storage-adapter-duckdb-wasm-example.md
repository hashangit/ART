## 6. Scenario 4: Adding a Custom Storage Adapter (DuckDB WASM Example)

Let's explore using DuckDB WASM as a storage backend. DuckDB is an in-process analytical data management system, and its WASM version allows running it directly in the browser. This could enable more powerful local data storage and querying, including potential vector similarity search for RAG-like capabilities, compared to basic `localStorage` or `IndexedDB`.

**Goal:** Implement a skeleton `DuckDBWasmAdapter` demonstrating basic CRUD and conceptual vector storage/search.

**Disclaimer:** Integrating DuckDB WASM is significantly more complex than `localStorage` or `IndexedDB`. It involves asynchronous initialization, managing WASM bundles, understanding SQL, and potentially handling vector embeddings and similarity calculations. This example provides a conceptual structure.

**6.1. Necessary Imports & Explanations**

```typescript
// --- ART Storage Adapter Creation Imports ---
import {
  // The interface that a custom storage adapter must implement
  StorageAdapter,
  // Type defining options for querying data (filtering, sorting, limits)
  FilterOptions
} from 'art-framework';

// --- DuckDB WASM Imports ---
// You would typically install @duckdb/duckdb-wasm
import * as duckdb from '@duckdb/duckdb-wasm';
// Import specific types if needed, e.g., from duckdb-wasm
// import { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';

// --- Vector Embedding Imports (Conceptual) ---
// You would need a library or function to generate embeddings
// e.g., using Transformers.js or calling an embedding API
// import { pipeline } from '@xenova/transformers'; // Example
// const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
// async function getEmbedding(text: string): Promise<number[]> {
//   const output = await extractor(text, { pooling: 'mean', normalize: true });
//   return Array.from(output.data as Float32Array);
// }
```

**Explanation of Storage Adapter Imports:**

*   **`StorageAdapter`**
    The blueprint for creating a custom way for ART to save and load its data (like chat history or agent memory) using DuckDB WASM.
    *   **Developer Notes:** The interface your custom storage class must implement. Requires implementing methods for basic CRUD operations:
        *   `async get<T>(collection: string, id: string): Promise<T | null>`: Retrieve a single item by ID.
        *   `async set<T>(collection: string, id: string, data: T): Promise<void>`: Save (create or update) an item.
        *   `async delete(collection: string, id: string): Promise<void>`: Delete an item by ID.
        *   `async query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]>`: Retrieve multiple items based on filter criteria.
        *   Optional: `async init?(config?: any): Promise<void>` (for async setup), `async clearCollection?(collection: string): Promise<void>`, `async clearAll?(): Promise<void>`. The implementation will translate these generic operations into DuckDB SQL commands executed via the WASM instance.

*   **`FilterOptions`**
    Describes how to filter, sort, or limit the data when asking the storage adapter for multiple items. Mapping this to SQL, especially for vector similarity, is the main challenge.
    *   **Developer Notes:** Interface used as input for the `StorageAdapter.query` method. May include properties like:
        *   `filters?: Array<{ field: string; operator: string; value: any }>`: Criteria to match items (e.g., `{ field: 'role', operator: '==', value: 'USER' }`).
        *   `sortBy?: string`: Field name to sort by.
        *   `sortDirection?: 'asc' | 'desc'`: Sorting order.
        *   `limit?: number`: Maximum number of items to return.
        *   `offset?: number`: Number of items to skip (for pagination).
        *   The `query` implementation in the DuckDB adapter will need to parse these options and construct appropriate `WHERE`, `ORDER BY`, and `LIMIT`/`OFFSET` clauses in SQL. Supporting complex filters or vector similarity searches (e.g., using a custom operator like `<=>` if using an extension, or calculating distance manually) requires specific logic.

*   **`@duckdb/duckdb-wasm`**
    The library providing the DuckDB WASM engine and browser integration.
    *   **Developer Notes:** Used for initializing the database (`duckdb.selectBundle`, `db.instantiate`, `db.open`), establishing connections (`db.connect()`), and executing SQL queries (`connection.query()`, `connection.send()`, `connection.prepare()`, etc.). Requires careful handling of asynchronous initialization and potentially large WASM bundles. Consider using specific backends like OPFS (`db.registerFileURL`) for better persistence.

*   **Vector Embedding Library (Conceptual)**
    A library or function to convert text data (like conversation messages or state content) into numerical vectors (embeddings) for similarity search.
    *   **Developer Notes:** Needed if implementing vector search capabilities. This is separate from DuckDB itself but crucial for the RAG use case. Embeddings would be generated before `set`ting data and used during `query` for similarity calculations. Libraries like `Transformers.js` can run embedding models client-side.

**6.2. Implementing `DuckDBWasmAdapter` (Skeleton)**

```typescript
// src/adapters/DuckDBWasmAdapter.ts
import { StorageAdapter, FilterOptions } from 'art-framework';
import * as duckdb from '@duckdb/duckdb-wasm';

// --- Vector Embedding Placeholder ---
async function getEmbedding(text: string): Promise<number[]> {
  // Placeholder: Replace with actual embedding generation
  console.warn("Using placeholder embedding function!");
  // Simple hash-based placeholder vector (NOT suitable for real use)
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  // Create a dummy vector based on the hash
  const vec = Array(16).fill(0); // Small dimension for example
  for(let i=0; i<vec.length; i++) {
      vec[i] = (hash >> (i*2)) & 3; // Simple mapping
  }
  return vec;
}
// --- End Placeholder ---


// Define table schemas conceptually
const TABLE_SCHEMAS: Record<string, string> = {
  conversations: `(id VARCHAR PRIMARY KEY, threadId VARCHAR, role VARCHAR, content TEXT, timestamp BIGINT, embedding FLOAT[16])`, // Added embedding
  state: `(id VARCHAR PRIMARY KEY, threadId VARCHAR, config JSON, agentState JSON)`, // Store JSON directly
  observations: `(id VARCHAR PRIMARY KEY, threadId VARCHAR, traceId VARCHAR, type VARCHAR, timestamp BIGINT, content JSON, metadata JSON)`,
  // Add other collections as needed
};
const EMBEDDING_DIMENSION = 16; // Match the schema

export class DuckDBWasmAdapter implements StorageAdapter {
  private db: duckdb.AsyncDuckDB | null = null;
  private connection: duckdb.AsyncDuckDBConnection | null = null;
  private dbPath: string; // Path for storing DB file if using specific backend
  private initPromise: Promise<void> | null = null; // Prevent race conditions

  constructor(options: { dbPath?: string } = {}) {
      // dbPath might be used with specific backends like OPFS
      this.dbPath = options.dbPath || 'art_duckdb.db';
  }

  // Modified init to handle concurrent calls
  async init(): Promise<void> {
    if (!this.initPromise) {
        this.initPromise = this._initialize();
    }
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    if (this.db) return; // Already initialized

    console.log("Initializing DuckDB WASM...");
    try {
      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
      const worker_url = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' })
      );
      const worker = new Worker(worker_url);
      const logger = new duckdb.ConsoleLogger(); // Or implement custom logger
      this.db = new duckdb.AsyncDuckDB(logger, worker);
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      URL.revokeObjectURL(worker_url);

      // Optional: Register a specific file persistence backend if needed (e.g., OPFS)
      // Requires specific browser support and setup
      // await this.db.registerFileURL(this.dbPath, `/${this.dbPath}`, duckdb.DuckDBDataProtocol.BROWSER_FSACCESS, false);

      await this.db.open({
          // path: this.dbPath, // Use if registered above
          query: {
              // Configure WASM specifics if needed, e.g., memory limits
              // initialMemory: '...',
          }
      });
      this.connection = await this.db.connect();
      console.log("DuckDB WASM Initialized and Connected.");

      // Ensure tables exist
      await this.ensureTables();

    } catch (error) {
      console.error("DuckDB WASM Initialization failed:", error);
      this.initPromise = null; // Reset promise on failure
      throw error;
    }
  }

  private async ensureTables(): Promise<void> {
      if (!this.connection) throw new Error("DuckDB connection not available.");
      console.log("Ensuring tables exist...");
      // Consider installing extensions like 'json' if not bundled
      // await this.connection.query(`INSTALL json; LOAD json;`);
      for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
          try {
              await this.connection.query(`CREATE TABLE IF NOT EXISTS ${tableName} ${schema};`);
              console.log(`Table ${tableName} ensured.`);
          } catch(e) {
              console.error(`Failed to ensure table ${tableName}:`, e);
              throw e;
          }
      }
  }

  private async ensureConnection(): Promise<duckdb.AsyncDuckDBConnection> {
      await this.init(); // Ensure initialization is complete
      if (!this.connection) {
          throw new Error("Failed to establish DuckDB connection after init.");
      }
      return this.connection;
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const conn = await this.ensureConnection();
    try {
      // Use prepared statements for safety
      const stmt = await conn.prepare(`SELECT * FROM ${collection} WHERE id = $1`);
      // Use arrow format for potentially better type handling with JSON
      const results = await stmt.query(id);
      await stmt.close(); // Close statement
      if (results.numRows > 0) {
        const row = results.get(0)?.toJSON();
        // DuckDB might return JSON columns as strings, parse them
        return this.parseJsonColumns(collection, row) as T;
      }
      return null;
    } catch (error) {
      console.error(`DuckDB get error in ${collection}:`, error);
      return null; // Or throw? Depends on desired error handling
    }
  }

  async set<T extends { id: string, content?: string }>(collection: string, id: string, data: T): Promise<void> {
    const conn = await this.ensureConnection();
    const schema = TABLE_SCHEMAS[collection];
    if (!schema) throw new Error(`Unknown collection: ${collection}`);

    // Prepare data for insertion (handle JSON, generate embedding)
    const values: any[] = [];
    const placeholders: string[] = [];
    const columns: string[] = [];

    let embedding: number[] | null = null;
    if (collection === 'conversations' && data.content && schema.includes('embedding')) {
        embedding = await getEmbedding(data.content); // Generate embedding
    }

    // Dynamically build based on schema and data properties
    // This is simplified; a real implementation needs robust mapping & type handling
    const columnDefs = schema.substring(1, schema.length - 1).split(',').map(s => s.trim().split(' ')[0]);

    for (const col of columnDefs) {
        if (col === 'embedding') {
            if (embedding) {
                columns.push(col);
                values.push(embedding); // DuckDB WASM might handle array types directly or need list_value syntax
                placeholders.push(`$${values.length}`);
            }
        } else if (col in data) {
            columns.push(col);
            let value = (data as any)[col];
            // Stringify JSON fields
            if (schema.includes(`${col} JSON`) && typeof value === 'object') {
                value = JSON.stringify(value);
            }
            values.push(value);
            placeholders.push(`$${values.length}`);
        } else if (col === 'id') { // Ensure ID is always included if not in data explicitly
             columns.push('id');
             values.push(id);
             placeholders.push(`$${values.length}`);
        }
    }


    const sql = `INSERT OR REPLACE INTO ${collection} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

    try {
      // Use prepared statements for insertion/replacement
      const stmt = await conn.prepare(sql);
      await stmt.send(...values); // Use send for operations not returning rows
      await stmt.close();
    } catch (error) {
      console.error(`DuckDB set error in ${collection}:`, error);
      throw error; // Re-throw to signal failure
    }
  }

  async delete(collection: string, id: string): Promise<void> {
    const conn = await this.ensureConnection();
    try {
      const stmt = await conn.prepare(`DELETE FROM ${collection} WHERE id = $1`);
      await stmt.send(id);
      await stmt.close();
    } catch (error) {
      console.error(`DuckDB delete error in ${collection}:`, error);
      throw error;
    }
  }

  async query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]> {
    const conn = await this.ensureConnection();
    let sql = `SELECT * FROM ${collection}`;
    const params: any[] = [];
    let paramIndex = 1;

    // --- Basic Filtering ---
    if (filterOptions.filters && filterOptions.filters.length > 0) {
      const whereClauses = filterOptions.filters
        .map((filter) => {
            // Basic equality check - needs expansion for other operators
            if (filter.operator === '==') {
                params.push(filter.value);
                return `${filter.field} = $${paramIndex++}`;
            }
            // TODO: Add support for other operators like '!=', '>', '<', 'in', etc.
            console.warn(`Unsupported filter operator: ${filter.operator}`);
            return null; // Ignore unsupported filters
        })
        .filter(clause => clause !== null); // Remove nulls from ignored filters

      if (whereClauses.length > 0) {
          sql += ` WHERE ${whereClauses.join(' AND ')}`;
      }
    }

    // --- Vector Similarity Search (Conceptual) ---
    // This requires a specific setup in DuckDB (e.g., vss extension)
    // or manual calculation. Let's assume a filter operator 'vector_similarity'.
    const vectorFilter = filterOptions.filters?.find(f => f.operator === 'vector_similarity');
    if (vectorFilter && collection === 'conversations' && TABLE_SCHEMAS[collection].includes('embedding')) {
        // Assuming vectorFilter.value is the query embedding (number[])
        // Assuming vectorFilter.field is 'embedding'
        const queryEmbedding = vectorFilter.value as number[];
        // Example using hypothetical list_dot_product (needs extension or UDF)
        // Or calculate distance manually if needed.
        // This SQL is conceptual and depends heavily on DuckDB setup.
        // sql = `SELECT *, list_dot_product(embedding, list_value(${queryEmbedding.join(',')})) AS similarity FROM ${collection}`;
        // sql += ` ORDER BY similarity DESC`; // Order by similarity
        console.warn("Vector similarity search requested but not fully implemented in this skeleton.");
        // Add placeholder WHERE clause if needed based on filtering logic
    } else {
        // --- Basic Sorting ---
        if (filterOptions.sortBy) {
            sql += ` ORDER BY ${filterOptions.sortBy} ${filterOptions.sortDirection === 'desc' ? 'DESC' : 'ASC'}`;
        }
    }


    // --- Pagination ---
    if (filterOptions.limit !== undefined) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(filterOptions.limit);
    }
    if (filterOptions.offset !== undefined) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(filterOptions.offset);
    }

    try {
      console.log("Executing DuckDB Query:", sql, params);
      const stmt = await conn.prepare(sql);
      const results = await stmt.query(...params);
      await stmt.close();
      // Parse JSON columns for all results
      return results.toArray().map(arrowRecord => this.parseJsonColumns(collection, arrowRecord.toJSON()) as T);
    } catch (error) {
      console.error(`DuckDB query error in ${collection}:`, error);
      return []; // Return empty on error, or re-throw
    }
  }

   async clearCollection(collection: string): Promise<void> {
       const conn = await this.ensureConnection();
       try {
           const stmt = await conn.prepare(`DELETE FROM ${collection}`);
           await stmt.send();
           await stmt.close();
       } catch (error) {
           console.error(`DuckDB clearCollection error for ${collection}:`, error);
           throw error;
       }
   }

   async clearAll(): Promise<void> {
       const conn = await this.ensureConnection();
       try {
           for (const tableName of Object.keys(TABLE_SCHEMAS)) {
               const stmt = await conn.prepare(`DELETE FROM ${tableName}`);
               await stmt.send();
               await stmt.close();
           }
       } catch (error) {
           console.error(`DuckDB clearAll error:`, error);
           throw error;
       }
   }

   // Helper to parse columns that should be JSON
   private parseJsonColumns(collection: string, row: any): any {
       if (!row) return null;
       const schema = TABLE_SCHEMAS[collection];
       if (!schema) return row;

       const jsonFields = ['config', 'agentState', 'content', 'metadata']; // Fields potentially stored as JSON strings
       for (const field of jsonFields) {
           // Check if schema defines field as JSON and if current value is string
           if (schema.includes(`${field} JSON`) && typeof row[field] === 'string') {
               try {
                   row[field] = JSON.parse(row[field]);
               } catch (e) {
                   console.warn(`Failed to parse JSON field ${field} in collection ${collection}`, e);
                   // Keep as string if parsing fails
               }
           }
       }
       return row;
   }

   async close(): Promise<void> {
       if (this.initPromise) {
           await this.initPromise; // Ensure init is done before closing
       }
       if (this.connection) {
           console.log("Closing DuckDB connection...");
           await this.connection.close();
           this.connection = null;
       }
       if (this.db) {
           console.log("Terminating DuckDB instance...");
           await this.db.terminate();
           this.db = null;
       }
       this.initPromise = null; // Reset init promise
       console.log("DuckDB terminated.");
   }
}
```

**Explanation:**

1.  **Implement `StorageAdapter`:** Fulfills the contract.
2.  **DuckDB WASM Setup:**
    *   Imports `@duckdb/duckdb-wasm`.
    *   The `init` method handles the complex asynchronous loading of the WASM bundle, worker instantiation, database opening, and connection establishment. Uses `initPromise` to prevent race conditions on concurrent calls.
    *   `ensureTables` creates the necessary tables (including conceptual `embedding` column) if they don't exist.
    *   `ensureConnection` is a helper to guarantee initialization.
3.  **CRUD Methods:**
    *   Translate operations into SQL using **prepared statements** (`prepare`, `query`, `send`) for security and efficiency.
    *   Handles JSON stringification/parsing for relevant columns.
    *   Includes conceptual embedding generation during `set` for the `conversations` table.
4.  **`query` Method:**
    *   Constructs SQL `SELECT` query.
    *   Maps simple equality filters from `FilterOptions` to `WHERE` clauses using parameterized queries.
    *   Includes a *conceptual placeholder* for vector similarity search, noting its complexity and dependency on potential DuckDB extensions (like `vss`) or manual calculations.
    *   Adds basic `ORDER BY`, `LIMIT`, and `OFFSET`.
    *   **Limitation:** Explicitly notes that complex filtering and efficient vector search are advanced topics.
5.  **Cleanup:** Includes an async `close` method to properly terminate the DB connection and worker, ensuring it waits for initialization if pending.

**6.3. Integrating the `DuckDBWasmAdapter`**

Again, the default `AgentFactory` doesn't directly support custom storage classes. Integration requires manual instantiation or a custom factory.

**Example Manual Instantiation Snippet (Conceptual):**

```typescript
// --- Manual Instantiation Example ---
import { DuckDBWasmAdapter } from './adapters/DuckDBWasmAdapter';
import { OpenAIAdapter } from 'art-framework'; // Or your custom provider
// ... import Repositories, Managers, Systems, AgentCore, Tools ...

async function setupDuckDbArt(): Promise<ArtInstance> {
    // 1. Init Adapters
    const storageAdapter = new DuckDBWasmAdapter(/* options */);
    await storageAdapter.init(); // IMPORTANT: Must initialize DuckDB

    const providerAdapter = new OpenAIAdapter({ apiKey: 'YOUR_OPENAI_KEY' });
    // ... potentially inject ObservationManager if needed ...

    // 2. Init Repositories (pass the initialized DuckDB adapter)
    const conversationRepository = new ConversationRepository(storageAdapter);
    const stateRepository = new StateRepository(storageAdapter);
    const observationRepository = new ObservationRepository(storageAdapter);

    // 3. Init Managers & Systems (Inject Repositories, setup UI System)
    // ... complex setup ...
    const observationManager = new ObservationManagerImpl(observationRepository, /* uiSystem.getObservationSocket() */);
    const conversationManager = new ConversationManagerImpl(conversationRepository, /* uiSystem.getConversationSocket() */);
    const stateManager = new StateManagerImpl(stateRepository);
    const toolRegistry = new ToolRegistryImpl();
    // await toolRegistry.registerTool(...)
    const toolSystem = new ToolSystemImpl(toolRegistry, stateManager, observationManager);
    const reasoningEngine = new ReasoningEngineImpl(providerAdapter);
    const promptManager = new PromptManagerImpl();
    const outputParser = new OutputParserImpl();

    // 4. Init Agent Core
    const agentCore = new PESAgent({
        stateManager, conversationManager, toolRegistry, promptManager,
        reasoningEngine, outputParser, observationManager, toolSystem
    });

    // 5. Construct ArtInstance
    const artInstance: ArtInstance = {
        process: agentCore.process.bind(agentCore),
        conversationManager,
        stateManager,
        toolRegistry,
        observationManager,
        uiSystem: /* Need actual UISystem instance */
    };

    // Add cleanup hook for DuckDB if your app lifecycle allows
    // window.addEventListener('beforeunload', () => storageAdapter.close());

    return artInstance;
}