import { StorageAdapter } from '@/core/interfaces';
import { FilterOptions } from '@/types';

/**
 * An in-memory implementation of the `StorageAdapter` interface.
 * Stores all data in JavaScript Maps within the current process memory.
 * Data is **not persisted** and will be lost when the application session ends.
 *
 * Useful for:
 * - Unit and integration testing (fast, no external dependencies).
 * - Simple demos or examples where persistence isn't needed.
 * - Ephemeral agents that don't require long-term memory.
 *
 * @implements {StorageAdapter}
 */
export class InMemoryStorageAdapter implements StorageAdapter {
  private storage: Map<string, Map<string, any>> = new Map();

  /**
   * Creates an instance of InMemoryStorageAdapter.
   * @see StorageAdapter
   */
  constructor() {
    // No-op
  }

  /**
   * Initializes the adapter. This is a no-op for the in-memory adapter
   * and is provided for interface compatibility.
   * @param _config - Optional configuration (ignored by this adapter).
   * @returns A promise that resolves immediately.
   */
  async init(_config?: any): Promise<void> { // Renamed config to _config
    // No initialization needed for in-memory storage
    return Promise.resolve();
  }

  /**
   * Retrieves a single item (as a deep copy) from a specified collection by its ID.
   * @template T - The expected type of the retrieved item.
   * @param collection - The name of the data collection (e.g., 'messages', 'observations').
   * @param id - The unique ID of the item within the collection.
   * @returns A promise resolving to a deep copy of the item if found, or `null` otherwise.
   */
  async get<T>(collection: string, id: string): Promise<T | null> {
    const collectionMap = this.storage.get(collection);
    if (!collectionMap) {
      return null;
    }
    const item = collectionMap.get(id);
    // Return a deep copy to prevent accidental modification of the stored object
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  /**
   * Saves (creates or updates) an item in a specified collection.
   * Stores a deep copy of the provided data to prevent external mutations.
   * @template T - The type of the data being saved.
   * @param collection - The name of the collection.
   * @param id - The unique ID for the item.
   * @param data - The data object to save.
   * @returns A promise that resolves when the data is saved in memory.
   */
  async set<T>(collection: string, id: string, data: T): Promise<void> {
    if (!this.storage.has(collection)) {
      this.storage.set(collection, new Map());
    }
    const collectionMap = this.storage.get(collection)!;
    // Store a deep copy to prevent external modifications affecting the store
    collectionMap.set(id, JSON.parse(JSON.stringify(data)));
    return Promise.resolve();
  }

  /**
   * Deletes an item from a specified collection using its ID.
   * If the collection or item does not exist, the operation completes silently.
   * @param collection - The name of the collection.
   * @param id - The unique ID of the item to delete.
   * @returns A promise that resolves when the deletion attempt is complete.
   */
  async delete(collection: string, id: string): Promise<void> {
    const collectionMap = this.storage.get(collection);
    if (collectionMap) {
      collectionMap.delete(id);
    }
    return Promise.resolve();
  }

  /**
   * Queries items within a collection based on provided filter options.
   * **Note:** This in-memory implementation provides basic filtering capabilities:
   * - Supports exact matches on top-level properties specified in `filterOptions.filter`.
   * - Supports limiting results via `filterOptions.limit`.
   * - **Does not** support sorting (`filterOptions.sort`), skipping (`filterOptions.skip`), complex operators (like $gt, $in), or nested property filtering.
   * @template T - The expected type of the items in the collection.
   * @param collection - The name of the collection to query.
   * @param filterOptions - Options for filtering and limiting the results.
   * @returns A promise resolving to an array of deep copies of the matching items.
   */
  async query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]> {
    const collectionMap = this.storage.get(collection);
    if (!collectionMap) {
      return [];
    }

    let results = Array.from(collectionMap.values());

    // Basic filtering (exact match on top-level properties)
    if (filterOptions.filter) {
      results = results.filter(item => {
        for (const key in filterOptions.filter) {
          // eslint-disable-next-line no-prototype-builtins
          if (filterOptions.filter.hasOwnProperty(key)) {
            // Use type assertion carefully or add more robust checks
            if ((item as any)[key] !== (filterOptions.filter as any)[key]) {
              return false;
            }
          }
        }
        return true;
      });
    }

    // Basic limit
    if (typeof filterOptions.limit === 'number' && filterOptions.limit >= 0) {
      results = results.slice(0, filterOptions.limit);
    }

    // Return deep copies
    return JSON.parse(JSON.stringify(results));
  }

  /**
   * Removes all items from a specific collection within the in-memory store.
   * @param collection - The name of the collection to clear.
   * @returns A promise that resolves when the collection is cleared.
   */
  async clearCollection(collection: string): Promise<void> {
    this.storage.delete(collection);
    return Promise.resolve();
  }

  /**
   * Removes all collections and all data stored within the adapter instance.
   * Use with caution, especially during testing.
   * @returns A promise that resolves when all data is cleared.
   */
  async clearAll(): Promise<void> {
    this.storage.clear();
    return Promise.resolve();
  }
}