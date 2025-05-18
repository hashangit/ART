[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ObservationFilter

# Interface: ObservationFilter

Defined in: [src/types/index.ts:580](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L580)

Options for filtering observations.

## Properties

### afterTimestamp?

> `optional` **afterTimestamp**: `number`

Defined in: [src/types/index.ts:586](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L586)

Retrieve observations recorded after this Unix timestamp (milliseconds).

***

### beforeTimestamp?

> `optional` **beforeTimestamp**: `number`

Defined in: [src/types/index.ts:584](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L584)

Retrieve observations recorded before this Unix timestamp (milliseconds).

***

### types?

> `optional` **types**: [`ObservationType`](../enumerations/ObservationType.md)[]

Defined in: [src/types/index.ts:582](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/index.ts#L582)

An array of `ObservationType` enums to filter by. If provided, only observations matching these types are returned.
