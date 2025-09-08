[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / FilterOptions

# Interface: FilterOptions

Defined in: [src/types/index.ts:1057](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1057)

Options for filtering data retrieved from storage.
Structure depends heavily on the underlying adapter's capabilities.

 FilterOptions

## Properties

### filter?

> `optional` **filter**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:1062](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1062)

An object defining filter criteria (e.g., `{ threadId: 'abc', type: 'TOOL_EXECUTION' }`). Structure may depend on adapter capabilities.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/types/index.ts:1072](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1072)

The maximum number of records to return.

***

### skip?

> `optional` **skip**: `number`

Defined in: [src/types/index.ts:1077](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1077)

The number of records to skip (for pagination).

***

### sort?

> `optional` **sort**: `Record`\<`string`, `"asc"` \| `"desc"`\>

Defined in: [src/types/index.ts:1067](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1067)

An object defining sorting criteria (e.g., `{ timestamp: 'desc' }`).
