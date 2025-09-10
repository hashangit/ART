import { StorageAdapter } from '@/core/interfaces';
import { FilterOptions } from '@/types';
import { Logger } from '@/utils/logger';

export interface SupabaseConfig {
  /** Supabase project URL, e.g., https://xyzcompany.supabase.co */
  url: string;
  /** Supabase anon or service key. Prefer service key on server-side only. */
  apiKey: string;
  /** Optional schema name (default 'public'). */
  schema?: string;
  /**
   * Table names to use. These map ART collections to Supabase.
   * If you customize collection names in repositories, adjust accordingly.
   */
  tables?: {
    conversations?: string;
    observations?: string;
    state?: string;
    a2a_tasks?: string;
  };
  /**
   * Optional: pass a pre-initialized Supabase client (from @supabase/supabase-js)
   * Useful in environments where you already manage the client and auth.
   */
  client?: any;
}

/**
 * A Supabase-backed StorageAdapter implementation.
 *
 * Expectations/assumptions:
 * - Each collection maps to a table with a primary key column named 'id' (text/uuid).
 * - We store JSON columns for flexible data where needed. However, repositories
 *   store fully shaped rows; this adapter just persists and retrieves whole objects.
 * - For query(), we implement basic equality filters per FilterOptions.filter keys,
 *   plus limit/skip and a single-key sort.
 */
export class SupabaseStorageAdapter implements StorageAdapter {
  private client: any | null = null;
  private config!: SupabaseConfig;
  private schema: string = 'public';
  private tables = {
    conversations: 'conversations',
    observations: 'observations',
    state: 'state',
    a2a_tasks: 'a2a_tasks',
  };

  /**
   * Creates an instance of SupabaseStorageAdapter.
   * @see SupabaseConfig
   */
  constructor(config: SupabaseConfig) {
    this.configure(config);
  }

  /**
   * Configures the adapter with the provided Supabase settings.
   * @private
   * @param {SupabaseConfig} config - The configuration for the adapter.
   */
  private configure(config: SupabaseConfig) {
    this.config = config;
    if (config.schema) this.schema = config.schema;
    if (config.tables) {
      this.tables = { ...this.tables, ...config.tables };
    }
    this.client = config.client ?? null;
  }

  /**
   * Initializes the Supabase client if it hasn't been provided already.
   * @returns {Promise<void>} A promise that resolves when the client is initialized.
   */
  async init(): Promise<void> {
    if (this.client) return; // Already provided
    try {
      // Lazy import to avoid bundling if unused
      const { createClient } = await import('@supabase/supabase-js');
      this.client = createClient(this.config.url, this.config.apiKey, {
        db: { schema: this.schema },
        auth: { persistSession: false },
      });
      Logger.info('SupabaseStorageAdapter: Client initialized.');
    } catch (err: any) {
      Logger.error('SupabaseStorageAdapter: Failed to initialize client', err);
      throw err;
    }
  }

  /**
   * Maps a collection name to a Supabase table name.
   * @private
   * @param {string} collection - The name of the collection.
   * @returns {string} The name of the Supabase table.
   */
  private tableForCollection(collection: string): string {
    // Allow direct pass-through for custom collections; otherwise map known ones
    switch (collection) {
      case 'conversations':
        return this.tables.conversations;
      case 'observations':
        return this.tables.observations;
      case 'state':
        return this.tables.state;
      case 'a2a_tasks':
        return this.tables.a2a_tasks;
      default:
        return collection; // Use collection name as-is for custom use
    }
  }

  /**
   * Retrieves a single item from a collection by its ID.
   * @template T
   * @param {string} collection - The name of the collection.
   * @param {string} id - The ID of the item to retrieve.
   * @returns {Promise<T | null>} A promise that resolves with the item, or null if not found.
   */
  async get<T>(collection: string, id: string): Promise<T | null> {
    await this.init();
    const table = this.tableForCollection(collection);
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (error) {
      Logger.error(`SupabaseStorageAdapter: get error for ${table}/${id}`, error);
      throw new Error(error.message);
    }
    return (data ? { ...data } : null) as T | null;
  }

