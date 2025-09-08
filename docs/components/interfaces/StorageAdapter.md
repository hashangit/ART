[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / StorageAdapter

# Interface: StorageAdapter

Defined in: [src/core/interfaces.ts:493](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L493)

Interface for a storage adapter, providing a generic persistence layer.

## Methods

### clearAll()?

> `optional` **clearAll**(): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:532](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L532)

Optional: Clears all data managed by the adapter. Use with caution!

#### Returns

`Promise`\<`void`\>

***

### clearCollection()?

> `optional` **clearCollection**(`collection`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:529](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L529)

Optional: Clears all items from a specific collection.

#### Parameters

##### collection

`string`

#### Returns

`Promise`\<`void`\>

***

### delete()

> **delete**(`collection`, `id`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:518](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L518)

Deletes an item from a collection by its ID.

#### Parameters

##### collection

`string`

The name of the collection.

##### id

`string`

The unique ID of the item.

#### Returns

`Promise`\<`void`\>

***

### get()

> **get**\<`T`\>(`collection`, `id`): `Promise`\<`null` \| `T`\>

Defined in: [src/core/interfaces.ts:503](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L503)

Retrieves a single item from a collection by its ID.

#### Type Parameters

##### T

`T`

#### Parameters

##### collection

`string`

The name of the data collection (e.g., 'conversations', 'observations').

##### id

`string`

The unique ID of the item.

#### Returns

`Promise`\<`null` \| `T`\>

The item or null if not found.

***

### init()?

> `optional` **init**(`config?`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:495](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L495)

Optional initialization method (e.g., connecting to DB).

#### Parameters

##### config?

`any`

#### Returns

`Promise`\<`void`\>

***

### query()

> **query**\<`T`\>(`collection`, `filterOptions`): `Promise`\<`T`[]\>

Defined in: [src/core/interfaces.ts:526](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L526)

Queries items in a collection based on filter options.

#### Type Parameters

##### T

`T`

#### Parameters

##### collection

`string`

The name of the collection.

##### filterOptions

[`FilterOptions`](FilterOptions.md)

Filtering, sorting, and pagination options.

#### Returns

`Promise`\<`T`[]\>

An array of matching items.

***

### set()

> **set**\<`T`\>(`collection`, `id`, `data`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:511](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L511)

Saves (creates or updates) an item in a collection.

#### Type Parameters

##### T

`T`

#### Parameters

##### collection

`string`

The name of the collection.

##### id

`string`

The unique ID of the item.

##### data

`T`

The data to save.

#### Returns

`Promise`\<`void`\>
