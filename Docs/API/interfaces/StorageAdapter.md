[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / StorageAdapter

# Interface: StorageAdapter

Defined in: [core/interfaces.ts:394](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/core/interfaces.ts#L394)

Interface for a storage adapter, providing a generic persistence layer.

## Methods

### clearAll()?

> `optional` **clearAll**(): `Promise`\<`void`\>

Defined in: [core/interfaces.ts:433](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/core/interfaces.ts#L433)

Optional: Clears all data managed by the adapter. Use with caution!

#### Returns

`Promise`\<`void`\>

***

### clearCollection()?

> `optional` **clearCollection**(`collection`): `Promise`\<`void`\>

Defined in: [core/interfaces.ts:430](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/core/interfaces.ts#L430)

Optional: Clears all items from a specific collection.

#### Parameters

##### collection

`string`

#### Returns

`Promise`\<`void`\>

***

### delete()

> **delete**(`collection`, `id`): `Promise`\<`void`\>

Defined in: [core/interfaces.ts:419](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/core/interfaces.ts#L419)

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

Defined in: [core/interfaces.ts:404](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/core/interfaces.ts#L404)

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

> `optional` **init**(`config`?): `Promise`\<`void`\>

Defined in: [core/interfaces.ts:396](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/core/interfaces.ts#L396)

Optional initialization method (e.g., connecting to DB).

#### Parameters

##### config?

`any`

#### Returns

`Promise`\<`void`\>

***

### query()

> **query**\<`T`\>(`collection`, `filterOptions`): `Promise`\<`T`[]\>

Defined in: [core/interfaces.ts:427](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/core/interfaces.ts#L427)

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

Defined in: [core/interfaces.ts:412](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/core/interfaces.ts#L412)

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