  /**
   * Saves (upserts) an item in a collection.
   * @template T
   * @param {string} collection - The name of the collection.
   * @param {string} id - The ID of the item to save.
   * @param {T} data - The data to save.
   * @returns {Promise<void>} A promise that resolves when the item is saved.
   */
  async set<T>(collection: string, id: string, data: T): Promise<void> {
    await this.init();
    const table = this.tableForCollection(collection);
    const row: any = { ...(data as any) };
    if (typeof row.id === 'undefined') {
      throw new Error(`SupabaseStorageAdapter: Data for collection '${collection}' must have an 'id' property.`);
    }
    // Upsert by primary key 'id'
    const { error } = await this.client
      .from(table)
      .upsert(row, { onConflict: 'id' });
    if (error) {
      Logger.error(`SupabaseStorageAdapter: set error for ${table}/${id}`, error);
      throw new Error(error.message);
    }
  }

  /**
   * Deletes an item from a collection by its ID.
   * @param {string} collection - The name of the collection.
   * @param {string} id - The ID of the item to delete.
   * @returns {Promise<void>} A promise that resolves when the item is deleted.
   */
  async delete(collection: string, id: string): Promise<void> {
    await this.init();
    const table = this.tableForCollection(collection);
    const { error } = await this.client
      .from(table)
      .delete()
      .eq('id', id);
    if (error) {
      Logger.error(`SupabaseStorageAdapter: delete error for ${table}/${id}`, error);
      throw new Error(error.message);
    }
  }

  /**
   * Queries items in a collection.
   * @template T
   * @param {string} collection - The name of the collection.
   * @param {FilterOptions} filterOptions - The options for filtering, sorting, and pagination.
   * @returns {Promise<T[]>} A promise that resolves with an array of items.
   */
  async query<T>(collection: string, filterOptions: FilterOptions): Promise<T[]> {
    await this.init();
    const table = this.tableForCollection(collection);
    let query = this.client.from(table).select('*');

    // Basic equality filters: key = value
    if (filterOptions?.filter) {
      for (const [key, value] of Object.entries(filterOptions.filter)) {
        // For array filter, use 'in'
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }
    }

    // Sorting: single key supported (choose first)
    if (filterOptions?.sort) {
      const [sortKey, sortDir] = Object.entries(filterOptions.sort)[0] || [];
      if (sortKey) {
        query = query.order(sortKey, { ascending: sortDir === 'asc' });
      }
    }

    // Pagination
    const skip = filterOptions?.skip || 0;
    const limit = filterOptions?.limit ?? null;
    if (limit !== null && limit >= 0) {
      query = query.range(skip, skip + Math.max(0, limit) - 1);
    } else if (skip > 0) {
      // Supabase requires a range; if only skip is provided without limit, we pick a large window
      query = query.range(skip, skip + 9999);
    }

    const { data, error } = await query;
    if (error) {
      Logger.error(`SupabaseStorageAdapter: query error for ${table}`, error);
      throw new Error(error.message);
    }
    return (data ?? []).map((row: any) => ({ ...row })) as T[];
  }

  /**
   * Clears all items from a collection.
   * @param {string} collection - The name of the collection.
   * @returns {Promise<void>} A promise that resolves when the collection is cleared.
   */
  async clearCollection(collection: string): Promise<void> {
    await this.init();
    const table = this.tableForCollection(collection);
    const { error } = await this.client.from(table).delete().neq('id', null);
    if (error) {
      Logger.error(`SupabaseStorageAdapter: clearCollection error for ${table}`, error);
      throw new Error(error.message);
    }
  }

  /**
   * Clears all items from all collections.
   * @returns {Promise<void>} A promise that resolves when all collections are cleared.
   */
  async clearAll(): Promise<void> {
    await this.init();
    const tables = Object.values(this.tables);
    for (const table of tables) {
      const { error } = await this.client.from(table).delete().neq('id', null);
      if (error) {
        Logger.error(`SupabaseStorageAdapter: clearAll error for ${table}`, error);
        throw new Error(error.message);
      }
    }
  }
}


