[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / LocalProviderConflictError

# Class: LocalProviderConflictError

Defined in: [src/errors.ts:86](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/errors.ts#L86)

Custom error class for ART framework specific errors.

## Extends

- [`ARTError`](ARTError.md)

## Constructors

### Constructor

> **new LocalProviderConflictError**(`requestedProvider`, `activeProvider`): `LocalProviderConflictError`

Defined in: [src/errors.ts:87](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/errors.ts#L87)

#### Parameters

##### requestedProvider

`string`

##### activeProvider

`string`

#### Returns

`LocalProviderConflictError`

#### Overrides

[`ARTError`](ARTError.md).[`constructor`](ARTError.md#constructor)

## Properties

### code

> `readonly` **code**: [`ErrorCode`](../enumerations/ErrorCode.md)

Defined in: [src/errors.ts:54](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/errors.ts#L54)

#### Inherited from

[`ARTError`](ARTError.md).[`code`](ARTError.md#code)

***

### originalError?

> `readonly` `optional` **originalError**: `Error`

Defined in: [src/errors.ts:55](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/errors.ts#L55)

#### Inherited from

[`ARTError`](ARTError.md).[`originalError`](ARTError.md#originalerror)

## Methods

### toString()

> **toString**(): `string`

Defined in: [src/errors.ts:69](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/errors.ts#L69)

Returns a string representation of an object.

#### Returns

`string`

#### Inherited from

[`ARTError`](ARTError.md).[`toString`](ARTError.md#tostring)
