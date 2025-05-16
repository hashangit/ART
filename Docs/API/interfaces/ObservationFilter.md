[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ObservationFilter

# Interface: ObservationFilter

Defined in: [types/index.ts:550](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L550)

Options for filtering observations.

## Properties

### afterTimestamp?

> `optional` **afterTimestamp**: `number`

Defined in: [types/index.ts:556](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L556)

Retrieve observations recorded after this Unix timestamp (milliseconds).

***

### beforeTimestamp?

> `optional` **beforeTimestamp**: `number`

Defined in: [types/index.ts:554](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L554)

Retrieve observations recorded before this Unix timestamp (milliseconds).

***

### types?

> `optional` **types**: [`ObservationType`](../enumerations/ObservationType.md)[]

Defined in: [types/index.ts:552](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/index.ts#L552)

An array of `ObservationType` enums to filter by. If provided, only observations matching these types are returned.
