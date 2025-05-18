[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / FilterOptions

# Interface: FilterOptions

Defined in: [src/types/index.ts:551](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L551)

Options for filtering data retrieved from storage.
Structure depends heavily on the underlying adapter's capabilities.

## Properties

### filter?

> `optional` **filter**: `Record`\<`string`, `any`\>

Defined in: [src/types/index.ts:553](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L553)

An object defining filter criteria (e.g., `{ threadId: 'abc', type: 'TOOL_EXECUTION' }`). Structure may depend on adapter capabilities.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/types/index.ts:557](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L557)

The maximum number of records to return.

***

### skip?

> `optional` **skip**: `number`

Defined in: [src/types/index.ts:559](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L559)

The number of records to skip (for pagination).

***

### sort?

> `optional` **sort**: `Record`\<`string`, `"asc"` \| `"desc"`\>

Defined in: [src/types/index.ts:555](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L555)

An object defining sorting criteria (e.g., `{ timestamp: 'desc' }`).
