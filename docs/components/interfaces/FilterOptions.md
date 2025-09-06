[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / FilterOptions

# Interface: FilterOptions

Defined in: [src/types/index.ts:1046](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1046)

Options for filtering data retrieved from storage.
Structure depends heavily on the underlying adapter's capabilities.

 FilterOptions

## Properties

### filter?

> `optional` **filter**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:1051](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1051)

An object defining filter criteria (e.g., `{ threadId: 'abc', type: 'TOOL_EXECUTION' }`). Structure may depend on adapter capabilities.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/types/index.ts:1061](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1061)

The maximum number of records to return.

***

### skip?

> `optional` **skip**: `number`

Defined in: [src/types/index.ts:1066](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1066)

The number of records to skip (for pagination).

***

### sort?

> `optional` **sort**: `Record`\<`string`, `"asc"` \| `"desc"`\>

Defined in: [src/types/index.ts:1056](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1056)

An object defining sorting criteria (e.g., `{ timestamp: 'desc' }`).
