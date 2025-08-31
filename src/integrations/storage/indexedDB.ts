import { StorageAdapter } from '@/core/interfaces';
import { FilterOptions } from '@/types';
import { Logger } from '@/utils/logger'; // Import Logger at top level

// Default configuration
const DEFAULT_DB_NAME = 'ART_Framework_DB';
const DEFAULT_DB_VERSION = 1; // Increment this when object stores change

/**
 * Configuration options for initializing the `IndexedDBStorageAdapter`.
 */
export interface IndexedDBConfig {
  /** The name of the IndexedDB database to use. Defaults to 'ART_Framework_DB'. */
  dbName?: string;
  /** The version of the database schema. Increment this when changing `objectStores` or indexes to trigger an upgrade. Defaults to 1. */
  dbVersion?: number;
  /** An array of strings specifying the names of the object stores (collections) required by the application. Core stores like 'conversations', 'observations', 'state' are usually added automatically. */
  objectStores: string[];
}

/**
 * An implementation of the `StorageAdapter` interface that uses the browser's
 * IndexedDB API for persistent, client-side storage.
 *
 * This adapter is suitable for web applications where conversation history,
 * agent state, and observations need to persist across sessions.
 *
 * **Important:** The `init()` method *must* be called and awaited before performing
 * any other database operations (get, set, delete, query).
 *
 * @implements {StorageAdapter}
 */
