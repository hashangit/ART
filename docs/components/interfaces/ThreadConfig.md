[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ThreadConfig

# Interface: ThreadConfig

Defined in: [src/types/index.ts:552](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L552)

Configuration specific to a conversation thread.

 ThreadConfig

## Properties

### enabledTools

> **enabledTools**: `string`[]

Defined in: [src/types/index.ts:562](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L562)

An array of tool names (matching `ToolSchema.name`) that are permitted for use within this thread.

***

### historyLimit

> **historyLimit**: `number`

Defined in: [src/types/index.ts:567](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L567)

The maximum number of past messages (`ConversationMessage` objects) to retrieve for context.

***

### persona?

> `optional` **persona**: `Partial`\<[`AgentPersona`](AgentPersona.md)\>

Defined in: [src/types/index.ts:578](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L578)

Optional: Defines the identity and high-level guidance for the agent for this specific thread.
This overrides the instance-level persona.

***

### providerConfig

> **providerConfig**: [`RuntimeProviderConfig`](RuntimeProviderConfig.md)

Defined in: [src/types/index.ts:557](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L557)

Default provider configuration for this thread.

***

### systemPrompt?

> `optional` **systemPrompt**: `string` \| [`SystemPromptOverride`](SystemPromptOverride.md)

Defined in: [src/types/index.ts:572](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/index.ts#L572)

Optional system prompt override to be used for this thread, overriding instance or agent defaults.
