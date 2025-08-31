[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / IndexedDBConfig

# Interface: IndexedDBConfig

Defined in: [src/integrations/storage/indexedDB.ts:12](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/storage/indexedDB.ts#L12)

Configuration options for initializing the `IndexedDBStorageAdapter`.

## Properties

### dbName?

> `optional` **dbName**: `string`

Defined in: [src/integrations/storage/indexedDB.ts:14](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/storage/indexedDB.ts#L14)

The name of the IndexedDB database to use. Defaults to 'ART_Framework_DB'.

***

### dbVersion?

> `optional` **dbVersion**: `number`

Defined in: [src/integrations/storage/indexedDB.ts:16](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/storage/indexedDB.ts#L16)

The version of the database schema. Increment this when changing `objectStores` or indexes to trigger an upgrade. Defaults to 1.

***

### objectStores

> **objectStores**: `string`[]

Defined in: [src/integrations/storage/indexedDB.ts:18](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/integrations/storage/indexedDB.ts#L18)

An array of strings specifying the names of the object stores (collections) required by the application. Core stores like 'conversations', 'observations', 'state' are usually added automatically.
