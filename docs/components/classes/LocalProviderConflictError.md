[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / LocalProviderConflictError

# Class: LocalProviderConflictError

Defined in: [src/errors.ts:184](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L184)

Error thrown when attempting to activate a local provider while another is already active.

## Extends

- [`ARTError`](ARTError.md)

## Constructors

### Constructor

> **new LocalProviderConflictError**(`requestedProvider`, `activeProvider`): `LocalProviderConflictError`

Defined in: [src/errors.ts:185](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L185)

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

Defined in: [src/errors.ts:132](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L132)

The specific error code from the ErrorCode enum.

#### Inherited from

[`ARTError`](ARTError.md).[`code`](ARTError.md#code)

***

### details

> **details**: `Record`\<`string`, `any`\>

Defined in: [src/errors.ts:136](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L136)

A record of additional details about the error.

#### Inherited from

[`ARTError`](ARTError.md).[`details`](ARTError.md#details)

***

### originalError?

> `readonly` `optional` **originalError**: `Error`

Defined in: [src/errors.ts:134](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L134)

The original error that caused this error, if any.

#### Inherited from

[`ARTError`](ARTError.md).[`originalError`](ARTError.md#originalerror)

## Methods

### toString()

> **toString**(): `string`

Defined in: [src/errors.ts:162](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/errors.ts#L162)

Returns a string representation of the error, including the original error if present.

#### Returns

`string`

The string representation of the error.

#### Inherited from

[`ARTError`](ARTError.md).[`toString`](ARTError.md#tostring)
