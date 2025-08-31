[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / FilterOptions

# Interface: FilterOptions

Defined in: [src/types/index.ts:1034](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1034)

Options for filtering data retrieved from storage.
Structure depends heavily on the underlying adapter's capabilities.

 FilterOptions

## Properties

### filter?

> `optional` **filter**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:1039](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1039)

An object defining filter criteria (e.g., `{ threadId: 'abc', type: 'TOOL_EXECUTION' }`). Structure may depend on adapter capabilities.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/types/index.ts:1049](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1049)

The maximum number of records to return.

***

### skip?

> `optional` **skip**: `number`

Defined in: [src/types/index.ts:1054](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1054)

The number of records to skip (for pagination).

***

### sort?

> `optional` **sort**: `Record`\<`string`, `"asc"` \| `"desc"`\>

Defined in: [src/types/index.ts:1044](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1044)

An object defining sorting criteria (e.g., `{ timestamp: 'desc' }`).
