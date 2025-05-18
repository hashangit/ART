[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ManagedAdapterAccessor

# Interface: ManagedAdapterAccessor

Defined in: [src/types/providers.ts:28](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/providers.ts#L28)

Object returned by ProviderManager granting access to an adapter instance

## Properties

### adapter

> **adapter**: [`ProviderAdapter`](ProviderAdapter.md)

Defined in: [src/types/providers.ts:29](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/providers.ts#L29)

***

### release()

> **release**: () => `void`

Defined in: [src/types/providers.ts:31](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/types/providers.ts#L31)

Signals that the current call using this adapter instance is finished.

#### Returns

`void`
