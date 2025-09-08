[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / AgentPersona

# Interface: AgentPersona

Defined in: [src/types/index.ts:1672](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1672)

Defines the default identity and high-level guidance for an agent.
This is provided at the instance level and can be overridden by thread or call-specific prompts.

 AgentPersona

## Properties

### name

> **name**: `string`

Defined in: [src/types/index.ts:1678](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1678)

The name or identity of the agent (e.g., "Zoi").
This will be used in the synthesis prompt.

***

### prompts

> **prompts**: [`StageSpecificPrompts`](StageSpecificPrompts.md)

Defined in: [src/types/index.ts:1685](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/types/index.ts#L1685)

The default system prompt that provides high-level guidance.
This serves as the base layer in the system prompt resolution hierarchy.
