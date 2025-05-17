[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ObservationFilter

# Interface: ObservationFilter

Defined in: [types/index.ts:558](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L558)

Options for filtering observations.

## Properties

### afterTimestamp?

> `optional` **afterTimestamp**: `number`

Defined in: [types/index.ts:564](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L564)

Retrieve observations recorded after this Unix timestamp (milliseconds).

***

### beforeTimestamp?

> `optional` **beforeTimestamp**: `number`

Defined in: [types/index.ts:562](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L562)

Retrieve observations recorded before this Unix timestamp (milliseconds).

***

### types?

> `optional` **types**: [`ObservationType`](../enumerations/ObservationType.md)[]

Defined in: [types/index.ts:560](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/types/index.ts#L560)

An array of `ObservationType` enums to filter by. If provided, only observations matching these types are returned.
