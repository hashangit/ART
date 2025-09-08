[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / SystemPromptResolver

# Interface: SystemPromptResolver

Defined in: [src/core/interfaces.ts:133](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L133)

Resolves the final system prompt from base + instance/thread/call overrides
using tag+variables and merge strategies.

## Methods

### resolve()

> **resolve**(`input`, `traceId?`): `Promise`\<`string`\>

Defined in: [src/core/interfaces.ts:134](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L134)

#### Parameters

##### input

###### base

`string`

###### call?

`string` \| [`SystemPromptOverride`](SystemPromptOverride.md)

###### instance?

`string` \| [`SystemPromptOverride`](SystemPromptOverride.md)

###### thread?

`string` \| [`SystemPromptOverride`](SystemPromptOverride.md)

##### traceId?

`string`

#### Returns

`Promise`\<`string`\>
