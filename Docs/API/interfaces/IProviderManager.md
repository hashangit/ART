[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / IProviderManager

# Interface: IProviderManager

Defined in: [types/providers.ts:34](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/providers.ts#L34)

Interface for the ProviderManager

## Methods

### getAdapter()

> **getAdapter**(`config`): `Promise`\<[`ManagedAdapterAccessor`](ManagedAdapterAccessor.md)\>

Defined in: [types/providers.ts:43](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/providers.ts#L43)

Gets a managed adapter instance based on the runtime config.
Handles instance creation, caching, pooling limits, and singleton constraints.
May queue requests or throw errors based on concurrency limits.

#### Parameters

##### config

[`RuntimeProviderConfig`](RuntimeProviderConfig.md)

#### Returns

`Promise`\<[`ManagedAdapterAccessor`](ManagedAdapterAccessor.md)\>

***

### getAvailableProviders()

> **getAvailableProviders**(): `string`[]

Defined in: [types/providers.ts:36](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/providers.ts#L36)

Returns identifiers for all registered potential providers

#### Returns

`string`[]
