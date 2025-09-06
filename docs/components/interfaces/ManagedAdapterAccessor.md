[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ManagedAdapterAccessor

# Interface: ManagedAdapterAccessor

Defined in: [src/types/providers.ts:81](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/providers.ts#L81)

Object returned by ProviderManager granting access to an adapter instance.

 ManagedAdapterAccessor

## Properties

### adapter

> **adapter**: [`ProviderAdapter`](ProviderAdapter.md)

Defined in: [src/types/providers.ts:86](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/providers.ts#L86)

The ready-to-use adapter instance.

***

### release()

> **release**: () => `void`

Defined in: [src/types/providers.ts:91](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/types/providers.ts#L91)

Signals that the current call using this adapter instance is finished.

#### Returns

`void`
