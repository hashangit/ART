[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / FilterOptions

# Interface: FilterOptions

Defined in: [types/index.ts:318](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L318)

Options for filtering data retrieved from storage.
Structure depends heavily on the underlying adapter's capabilities.

## Properties

### filter?

> `optional` **filter**: `Record`\<`string`, `any`\>

Defined in: [types/index.ts:320](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L320)

An object defining filter criteria (e.g., `{ threadId: 'abc', type: 'TOOL_EXECUTION' }`). Structure may depend on adapter capabilities.

***

### limit?

> `optional` **limit**: `number`

Defined in: [types/index.ts:324](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L324)

The maximum number of records to return.

***

### skip?

> `optional` **skip**: `number`

Defined in: [types/index.ts:326](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L326)

The number of records to skip (for pagination).

***

### sort?

> `optional` **sort**: `Record`\<`string`, `"asc"` \| `"desc"`\>

Defined in: [types/index.ts:322](https://github.com/hashangit/ART/blob/f2c01fe8faa76ca4df3209539d95509aac02e476/src/types/index.ts#L322)

An object defining sorting criteria (e.g., `{ timestamp: 'desc' }`).
