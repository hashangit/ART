[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ProviderManagerImpl

# Class: ProviderManagerImpl

Defined in: [src/systems/reasoning/ProviderManagerImpl.ts:35](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/reasoning/ProviderManagerImpl.ts#L35)

Manages the lifecycle and access to multiple ProviderAdapter implementations.

## Implements

- [`IProviderManager`](../interfaces/IProviderManager.md)

## Constructors

### Constructor

> **new ProviderManagerImpl**(`config`): `ProviderManagerImpl`

Defined in: [src/systems/reasoning/ProviderManagerImpl.ts:42](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/reasoning/ProviderManagerImpl.ts#L42)

#### Parameters

##### config

[`ProviderManagerConfig`](../interfaces/ProviderManagerConfig.md)

#### Returns

`ProviderManagerImpl`

## Methods

### getAdapter()

> **getAdapter**(`config`): `Promise`\<[`ManagedAdapterAccessor`](../interfaces/ManagedAdapterAccessor.md)\>

Defined in: [src/systems/reasoning/ProviderManagerImpl.ts:74](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/reasoning/ProviderManagerImpl.ts#L74)

Gets a managed adapter instance based on the runtime config.

#### Parameters

##### config

[`RuntimeProviderConfig`](../interfaces/RuntimeProviderConfig.md)

#### Returns

`Promise`\<[`ManagedAdapterAccessor`](../interfaces/ManagedAdapterAccessor.md)\>

#### Remarks

Handles instance creation, caching, pooling limits, and singleton constraints.
May queue requests or throw errors based on concurrency limits.

#### Implementation of

[`IProviderManager`](../interfaces/IProviderManager.md).[`getAdapter`](../interfaces/IProviderManager.md#getadapter)

***

### getAvailableProviders()

> **getAvailableProviders**(): `string`[]

Defined in: [src/systems/reasoning/ProviderManagerImpl.ts:70](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/systems/reasoning/ProviderManagerImpl.ts#L70)

Returns identifiers for all registered potential providers.

#### Returns

`string`[]

#### Implementation of

[`IProviderManager`](../interfaces/IProviderManager.md).[`getAvailableProviders`](../interfaces/IProviderManager.md#getavailableproviders)
