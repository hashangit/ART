[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / FilterOptions

# Interface: FilterOptions

Defined in: [types/index.ts:521](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L521)

Options for filtering data retrieved from storage.
Structure depends heavily on the underlying adapter's capabilities.

## Properties

### filter?

> `optional` **filter**: `Record`\<`string`, `any`\>

Defined in: [types/index.ts:523](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L523)

An object defining filter criteria (e.g., `{ threadId: 'abc', type: 'TOOL_EXECUTION' }`). Structure may depend on adapter capabilities.

***

### limit?

> `optional` **limit**: `number`

Defined in: [types/index.ts:527](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L527)

The maximum number of records to return.

***

### skip?

> `optional` **skip**: `number`

Defined in: [types/index.ts:529](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L529)

The number of records to skip (for pagination).

***

### sort?

> `optional` **sort**: `Record`\<`string`, `"asc"` \| `"desc"`\>

Defined in: [types/index.ts:525](https://github.com/hashangit/ART/blob/d99cb328093f6dec701b3289d82d5abbf64a3736/src/types/index.ts#L525)

An object defining sorting criteria (e.g., `{ timestamp: 'desc' }`).
