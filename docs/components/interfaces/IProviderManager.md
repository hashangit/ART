[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / IProviderManager

# Interface: IProviderManager

Defined in: [src/types/providers.ts:98](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/providers.ts#L98)

Interface for the ProviderManager.

 IProviderManager

## Methods

### getAdapter()

> **getAdapter**(`config`): `Promise`\<[`ManagedAdapterAccessor`](ManagedAdapterAccessor.md)\>

Defined in: [src/types/providers.ts:115](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/providers.ts#L115)

Gets a managed adapter instance based on the runtime config.

#### Parameters

##### config

[`RuntimeProviderConfig`](RuntimeProviderConfig.md)

#### Returns

`Promise`\<[`ManagedAdapterAccessor`](ManagedAdapterAccessor.md)\>

#### Remarks

Handles instance creation, caching, pooling limits, and singleton constraints.
May queue requests or throw errors based on concurrency limits.

***

### getAvailableProviders()

> **getAvailableProviders**(): `string`[]

Defined in: [src/types/providers.ts:103](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/providers.ts#L103)

Returns identifiers for all registered potential providers.

#### Returns

`string`[]
