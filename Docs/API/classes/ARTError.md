[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / ARTError

# Class: ARTError

Defined in: [src/errors.ts:53](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/errors.ts#L53)

Custom error class for ART framework specific errors.

## Extends

- `Error`

## Extended by

- [`UnknownProviderError`](UnknownProviderError.md)
- [`LocalProviderConflictError`](LocalProviderConflictError.md)
- [`LocalInstanceBusyError`](LocalInstanceBusyError.md)
- [`ApiQueueTimeoutError`](ApiQueueTimeoutError.md)
- [`AdapterInstantiationError`](AdapterInstantiationError.md)

## Constructors

### Constructor

> **new ARTError**(`message`, `code`, `originalError`?): `ARTError`

Defined in: [src/errors.ts:57](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/errors.ts#L57)

#### Parameters

##### message

`string`

##### code

[`ErrorCode`](../enumerations/ErrorCode.md)

##### originalError?

`Error`

#### Returns

`ARTError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: [`ErrorCode`](../enumerations/ErrorCode.md)

Defined in: [src/errors.ts:54](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/errors.ts#L54)

***

### originalError?

> `readonly` `optional` **originalError**: `Error`

Defined in: [src/errors.ts:55](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/errors.ts#L55)

## Methods

### toString()

> **toString**(): `string`

Defined in: [src/errors.ts:69](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/errors.ts#L69)

Returns a string representation of an object.

#### Returns

`string`
