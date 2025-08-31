[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ObservationFilter

# Interface: ObservationFilter

Defined in: [src/types/index.ts:1091](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1091)

Options for filtering observations.

 ObservationFilter

## Properties

### afterTimestamp?

> `optional` **afterTimestamp**: `number`

Defined in: [src/types/index.ts:1106](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1106)

Retrieve observations recorded after this Unix timestamp (milliseconds).

***

### beforeTimestamp?

> `optional` **beforeTimestamp**: `number`

Defined in: [src/types/index.ts:1101](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1101)

Retrieve observations recorded before this Unix timestamp (milliseconds).

***

### types?

> `optional` **types**: [`ObservationType`](../enumerations/ObservationType.md)[]

Defined in: [src/types/index.ts:1096](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/types/index.ts#L1096)

An array of `ObservationType` enums to filter by. If provided, only observations matching these types are returned.
