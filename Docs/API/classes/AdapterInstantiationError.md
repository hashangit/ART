[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / AdapterInstantiationError

# Class: AdapterInstantiationError

Defined in: [src/errors.ts:107](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/errors.ts#L107)

Custom error class for ART framework specific errors.

## Extends

- [`ARTError`](ARTError.md)

## Constructors

### Constructor

> **new AdapterInstantiationError**(`providerName`, `originalError`): `AdapterInstantiationError`

Defined in: [src/errors.ts:108](https://github.com/hashangit/ART/blob/13d06b82b833201787abcae252aaec8212ec73f7/src/errors.ts#L108)

#### Parameters

##### providerName

`string`

##### originalError

`Error`

#### Returns

`AdapterInstantiationError`

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
