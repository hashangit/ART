[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ProviderManagerConfig

# Interface: ProviderManagerConfig

Defined in: [types/providers.ts:13](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/providers.ts#L13)

Configuration for the ProviderManager passed during ART initialization

## Properties

### apiInstanceIdleTimeoutSeconds?

> `optional` **apiInstanceIdleTimeoutSeconds**: `number`

Defined in: [types/providers.ts:18](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/providers.ts#L18)

Time in seconds an API adapter instance can be idle before being eligible for removal. Default: 300

***

### availableProviders

> **availableProviders**: [`AvailableProviderEntry`](AvailableProviderEntry.md)[]

Defined in: [types/providers.ts:14](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/providers.ts#L14)

***

### maxParallelApiInstancesPerProvider?

> `optional` **maxParallelApiInstancesPerProvider**: `number`

Defined in: [types/providers.ts:16](https://github.com/hashangit/ART/blob/3153790647102134b487bb6168bd208568e6a8ad/src/types/providers.ts#L16)

Max concurrent ACTIVE instances per API-based provider NAME. Default: 5
