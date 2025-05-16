[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ManagedAdapterAccessor

# Interface: ManagedAdapterAccessor

Defined in: [types/providers.ts:28](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/providers.ts#L28)

Object returned by ProviderManager granting access to an adapter instance

## Properties

### adapter

> **adapter**: [`ProviderAdapter`](ProviderAdapter.md)

Defined in: [types/providers.ts:29](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/providers.ts#L29)

***

### release()

> **release**: () => `void`

Defined in: [types/providers.ts:31](https://github.com/hashangit/ART/blob/0c4f5068c86b5500db1290baa4792d44ebae7f9e/src/types/providers.ts#L31)

Signals that the current call using this adapter instance is finished.

#### Returns

`void`
