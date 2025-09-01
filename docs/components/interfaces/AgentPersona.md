[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / AgentPersona

# Interface: AgentPersona

Defined in: [src/types/index.ts:1661](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1661)

Defines the default identity and high-level guidance for an agent.
This is provided at the instance level and can be overridden by thread or call-specific prompts.

 AgentPersona

## Properties

### name

> **name**: `string`

Defined in: [src/types/index.ts:1667](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1667)

The name or identity of the agent (e.g., "Zoi").
This will be used in the synthesis prompt.

***

### prompts

> **prompts**: [`StageSpecificPrompts`](StageSpecificPrompts.md)

Defined in: [src/types/index.ts:1674](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/types/index.ts#L1674)

The default system prompt that provides high-level guidance.
This serves as the base layer in the system prompt resolution hierarchy.
