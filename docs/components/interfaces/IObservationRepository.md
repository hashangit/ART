[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / IObservationRepository

# Interface: IObservationRepository

Defined in: [src/core/interfaces.ts:531](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L531)

Repository for managing Observations.

## Methods

### addObservation()

> **addObservation**(`observation`): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:532](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L532)

#### Parameters

##### observation

[`Observation`](Observation.md)

#### Returns

`Promise`\<`void`\>

***

### getObservations()

> **getObservations**(`threadId`, `filter?`): `Promise`\<[`Observation`](Observation.md)[]\>

Defined in: [src/core/interfaces.ts:533](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/core/interfaces.ts#L533)

#### Parameters

##### threadId

`string`

##### filter?

[`ObservationFilter`](ObservationFilter.md)

#### Returns

`Promise`\<[`Observation`](Observation.md)[]\>
