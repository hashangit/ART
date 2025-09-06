[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / StorageAdapter

# Interface: StorageAdapter

Defined in: [src/core/interfaces.ts:478](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L478)

Interface for a storage adapter, providing a generic persistence layer.

## Methods

### clearAll()?

> `optional` **clearAll**(): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:517](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L517)

Optional: Clears all data managed by the adapter. Use with caution!

#### Returns

`Promise`\<`void`\>

***

### clearCollection()?

> `optional` **clearCollection**(`collection`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:514](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L514)

Optional: Clears all items from a specific collection.

#### Parameters

##### collection

`string`

#### Returns

`Promise`\<`void`\>

***

### delete()

> **delete**(`collection`, `id`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:503](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L503)

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

Defined in: [src/core/interfaces.ts:488](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L488)

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

Defined in: [src/core/interfaces.ts:480](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L480)

Optional initialization method (e.g., connecting to DB).

#### Parameters

##### config?

`any`

#### Returns

`Promise`\<`void`\>

***

### query()

> **query**\<`T`\>(`collection`, `filterOptions`): `Promise`\<`T`[]\>

Defined in: [src/core/interfaces.ts:511](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L511)

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

Defined in: [src/core/interfaces.ts:496](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L496)

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