export class IndexedDBStorageAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private dbVersion: number;
  private requiredObjectStores: Set<string>;
  private initPromise: Promise<void> | null = null;

  /**
   * Creates an instance of IndexedDBStorageAdapter.
   * Note: The database connection is not opened until `init()` is called.
   * @param {IndexedDBConfig} config - Configuration options including database name, version, and required object stores.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
   */
  constructor(config: IndexedDBConfig) {
    this.dbName = config.dbName || DEFAULT_DB_NAME;
    this.dbVersion = config.dbVersion || DEFAULT_DB_VERSION;
    // Ensure core stores used by default repositories are included
    this.requiredObjectStores = new Set([
        'conversations', // Used by ConversationRepository
        'observations',  // Used by ObservationRepository
        'state',         // Used by StateRepository
        'a2a_tasks',     // Used by TaskStatusRepository
        ...(config.objectStores || []) // Add any user-defined stores
    ]);
  }

  /**
   * Opens the IndexedDB database connection and ensures the required object stores
   * are created or updated based on the configured `dbVersion`.
   * This method MUST be called and awaited successfully before using other adapter methods.
   * It handles the `onupgradeneeded` event to create stores.
   * @returns A promise that resolves when the database is successfully opened and ready, or rejects on error.
   */
  async init(): Promise<void> {
    // Prevent multiple initializations
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        Logger.error("IndexedDBStorageAdapter: IndexedDB not supported in this browser."); // Use Logger
        return reject(new Error("IndexedDB not supported"));
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        Logger.error(`IndexedDBStorageAdapter: Database error: ${request.error}`, event); // Use Logger
        reject(new Error(`IndexedDB error: ${request.error?.message}`));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        Logger.info(`IndexedDBStorageAdapter: Database '${this.dbName}' opened successfully (Version: ${this.db.version}).`); // Use Logger

        // Optional: Check if all required stores actually exist after opening
        const existingStores = new Set(Array.from(this.db.objectStoreNames));
        const missingStores = [...this.requiredObjectStores].filter(store => !existingStores.has(store));
        if (missingStores.length > 0) {
            Logger.warn(`IndexedDBStorageAdapter: The following required object stores were not found after opening DB version ${this.db.version}: ${missingStores.join(', ')}. This might happen if the DB version wasn't incremented after adding stores.`); // Use Logger
            // Depending on strictness, you might reject here
        }

        this.db.onerror = (errorEvent) => {
            // Generic error handler for the database connection
            Logger.error(`IndexedDBStorageAdapter: Generic database error:`, errorEvent); // Use Logger
        };
        resolve();
      };

      request.onupgradeneeded = (event) => {
        Logger.info(`IndexedDBStorageAdapter: Upgrading database '${this.dbName}' from version ${event.oldVersion} to ${event.newVersion}...`); // Use Logger
        this.db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction; // Get transaction for upgrade

        if (!transaction) {
            Logger.error("IndexedDBStorageAdapter: Upgrade transaction is null!"); // Use Logger
            reject(new Error("Upgrade transaction failed"));
            return;
        }

        const existingStoreNames = new Set(Array.from(this.db.objectStoreNames));

        this.requiredObjectStores.forEach(storeName => {
          if (!existingStoreNames.has(storeName)) {
            Logger.info(`IndexedDBStorageAdapter: Creating object store '${storeName}'...`); // Use Logger
            // Use 'id' as the key path, assuming all stored objects will have an 'id' property.
            // If not, a different key strategy or autoIncrement might be needed.
            // For flexibility, we might need a config per store, but 'id' is common.
            this.db?.createObjectStore(storeName, { keyPath: 'id' });
            // TODO: Consider adding indexes here if needed for query performance based on FilterOptions
            // Example: store.createIndex('by_type', 'type', { unique: false });
          }
          // Handle index creation/updates or data migration if necessary for existing stores
        });

        // Example: Removing old stores if needed (use with caution)
        // existingStoreNames.forEach(storeName => {
        //   if (!this.requiredObjectStores.has(storeName)) {
        //     Logger.info(`IndexedDBStorageAdapter: Deleting old object store '${storeName}'...`); // Use Logger
        //     this.db?.deleteObjectStore(storeName);
        //   }
        // });

        Logger.info(`IndexedDBStorageAdapter: Database upgrade complete.`); // Use Logger
        // Note: onsuccess will be called automatically after onupgradeneeded completes.
      };

       request.onblocked = (event) => {
            // This event fires if the database is open in another tab/window with an older version
            Logger.warn(`IndexedDBStorageAdapter: Database open request blocked for '${this.dbName}'. Please close other tabs/connections using an older version of this database.`, event); // Use Logger
            reject(new Error(`IndexedDB open blocked for ${this.dbName}. Close other connections.`));
        };

    });

    return this.initPromise;
  }

  // --- Helper Method to get a transaction ---
  /**
   * Helper method to create and return an IndexedDB transaction.
   * Ensures the database is initialized and the requested store(s) exist.
   * @param storeName - The name of the object store or an array of store names for the transaction.
   * @param mode - The transaction mode ('readonly' or 'readwrite').
   * @returns The initiated IDBTransaction.
   * @throws {Error} If the database is not initialized or if a requested store does not exist.
   */
  private getTransaction(storeName: string | string[], mode: IDBTransactionMode): IDBTransaction {
      if (!this.db) {
          // It's crucial init() was awaited, but add runtime check.
          throw new Error("IndexedDBStorageAdapter: Database not initialized. Ensure init() was called and awaited.");
      }
      // Check if the requested store exists
      const storesToCheck = Array.isArray(storeName) ? storeName : [storeName];
      storesToCheck.forEach(sName => {
          if (!this.db?.objectStoreNames.contains(sName)) {
              throw new Error(`IndexedDBStorageAdapter: Object store "${sName}" does not exist in the database.`);
          }
      });

      return this.db.transaction(storeName, mode);
  }

  // --- CRUD Methods ---

  /**
   * Retrieves a single item by its ID from the specified object store (collection).
   * @template T - The expected type of the retrieved item.
   * @param collection - The name of the object store.
   * @param id - The ID (key) of the item to retrieve.
   * @returns A promise resolving to a copy of the item if found, or `null` otherwise.
   * @throws {Error} If the database is not initialized, the store doesn't exist, or a database error occurs.
   */
  async get<T>(collection: string, id: string): Promise<T | null> {
    await this.init(); // Ensure DB is ready (init is idempotent)
    return new Promise((resolve, reject) => {
        try {
            const transaction = this.getTransaction(collection, 'readonly');
            const store = transaction.objectStore(collection);
            const request = store.get(id);

            request.onsuccess = () => {
                // Return a copy? IndexedDB usually returns structured clones already,
                // but explicit copy might be safer depending on usage.
                resolve(request.result ? { ...request.result } : null);
            };

            request.onerror = () => {
                Logger.error(`IndexedDBStorageAdapter: Error getting item '${id}' from '${collection}':`, request.error); // Use Logger
                reject(new Error(`Failed to get item: ${request.error?.message}`));
            };
        } catch (error) {
            reject(error); // Catch errors from getTransaction (e.g., store not found)
        }
    });
  }

  // Removed the 'extends { id: string }' constraint to match the interface
  /**
   * Saves (creates or updates) an item in the specified object store (collection).
   * Assumes the object store uses 'id' as its keyPath. The `id` parameter provided
   * should match the `id` property within the `data` object.
   * Uses `structuredClone` to store a deep copy.
   * @template T - The type of the data being saved. Must have an 'id' property.
   * @param collection - The name of the object store.
   * @param id - The unique ID of the item (should match `data.id`).
   * @param data - The data object to save. Must contain an `id` property matching the `id` parameter.
   * @returns A promise that resolves when the data is successfully saved.
   * @throws {Error} If the database is not initialized, the store doesn't exist, data is missing the 'id' property, or a database error occurs.
   */
  async set<T>(collection: string, id: string, data: T): Promise<void> {
    // Runtime check: Ensure data has the 'id' property matching the keyPath
    // We cast to 'any' here because T doesn't guarantee 'id' exists at compile time anymore.
    const dataAsAny = data as any;
     if (typeof dataAsAny.id === 'undefined') {
         return Promise.reject(new Error(`IndexedDBStorageAdapter: Data for collection '${collection}' must have an 'id' property matching the keyPath.`));
     }
     if (dataAsAny.id !== id) {
        Logger.warn(`IndexedDBStorageAdapter: Provided id ('${id}') and data.id ('${dataAsAny.id}') mismatch for collection '${collection}'. Using data.id as the key.`); // Use Logger
        // Optionally throw an error or enforce consistency based on project needs.
        // For now, we proceed using data.id as the key for the put operation.
     }


    await this.init(); // Ensure DB is ready
    return new Promise((resolve, reject) => {
        try {
            // Use structuredClone for a robust deep copy before storing
            const dataToStore = structuredClone(data);
            const transaction = this.getTransaction(collection, 'readwrite');
            const store = transaction.objectStore(collection);
            // Use the id from the data object itself, as it's the keyPath
            const request = store.put(dataToStore); // put = insert or update

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                // Use dataAsAny.id in the error message as it's the actual key used
                Logger.error(`IndexedDBStorageAdapter: Error setting item with id '${dataAsAny.id}' in '${collection}':`, request.error); // Use Logger
                reject(new Error(`Failed to set item: ${request.error?.message}`));
            };

            transaction.oncomplete = () => {
                // Transaction completed successfully (optional logging)
            };

            transaction.onerror = (event) => {
                 // Use dataAsAny.id in the error message
                Logger.error(`IndexedDBStorageAdapter: Transaction error setting item with id '${dataAsAny.id}' in '${collection}':`, transaction.error, event); // Use Logger
                reject(new Error(`Transaction failed: ${transaction.error?.message}`));
            };
        } catch (error) {
            reject(error);
        }
    });
  }

  /**
   * Deletes an item from the specified object store (collection) by its ID.
   * @param collection - The name of the object store.
   * @param id - The ID (key) of the item to delete.
   * @returns A promise that resolves when the deletion is successful.
   * @throws {Error} If the database is not initialized, the store doesn't exist, or a database error occurs.
   */
  async delete(collection: string, id: string): Promise<void> {
    await this.init(); // Ensure DB is ready
     return new Promise((resolve, reject) => {
        try {
            const transaction = this.getTransaction(collection, 'readwrite');
            const store = transaction.objectStore(collection);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                Logger.error(`IndexedDBStorageAdapter: Error deleting item '${id}' from '${collection}':`, request.error); // Use Logger
                reject(new Error(`Failed to delete item: ${request.error?.message}`));
            };

             transaction.onerror = (event) => {
                Logger.error(`IndexedDBStorageAdapter: Transaction error deleting item '${id}' from '${collection}':`, transaction.error, event); // Use Logger
                reject(new Error(`Transaction failed: ${transaction.error?.message}`));
            };
        } catch (error) {
            reject(error);
        }
    });
  }

  /**
   * Queries items within a collection based on provided filter options.
   * **Note:** This implementation uses `getAll()` and performs filtering, sorting,
   * and limiting **client-side**. For large datasets, performance may be suboptimal.
   * A more advanced version would leverage IndexedDB indexes and cursors for
   * efficient querying directly within the database.
   * Supports basic exact-match filtering and single-key sorting.
   * @template T - The expected type of the items in the collection.
   * @param collection - The name of the object store to query.
   * @param filterOptions - Options for filtering, sorting, skipping, and limiting results.
   * @returns A promise resolving to an array of deep copies of the matching items.
   * @throws {Error} If the database is not initialized, the store doesn't exist, or a database error occurs.
   * @todo Implement more advanced querying using IndexedDB indexes and cursors.
   */
  async query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]> {
     await this.init(); // Ensure DB is ready
     return new Promise((resolve, reject) => {
         try {
             const transaction = this.getTransaction(collection, 'readonly');
             const store = transaction.objectStore(collection);
             const request = store.getAll(); // Get all records

             request.onsuccess = () => {
                 let results: T[] = request.result || [];

                 // Client-side filtering (basic exact match)
                 if (filterOptions.filter) {
                     results = results.filter(item => {
                         for (const key in filterOptions.filter) {
                             // eslint-disable-next-line no-prototype-builtins
                             if (filterOptions.filter.hasOwnProperty(key)) {
                                 if ((item as any)[key] !== (filterOptions.filter as any)[key]) {
                                     return false;
                                 }
                             }
                         }
                         return true;
                     });
                 }

                 // Client-side sorting (basic single key)
                 if (filterOptions.sort) {
                     const sortKey = Object.keys(filterOptions.sort)[0];
                     const sortDir = filterOptions.sort[sortKey];
                     if (sortKey) {
                         results.sort((a, b) => {
                             const valA = (a as any)[sortKey];
                             const valB = (b as any)[sortKey];
                             if (valA < valB) return sortDir === 'asc' ? -1 : 1;
                             if (valA > valB) return sortDir === 'asc' ? 1 : -1;
                             return 0;
                         });
                     }
                 }

                 // Client-side skip/limit
                 const skip = filterOptions.skip || 0;
                 const limit = filterOptions.limit ?? Infinity; // Default to no limit if undefined
                 results = results.slice(skip, skip + limit);


                 // Return copies
                 resolve(results.map(item => ({ ...item })));
             };

             request.onerror = () => {
                 Logger.error(`IndexedDBStorageAdapter: Error querying collection '${collection}':`, request.error); // Use Logger
                 reject(new Error(`Failed to query collection: ${request.error?.message}`));
             };
         } catch (error) {
             reject(error);
         }
     });
  }

  /**
   * Removes all items from a specific object store (collection).
   * @param collection - The name of the object store to clear.
   * @returns A promise that resolves when the collection is successfully cleared.
   * @throws {Error} If the database is not initialized, the store doesn't exist, or a database error occurs.
   */
  async clearCollection(collection: string): Promise<void> {
    await this.init(); // Ensure DB is ready
     return new Promise((resolve, reject) => {
        try {
            const transaction = this.getTransaction(collection, 'readwrite');
            const store = transaction.objectStore(collection);
            const request = store.clear();

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                Logger.error(`IndexedDBStorageAdapter: Error clearing collection '${collection}':`, request.error); // Use Logger
                reject(new Error(`Failed to clear collection: ${request.error?.message}`));
            };

             transaction.onerror = (event) => {
                Logger.error(`IndexedDBStorageAdapter: Transaction error clearing collection '${collection}':`, transaction.error, event); // Use Logger
                reject(new Error(`Transaction failed: ${transaction.error?.message}`));
            };
        } catch (error) {
            reject(error);
        }
    });
  }

  /**
   * Removes all data from all object stores managed by this adapter instance within the database.
   * Use with caution as this is destructive.
   * @returns A promise that resolves when all specified object stores have been cleared.
   * @throws {Error} If the database is not initialized or a transaction error occurs.
   */
  async clearAll(): Promise<void> {
    await this.init(); // Ensure DB is ready
    if (!this.db) {
        throw new Error("Database not initialized.");
    }

    const storeNames = Array.from(this.db.objectStoreNames);
    if (storeNames.length === 0) {
        return Promise.resolve(); // Nothing to clear
    }

    return new Promise((resolve, reject) => {
        try {
            // Need a transaction covering all stores to clear
            const transaction = this.getTransaction(storeNames, 'readwrite');

            let clearCount = 0;
            const totalStores = storeNames.length;

            storeNames.forEach(storeName => {
                const request = transaction.objectStore(storeName).clear();
                request.onsuccess = () => {
                    clearCount++;
                    if (clearCount === totalStores) {
                        // This might resolve before transaction.oncomplete
                    }
                };
                request.onerror = () => {
                    // Error on individual clear, transaction might still complete or abort
                    Logger.error(`IndexedDBStorageAdapter: Error clearing object store '${storeName}':`, request.error); // Use Logger
                    // Don't reject immediately, let transaction handle overall status
                };
            });

            transaction.oncomplete = () => {
                Logger.info(`IndexedDBStorageAdapter: All object stores cleared successfully.`); // Use Logger
                resolve();
            };

            transaction.onerror = (event) => {
                Logger.error(`IndexedDBStorageAdapter: Transaction error during clearAll:`, transaction.error, event); // Use Logger
                reject(new Error(`Failed to clear all stores: ${transaction.error?.message}`));
            };
        } catch (error) {
            reject(error);
        }
    });
  }
}