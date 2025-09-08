[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / SupabaseStorageAdapter

# Class: SupabaseStorageAdapter

Defined in: [src/integrations/storage/supabase.ts:39](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/storage/supabase.ts#L39)

A Supabase-backed StorageAdapter implementation.

Expectations/assumptions:
- Each collection maps to a table with a primary key column named 'id' (text/uuid).
- We store JSON columns for flexible data where needed. However, repositories
  store fully shaped rows; this adapter just persists and retrieves whole objects.
- For query(), we implement basic equality filters per FilterOptions.filter keys,
  plus limit/skip and a single-key sort.

## Implements

- [`StorageAdapter`](../interfaces/StorageAdapter.md)

## Constructors

### Constructor

> **new SupabaseStorageAdapter**(`config`): `SupabaseStorageAdapter`

Defined in: [src/integrations/storage/supabase.ts:54](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/storage/supabase.ts#L54)

Creates an instance of SupabaseStorageAdapter.

#### Parameters

##### config

`SupabaseConfig`

#### Returns

`SupabaseStorageAdapter`

#### See

SupabaseConfig

## Methods

### clearAll()

> **clearAll**(): `Promise`\<`void`\>

Defined in: [src/integrations/storage/supabase.ts:250](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/storage/supabase.ts#L250)

Clears all items from all collections.

#### Returns

`Promise`\<`void`\>

A promise that resolves when all collections are cleared.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`clearAll`](../interfaces/StorageAdapter.md#clearall)

***

### clearCollection()

> **clearCollection**(`collection`): `Promise`\<`void`\>

Defined in: [src/integrations/storage/supabase.ts:236](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/storage/supabase.ts#L236)

Clears all items from a collection.

#### Parameters

##### collection

`string`

The name of the collection.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the collection is cleared.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`clearCollection`](../interfaces/StorageAdapter.md#clearcollection)

***

### delete()

> **delete**(`collection`, `id`): `Promise`\<`void`\>

Defined in: [src/integrations/storage/supabase.ts:168](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/storage/supabase.ts#L168)

Deletes an item from a collection by its ID.

#### Parameters

##### collection

`string`

The name of the collection.

##### id

`string`

The ID of the item to delete.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item is deleted.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`delete`](../interfaces/StorageAdapter.md#delete)

***

### get()

> **get**\<`T`\>(`collection`, `id`): `Promise`\<`null` \| `T`\>

Defined in: [src/integrations/storage/supabase.ts:121](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/storage/supabase.ts#L121)

Retrieves a single item from a collection by its ID.

#### Type Parameters

##### T

`T`

#### Parameters

##### collection

`string`

The name of the collection.

##### id

`string`

The ID of the item to retrieve.

#### Returns

`Promise`\<`null` \| `T`\>

A promise that resolves with the item, or null if not found.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`get`](../interfaces/StorageAdapter.md#get)

***

### init()

> **init**(): `Promise`\<`void`\>

Defined in: [src/integrations/storage/supabase.ts:76](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/storage/supabase.ts#L76)

Initializes the Supabase client if it hasn't been provided already.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the client is initialized.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`init`](../interfaces/StorageAdapter.md#init)

***

### query()

> **query**\<`T`\>(`collection`, `filterOptions`): `Promise`\<`T`[]\>

Defined in: [src/integrations/storage/supabase.ts:188](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/storage/supabase.ts#L188)

Queries items in a collection.

#### Type Parameters

##### T

`T`

#### Parameters

##### collection

`string`

The name of the collection.

##### filterOptions

[`FilterOptions`](../interfaces/FilterOptions.md)

The options for filtering, sorting, and pagination.

#### Returns

`Promise`\<`T`[]\>

A promise that resolves with an array of items.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`query`](../interfaces/StorageAdapter.md#query)

***

### set()

> **set**\<`T`\>(`collection`, `id`, `data`): `Promise`\<`void`\>

Defined in: [src/integrations/storage/supabase.ts:145](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/integrations/storage/supabase.ts#L145)

Saves (upserts) an item in a collection.

#### Type Parameters

##### T

`T`

#### Parameters

##### collection

`string`

The name of the collection.

##### id

`string`

The ID of the item to save.

##### data

`T`

The data to save.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the item is saved.

#### Implementation of

[`StorageAdapter`](../interfaces/StorageAdapter.md).[`set`](../interfaces/StorageAdapter.md#set)
