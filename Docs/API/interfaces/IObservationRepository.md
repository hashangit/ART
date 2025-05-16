[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / IObservationRepository

# Interface: IObservationRepository

Defined in: [core/interfaces.ts:447](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/core/interfaces.ts#L447)

Repository for managing Observations.

## Methods

### addObservation()

> **addObservation**(`observation`): `Promise`\<`void`\>

Defined in: [core/interfaces.ts:448](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/core/interfaces.ts#L448)

#### Parameters

##### observation

[`Observation`](Observation.md)

#### Returns

`Promise`\<`void`\>

***

### getObservations()

> **getObservations**(`threadId`, `filter`?): `Promise`\<[`Observation`](Observation.md)[]\>

Defined in: [core/interfaces.ts:449](https://github.com/hashangit/ART/blob/0d5679913e70f07ec60f00c1f87b53a5f0bf6ddf/src/core/interfaces.ts#L449)

#### Parameters

##### threadId

`string`

##### filter?

[`ObservationFilter`](ObservationFilter.md)

#### Returns

`Promise`\<[`Observation`](Observation.md)[]\>
