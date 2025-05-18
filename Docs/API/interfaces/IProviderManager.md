[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / IProviderManager

# Interface: IProviderManager

Defined in: [src/types/providers.ts:34](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/providers.ts#L34)

Interface for the ProviderManager

## Methods

### getAdapter()

> **getAdapter**(`config`): `Promise`\<[`ManagedAdapterAccessor`](ManagedAdapterAccessor.md)\>

Defined in: [src/types/providers.ts:43](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/providers.ts#L43)

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

Defined in: [src/types/providers.ts:36](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/providers.ts#L36)

Returns identifiers for all registered potential providers

#### Returns

`string`[]
