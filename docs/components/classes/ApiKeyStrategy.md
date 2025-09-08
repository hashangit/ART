[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ApiKeyStrategy

# Class: ApiKeyStrategy

Defined in: [src/auth/ApiKeyStrategy.ts:7](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ApiKeyStrategy.ts#L7)

Simple API key authentication strategy.
Supports configurable header names for different service requirements.

## Implements

- [`IAuthStrategy`](../interfaces/IAuthStrategy.md)

## Constructors

### Constructor

> **new ApiKeyStrategy**(`apiKey`, `headerName`): `ApiKeyStrategy`

Defined in: [src/auth/ApiKeyStrategy.ts:13](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ApiKeyStrategy.ts#L13)

Creates a new API key authentication strategy.

#### Parameters

##### apiKey

`string`

The API key to use for authentication

##### headerName

`string` = `'Authorization'`

The header name to use (defaults to 'Authorization')

#### Returns

`ApiKeyStrategy`

## Methods

### getAuthHeaders()

> **getAuthHeaders**(): `Promise`\<`Record`\<`string`, `string`\>\>

Defined in: [src/auth/ApiKeyStrategy.ts:30](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ApiKeyStrategy.ts#L30)

Generates authentication headers for API key-based authentication.
Uses Bearer token format for Authorization header, plain key for custom headers.

#### Returns

`Promise`\<`Record`\<`string`, `string`\>\>

Promise resolving to authentication headers

#### Implementation of

[`IAuthStrategy`](../interfaces/IAuthStrategy.md).[`getAuthHeaders`](../interfaces/IAuthStrategy.md#getauthheaders)

***

### getHeaderName()

> **getHeaderName**(): `string`

Defined in: [src/auth/ApiKeyStrategy.ts:43](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ApiKeyStrategy.ts#L43)

Gets the configured header name for this strategy.

#### Returns

`string`

The header name that will be used

***

### isUsingAuthorizationHeader()

> **isUsingAuthorizationHeader**(): `boolean`

Defined in: [src/auth/ApiKeyStrategy.ts:51](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ApiKeyStrategy.ts#L51)

Checks if this strategy uses the standard Authorization header.

#### Returns

`boolean`

True if using Authorization header, false for custom headers
