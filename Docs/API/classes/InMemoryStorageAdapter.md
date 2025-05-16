[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / InMemoryStorageAdapter

# Class: InMemoryStorageAdapter

Defined in: [adapters/storage/inMemory.ts:16](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/adapters/storage/inMemory.ts#L16)

An in-memory implementation of the `StorageAdapter` interface.
Stores all data in JavaScript Maps within the current process memory.
Data is **not persisted** and will be lost when the application session ends.

Useful for:
- Unit and integration testing (fast, no external dependencies).
- Simple demos or examples where persistence isn't needed.
- Ephemeral agents that don't require long-term memory.

## Implements

## Implements

- [`StorageAdapter`](../interfaces/StorageAdapter.md)

## Constructors

### Constructor

> **new InMemoryStorageAdapter**(): `InMemoryStorageAdapter`

#### Returns

`InMemoryStorageAdapter`

## Methods

### clearAll()

> **clearAll**(): `Promise`\<`void`\>

Defined in: [adapters/storage/inMemory.ts:139](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/adapters/storage/inMemory.ts#L139)

Removes all collections and all data stored within the adapter instance.
Use with caution, especially during testing.

#### Returns

`Promise`\<`void`\>

A promise that resolves when all data is cleared.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`clearAll`](../interfaces/StorageAdapter.md#clearall)

***

### clearCollection()

> **clearCollection**(`collection`): `Promise`\<`void`\>

Defined in: [adapters/storage/inMemory.ts:129](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/adapters/storage/inMemory.ts#L129)

Removes all items from a specific collection within the in-memory store.

#### Parameters

##### collection

`string`

The name of the collection to clear.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the collection is cleared.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`clearCollection`](../interfaces/StorageAdapter.md#clearcollection)

***

### delete()

> **delete**(`collection`, `id`): `Promise`\<`void`\>

Defined in: [adapters/storage/inMemory.ts:72](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/adapters/storage/inMemory.ts#L72)

Deletes an item from a specified collection using its ID.
If the collection or item does not exist, the operation completes silently.

#### Parameters

##### collection

`string`

The name of the collection.

##### id

`string`

The unique ID of the item to delete.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the deletion attempt is complete.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`delete`](../interfaces/StorageAdapter.md#delete)

***

### get()

> **get**\<`T`\>(`collection`, `id`): `Promise`\<`null` \| `T`\>

Defined in: [adapters/storage/inMemory.ts:36](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/adapters/storage/inMemory.ts#L36)

Retrieves a single item (as a deep copy) from a specified collection by its ID.

#### Type Parameters

##### T

`T`

The expected type of the retrieved item.

#### Parameters

##### collection

`string`

The name of the data collection (e.g., 'messages', 'observations').

##### id

`string`

The unique ID of the item within the collection.

#### Returns

`Promise`\<`null` \| `T`\>

A promise resolving to a deep copy of the item if found, or `null` otherwise.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`get`](../interfaces/StorageAdapter.md#get)

***

### init()

> **init**(`_config`?): `Promise`\<`void`\>

Defined in: [adapters/storage/inMemory.ts:24](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/adapters/storage/inMemory.ts#L24)

Initializes the adapter. This is a no-op for the in-memory adapter.

#### Parameters

##### \_config?

`any`

Optional configuration (ignored by this adapter).

#### Returns

`Promise`\<`void`\>

A promise that resolves immediately.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`init`](../interfaces/StorageAdapter.md#init)

***

### query()

> **query**\<`T`\>(`collection`, `filterOptions`): `Promise`\<`T`[]\>

Defined in: [adapters/storage/inMemory.ts:91](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/adapters/storage/inMemory.ts#L91)

Queries items within a collection based on provided filter options.
**Note:** This in-memory implementation provides basic filtering capabilities:
- Supports exact matches on top-level properties specified in `filterOptions.filter`.
- Supports limiting results via `filterOptions.limit`.
- **Does not** support sorting (`filterOptions.sort`), skipping (`filterOptions.skip`), complex operators (like $gt, $in), or nested property filtering.

#### Type Parameters

##### T

`T`

The expected type of the items in the collection.

#### Parameters

##### collection

`string`

The name of the collection to query.

##### filterOptions

[`FilterOptions`](../interfaces/FilterOptions.md)

Options for filtering and limiting the results.

#### Returns

`Promise`\<`T`[]\>

A promise resolving to an array of deep copies of the matching items.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`query`](../interfaces/StorageAdapter.md#query)

***

### set()

> **set**\<`T`\>(`collection`, `id`, `data`): `Promise`\<`void`\>

Defined in: [adapters/storage/inMemory.ts:55](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/adapters/storage/inMemory.ts#L55)

Saves (creates or updates) an item in a specified collection.
Stores a deep copy of the provided data to prevent external mutations.

#### Type Parameters

##### T

`T`

The type of the data being saved.

#### Parameters

##### collection

`string`

The name of the collection.

##### id

`string`

The unique ID for the item.

##### data

`T`

The data object to save.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the data is saved in memory.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`set`](../interfaces/StorageAdapter.md#set)
