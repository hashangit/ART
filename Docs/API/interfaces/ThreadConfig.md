[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ThreadConfig

# Interface: ThreadConfig

Defined in: [types/index.ts:256](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L256)

Configuration specific to a conversation thread.

## Properties

### enabledTools

> **enabledTools**: `string`[]

Defined in: [types/index.ts:260](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L260)

An array of tool names (matching `ToolSchema.name`) that are permitted for use within this thread.

***

### historyLimit

> **historyLimit**: `number`

Defined in: [types/index.ts:262](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L262)

The maximum number of past messages (`ConversationMessage` objects) to retrieve for context.

***

### providerConfig

> **providerConfig**: [`RuntimeProviderConfig`](RuntimeProviderConfig.md)

Defined in: [types/index.ts:258](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L258)

Default provider configuration for this thread.
