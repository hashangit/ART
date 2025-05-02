[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / IndexedDBStorageAdapter

# Class: IndexedDBStorageAdapter

Defined in: [adapters/storage/indexedDB.ts:32](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/adapters/storage/indexedDB.ts#L32)

An implementation of the `StorageAdapter` interface that uses the browser's
IndexedDB API for persistent, client-side storage.

This adapter is suitable for web applications where conversation history,
agent state, and observations need to persist across sessions.

**Important:** The `init()` method *must* be called and awaited before performing
any other database operations (get, set, delete, query).

## Implements

## Implements

- [`StorageAdapter`](../interfaces/StorageAdapter.md)

## Constructors

### Constructor

> **new IndexedDBStorageAdapter**(`config`): `IndexedDBStorageAdapter`

Defined in: [adapters/storage/indexedDB.ts:44](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/adapters/storage/indexedDB.ts#L44)

Creates an instance of IndexedDBStorageAdapter.
Note: The database connection is not opened until `init()` is called.

#### Parameters

##### config

`IndexedDBConfig`

Configuration options including database name, version, and required object stores.

#### Returns

`IndexedDBStorageAdapter`

## Methods

### clearAll()

> **clearAll**(): `Promise`\<`void`\>

Defined in: [adapters/storage/indexedDB.ts:418](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/adapters/storage/indexedDB.ts#L418)

Removes all data from all object stores managed by this adapter instance within the database.
Use with caution as this is destructive.

#### Returns

`Promise`\<`void`\>

A promise that resolves when all specified object stores have been cleared.

#### Throws

If the database is not initialized or a transaction error occurs.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`clearAll`](../interfaces/StorageAdapter.md#clearall)

***

### clearCollection()

> **clearCollection**(`collection`): `Promise`\<`void`\>

Defined in: [adapters/storage/indexedDB.ts:385](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/adapters/storage/indexedDB.ts#L385)

Removes all items from a specific object store (collection).

#### Parameters

##### collection

`string`

The name of the object store to clear.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the collection is successfully cleared.

#### Throws

If the database is not initialized, the store doesn't exist, or a database error occurs.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`clearCollection`](../interfaces/StorageAdapter.md#clearcollection)

***

### delete()

> **delete**(`collection`, `id`): `Promise`\<`void`\>

Defined in: [adapters/storage/indexedDB.ts:278](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/adapters/storage/indexedDB.ts#L278)

Deletes an item from the specified object store (collection) by its ID.

#### Parameters

##### collection

`string`

The name of the object store.

##### id

`string`

The ID (key) of the item to delete.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the deletion is successful.

#### Throws

If the database is not initialized, the store doesn't exist, or a database error occurs.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`delete`](../interfaces/StorageAdapter.md#delete)

***

### get()

> **get**\<`T`\>(`collection`, `id`): `Promise`\<`null` \| `T`\>

Defined in: [adapters/storage/indexedDB.ts:185](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/adapters/storage/indexedDB.ts#L185)

Retrieves a single item by its ID from the specified object store (collection).

#### Type Parameters

##### T

`T`

The expected type of the retrieved item.

#### Parameters

##### collection

`string`

The name of the object store.

##### id

`string`

The ID (key) of the item to retrieve.

#### Returns

`Promise`\<`null` \| `T`\>

A promise resolving to a copy of the item if found, or `null` otherwise.

#### Throws

If the database is not initialized, the store doesn't exist, or a database error occurs.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`get`](../interfaces/StorageAdapter.md#get)

***

### init()

> **init**(): `Promise`\<`void`\>

Defined in: [adapters/storage/indexedDB.ts:63](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/adapters/storage/indexedDB.ts#L63)

Opens the IndexedDB database connection and ensures the required object stores
are created or updated based on the configured `dbVersion`.
This method MUST be called and awaited successfully before using other adapter methods.
It handles the `onupgradeneeded` event to create stores.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the database is successfully opened and ready, or rejects on error.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`init`](../interfaces/StorageAdapter.md#init)

***

### query()

> **query**\<`T`\>(`collection`, `filterOptions`): `Promise`\<`T`[]\>

Defined in: [adapters/storage/indexedDB.ts:318](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/adapters/storage/indexedDB.ts#L318)

Queries items within a collection based on provided filter options.
**Note:** This implementation uses `getAll()` and performs filtering, sorting,
and limiting **client-side**. For large datasets, performance may be suboptimal.
A more advanced version would leverage IndexedDB indexes and cursors for
efficient querying directly within the database.
Supports basic exact-match filtering and single-key sorting.

#### Type Parameters

##### T

`T`

The expected type of the items in the collection.

#### Parameters

##### collection

`string`

The name of the object store to query.

##### filterOptions

[`FilterOptions`](../interfaces/FilterOptions.md)

Options for filtering, sorting, skipping, and limiting results.

#### Returns

`Promise`\<`T`[]\>

A promise resolving to an array of deep copies of the matching items.

#### Throws

If the database is not initialized, the store doesn't exist, or a database error occurs.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`query`](../interfaces/StorageAdapter.md#query)

***

### set()

> **set**\<`T`\>(`collection`, `id`, `data`): `Promise`\<`void`\>

Defined in: [adapters/storage/indexedDB.ts:222](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/adapters/storage/indexedDB.ts#L222)

Saves (creates or updates) an item in the specified object store (collection).
Assumes the object store uses 'id' as its keyPath. The `id` parameter provided
should match the `id` property within the `data` object.
Uses `structuredClone` to store a deep copy.

#### Type Parameters

##### T

`T`

The type of the data being saved. Must have an 'id' property.

#### Parameters

##### collection

`string`

The name of the object store.

##### id

`string`

The unique ID of the item (should match `data.id`).

##### data

`T`

The data object to save. Must contain an `id` property matching the `id` parameter.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the data is successfully saved.

#### Throws

If the database is not initialized, the store doesn't exist, data is missing the 'id' property, or a database error occurs.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`set`](../interfaces/StorageAdapter.md#set)
