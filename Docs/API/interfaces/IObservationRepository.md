[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / IObservationRepository

# Interface: IObservationRepository

Defined in: [core/interfaces.ts:459](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L459)

Repository for managing Observations.

## Methods

### addObservation()

> **addObservation**(`observation`): `Promise`\<`void`\>

Defined in: [core/interfaces.ts:460](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L460)

#### Parameters

##### observation

[`Observation`](Observation.md)

#### Returns

`Promise`\<`void`\>

***

### getObservations()

> **getObservations**(`threadId`, `filter`?): `Promise`\<[`Observation`](Observation.md)[]\>

Defined in: [core/interfaces.ts:461](https://github.com/hashangit/ART/blob/9aeffde50e4be3211a0a8aa9df0277bb227606b0/src/core/interfaces.ts#L461)

#### Parameters

##### threadId

`string`

##### filter?

[`ObservationFilter`](ObservationFilter.md)

#### Returns

`Promise`\<[`Observation`](Observation.md)[]\>
