[**ART Framework API Reference**](../README.md)

***

[ART Framework API Reference](../README.md) / UnknownProviderError

# Class: UnknownProviderError

Defined in: [src/errors.ts:79](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/errors.ts#L79)

Custom error class for ART framework specific errors.

## Extends

- [`ARTError`](ARTError.md)

## Constructors

### Constructor

> **new UnknownProviderError**(`providerName`): `UnknownProviderError`

Defined in: [src/errors.ts:80](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/errors.ts#L80)

#### Parameters

##### providerName

`string`

#### Returns

`UnknownProviderError`

#### Overrides

[`ARTError`](ARTError.md).[`constructor`](ARTError.md#constructor)

## Properties

### code

> `readonly` **code**: [`ErrorCode`](../enumerations/ErrorCode.md)

Defined in: [src/errors.ts:54](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/errors.ts#L54)

#### Inherited from

[`ARTError`](ARTError.md).[`code`](ARTError.md#code)

***

### originalError?

> `readonly` `optional` **originalError**: `Error`

Defined in: [src/errors.ts:55](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/errors.ts#L55)

#### Inherited from

[`ARTError`](ARTError.md).[`originalError`](ARTError.md#originalerror)

## Methods

### toString()

> **toString**(): `string`

Defined in: [src/errors.ts:69](https://github.com/hashangit/ART/blob/a8524de337702d2ec210d86aff2464ac0aeed73e/src/errors.ts#L69)

Returns a string representation of an object.

#### Returns

`string`

#### Inherited from

[`ARTError`](ARTError.md).[`toString`](ARTError.md#tostring)
