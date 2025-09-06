[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ARTError

# Class: ARTError

Defined in: [src/errors.ts:130](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/errors.ts#L130)

Custom error class for ART framework specific errors.
It includes an error code, an optional original error for chaining,
and a details object for additional context.

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

> **new ARTError**(`message`, `code`, `originalError?`, `details?`): `ARTError`

Defined in: [src/errors.ts:145](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/errors.ts#L145)

Creates an instance of ARTError.

#### Parameters

##### message

`string`

The error message.

##### code

[`ErrorCode`](../enumerations/ErrorCode.md)

The error code.

##### originalError?

`Error`

The original error, if any.

##### details?

`Record`\<`string`, `any`\> = `{}`

Additional details about the error.

#### Returns

`ARTError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: [`ErrorCode`](../enumerations/ErrorCode.md)

Defined in: [src/errors.ts:132](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/errors.ts#L132)

The specific error code from the ErrorCode enum.

***

### details

> **details**: `Record`\<`string`, `any`\>

Defined in: [src/errors.ts:136](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/errors.ts#L136)

A record of additional details about the error.

***

### originalError?

> `readonly` `optional` **originalError**: `Error`

Defined in: [src/errors.ts:134](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/errors.ts#L134)

The original error that caused this error, if any.

## Methods

### toString()

> **toString**(): `string`

Defined in: [src/errors.ts:162](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/errors.ts#L162)

Returns a string representation of the error, including the original error if present.

#### Returns

`string`

The string representation of the error.
