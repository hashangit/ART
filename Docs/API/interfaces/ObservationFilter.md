[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ObservationFilter

# Interface: ObservationFilter

Defined in: [src/types/index.ts:576](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L576)

Options for filtering observations.

## Properties

### afterTimestamp?

> `optional` **afterTimestamp**: `number`

Defined in: [src/types/index.ts:582](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L582)

Retrieve observations recorded after this Unix timestamp (milliseconds).

***

### beforeTimestamp?

> `optional` **beforeTimestamp**: `number`

Defined in: [src/types/index.ts:580](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L580)

Retrieve observations recorded before this Unix timestamp (milliseconds).

***

### types?

> `optional` **types**: [`ObservationType`](../enumerations/ObservationType.md)[]

Defined in: [src/types/index.ts:578](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/types/index.ts#L578)

An array of `ObservationType` enums to filter by. If provided, only observations matching these types are returned.
