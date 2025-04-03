import { StorageAdapter } from '../../core/interfaces';
import { FilterOptions } from '../../types';

// Default configuration
const DEFAULT_DB_NAME = 'ART_Framework_DB';
const DEFAULT_DB_VERSION = 1; // Increment this when object stores change

/**
 * Configuration options for the IndexedDBStorageAdapter.
 */
export interface IndexedDBConfig {
  dbName?: string;
  dbVersion?: number;
  objectStores: string[]; // List of required collection names (object stores)
}

/**
 * An implementation of the StorageAdapter interface using IndexedDB
 * for persistent storage in the browser.
 */
export class IndexedDBStorageAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private dbVersion: number;
  private requiredObjectStores: Set<string>;
  private initPromise: Promise<void> | null = null;

  constructor(config: IndexedDBConfig) {
    this.dbName = config.dbName || DEFAULT_DB_NAME;
    this.dbVersion = config.dbVersion || DEFAULT_DB_VERSION;
    // Ensure core stores are always present if needed by repositories
    this.requiredObjectStores = new Set([
        'conversations', // Example core store
        'observations',  // Example core store
        'state',         // Example core store
        ...config.objectStores // Add user-defined stores
    ]);
  }

  /**
   * Initializes the IndexedDB database connection and ensures object stores exist.
   * This method should be called before any other operations.
   */
  async init(): Promise<void> {
    // Prevent multiple initializations
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        console.error("IndexedDBStorageAdapter: IndexedDB not supported in this browser.");
        return reject(new Error("IndexedDB not supported"));
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        console.error(`IndexedDBStorageAdapter: Database error: ${request.error}`, event);
        reject(new Error(`IndexedDB error: ${request.error?.message}`));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log(`IndexedDBStorageAdapter: Database '${this.dbName}' opened successfully (Version: ${this.db.version}).`);

        // Optional: Check if all required stores actually exist after opening
        const existingStores = new Set(Array.from(this.db.objectStoreNames));
        const missingStores = [...this.requiredObjectStores].filter(store => !existingStores.has(store));
        if (missingStores.length > 0) {
            console.warn(`IndexedDBStorageAdapter: The following required object stores were not found after opening DB version ${this.db.version}: ${missingStores.join(', ')}. This might happen if the DB version wasn't incremented after adding stores.`);
            // Depending on strictness, you might reject here
        }

        this.db.onerror = (errorEvent) => {
            // Generic error handler for the database connection
            console.error(`IndexedDBStorageAdapter: Generic database error:`, errorEvent);
        };
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log(`IndexedDBStorageAdapter: Upgrading database '${this.dbName}' from version ${event.oldVersion} to ${event.newVersion}...`);
        this.db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction; // Get transaction for upgrade

        if (!transaction) {
            console.error("IndexedDBStorageAdapter: Upgrade transaction is null!");
            reject(new Error("Upgrade transaction failed"));
            return;
        }

        const existingStoreNames = new Set(Array.from(this.db.objectStoreNames));

        this.requiredObjectStores.forEach(storeName => {
          if (!existingStoreNames.has(storeName)) {
            console.log(`IndexedDBStorageAdapter: Creating object store '${storeName}'...`);
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
        //     console.log(`IndexedDBStorageAdapter: Deleting old object store '${storeName}'...`);
        //     this.db?.deleteObjectStore(storeName);
        //   }
        // });

        console.log(`IndexedDBStorageAdapter: Database upgrade complete.`);
        // Note: onsuccess will be called automatically after onupgradeneeded completes.
      };

       request.onblocked = (event) => {
            // This event fires if the database is open in another tab/window with an older version
            console.warn(`IndexedDBStorageAdapter: Database open request blocked for '${this.dbName}'. Please close other tabs/connections using an older version of this database.`, event);
            reject(new Error(`IndexedDB open blocked for ${this.dbName}. Close other connections.`));
        };

    });

    return this.initPromise;
  }

  // --- Helper Method to get a transaction ---
  private getTransaction(storeName: string | string[], mode: IDBTransactionMode): IDBTransaction {
      if (!this.db) {
          throw new Error("IndexedDBStorageAdapter: Database not initialized. Call init() first.");
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

  async get<T>(collection: string, id: string): Promise<T | null> {
    await this.init(); // Ensure DB is ready
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
                console.error(`IndexedDBStorageAdapter: Error getting item '${id}' from '${collection}':`, request.error);
                reject(new Error(`Failed to get item: ${request.error?.message}`));
            };
        } catch (error) {
            reject(error); // Catch errors from getTransaction (e.g., store not found)
        }
    });
  }

  // Removed the 'extends { id: string }' constraint to match the interface
  async set<T>(collection: string, id: string, data: T): Promise<void> {
    // Runtime check: Ensure data has the 'id' property matching the keyPath
    // We cast to 'any' here because T doesn't guarantee 'id' exists at compile time anymore.
    const dataAsAny = data as any;
     if (typeof dataAsAny.id === 'undefined') {
         return Promise.reject(new Error(`IndexedDBStorageAdapter: Data for collection '${collection}' must have an 'id' property matching the keyPath.`));
     }
     if (dataAsAny.id !== id) {
        console.warn(`IndexedDBStorageAdapter: Provided id ('${id}') and data.id ('${dataAsAny.id}') mismatch for collection '${collection}'. Using data.id as the key.`);
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
                console.error(`IndexedDBStorageAdapter: Error setting item with id '${dataAsAny.id}' in '${collection}':`, request.error);
                reject(new Error(`Failed to set item: ${request.error?.message}`));
            };

            transaction.oncomplete = () => {
                // Transaction completed successfully (optional logging)
            };

            transaction.onerror = (event) => {
                 // Use dataAsAny.id in the error message
                console.error(`IndexedDBStorageAdapter: Transaction error setting item with id '${dataAsAny.id}' in '${collection}':`, transaction.error, event);
                reject(new Error(`Transaction failed: ${transaction.error?.message}`));
            };
        } catch (error) {
            reject(error);
        }
    });
  }

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
                console.error(`IndexedDBStorageAdapter: Error deleting item '${id}' from '${collection}':`, request.error);
                reject(new Error(`Failed to delete item: ${request.error?.message}`));
            };

             transaction.onerror = (event) => {
                console.error(`IndexedDBStorageAdapter: Transaction error deleting item '${id}' from '${collection}':`, transaction.error, event);
                reject(new Error(`Transaction failed: ${transaction.error?.message}`));
            };
        } catch (error) {
            reject(error);
        }
    });
  }

  async query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]> {
     await this.init();
     // Basic implementation using getAll and client-side filtering/sorting/limiting
     // More advanced implementation would use IndexedDB cursors and indexes.
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
                 console.error(`IndexedDBStorageAdapter: Error querying collection '${collection}':`, request.error);
                 reject(new Error(`Failed to query collection: ${request.error?.message}`));
             };
         } catch (error) {
             reject(error);
         }
     });
  }

  async clearCollection(collection: string): Promise<void> {
    await this.init();
     return new Promise((resolve, reject) => {
        try {
            const transaction = this.getTransaction(collection, 'readwrite');
            const store = transaction.objectStore(collection);
            const request = store.clear();

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                console.error(`IndexedDBStorageAdapter: Error clearing collection '${collection}':`, request.error);
                reject(new Error(`Failed to clear collection: ${request.error?.message}`));
            };

             transaction.onerror = (event) => {
                console.error(`IndexedDBStorageAdapter: Transaction error clearing collection '${collection}':`, transaction.error, event);
                reject(new Error(`Transaction failed: ${transaction.error?.message}`));
            };
        } catch (error) {
            reject(error);
        }
    });
  }

  async clearAll(): Promise<void> {
    await this.init();
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
                    console.error(`IndexedDBStorageAdapter: Error clearing object store '${storeName}':`, request.error);
                    // Don't reject immediately, let transaction handle overall status
                };
            });

            transaction.oncomplete = () => {
                console.log(`IndexedDBStorageAdapter: All object stores cleared successfully.`);
                resolve();
            };

            transaction.onerror = (event) => {
                console.error(`IndexedDBStorageAdapter: Transaction error during clearAll:`, transaction.error, event);
                reject(new Error(`Failed to clear all stores: ${transaction.error?.message}`));
            };
        } catch (error) {
            reject(error);
        }
    });
  }
}