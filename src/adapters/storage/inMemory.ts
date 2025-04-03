import { StorageAdapter } from '../../core/interfaces';
import { FilterOptions } from '../../types';

/**
 * An in-memory implementation of the StorageAdapter interface.
 * Useful for testing, development, or simple scenarios where persistence
 * across sessions is not required.
 */
export class InMemoryStorageAdapter implements StorageAdapter {
  private storage: Map<string, Map<string, any>> = new Map();

  /**
   * Initializes the adapter (no-op for in-memory).
   * @param _config Optional configuration (ignored).
   */
  async init(_config?: any): Promise<void> { // Renamed config to _config
    // No initialization needed for in-memory storage
    return Promise.resolve();
  }

  /**
   * Retrieves a single item from a collection by its ID.
   * @param collection The name of the data collection.
   * @param id The unique ID of the item.
   * @returns The item or null if not found.
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
   * Saves (creates or updates) an item in a collection.
   * @param collection The name of the collection.
   * @param id The unique ID of the item.
   * @param data The data to save (will be deep copied).
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
   * Deletes an item from a collection by its ID.
   * @param collection The name of the collection.
   * @param id The unique ID of the item.
   */
  async delete(collection: string, id: string): Promise<void> {
    const collectionMap = this.storage.get(collection);
    if (collectionMap) {
      collectionMap.delete(id);
    }
    return Promise.resolve();
  }

  /**
   * Queries items in a collection based on simple filter options.
   * Note: This is a basic implementation. It only supports exact matches
   * on top-level properties defined in the filter object. It does not
   * support complex queries, sorting, or deep filtering.
   * @param collection The name of the collection.
   * @param filterOptions Filtering options. Only `filter` is partially supported.
   * @returns An array of matching items (deep copies).
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
   * Clears all items from a specific collection.
   * @param collection The name of the collection to clear.
   */
  async clearCollection(collection: string): Promise<void> {
    this.storage.delete(collection);
    return Promise.resolve();
  }

  /**
   * Clears all data managed by the adapter.
   */
  async clearAll(): Promise<void> {
    this.storage.clear();
    return Promise.resolve();
  }
}