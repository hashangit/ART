[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / GenericOAuthStrategy

# ~~Class: GenericOAuthStrategy~~

Defined in: [src/auth/GenericOAuthStrategy.ts:54](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/GenericOAuthStrategy.ts#L54)

Generic OAuth 2.0 authentication strategy with token caching and refresh capabilities.
Supports client credentials flow and authorization code flow with automatic token refresh.

## Deprecated

This strategy is not recommended for browser-based applications as it uses the insecure client_credentials grant type. Please use PKCEOAuthStrategy instead.

## Extended by

- [`ZyntopiaOAuthStrategy`](ZyntopiaOAuthStrategy.md)

## Implements

- [`IAuthStrategy`](../interfaces/IAuthStrategy.md)

## Constructors

### Constructor

> **new GenericOAuthStrategy**(`config`): `GenericOAuthStrategy`

Defined in: [src/auth/GenericOAuthStrategy.ts:63](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/GenericOAuthStrategy.ts#L63)

Creates a new OAuth authentication strategy.

#### Parameters

##### config

[`OAuthConfig`](../interfaces/OAuthConfig.md)

OAuth configuration including endpoints, credentials, and options

#### Returns

`GenericOAuthStrategy`

## Methods

### ~~clearTokenCache()~~

> **clearTokenCache**(): `void`

Defined in: [src/auth/GenericOAuthStrategy.ts:283](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/GenericOAuthStrategy.ts#L283)

Clears the cached token, forcing a new token request on next use.

#### Returns

`void`

***

### ~~getAuthHeaders()~~

> **getAuthHeaders**(): `Promise`\<`Record`\<`string`, `string`\>\>

Defined in: [src/auth/GenericOAuthStrategy.ts:103](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/GenericOAuthStrategy.ts#L103)

Gets authentication headers, automatically handling token refresh if needed.

#### Returns

`Promise`\<`Record`\<`string`, `string`\>\>

A promise that resolves to the authentication headers.

#### Implementation of

[`IAuthStrategy`](../interfaces/IAuthStrategy.md).[`getAuthHeaders`](../interfaces/IAuthStrategy.md#getauthheaders)

***

### ~~getConfig()~~

> **getConfig**(): `Omit`\<[`OAuthConfig`](../interfaces/OAuthConfig.md), `"clientSecret"`\>

Defined in: [src/auth/GenericOAuthStrategy.ts:309](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/GenericOAuthStrategy.ts#L309)

Gets the configured OAuth endpoints and settings.

#### Returns

`Omit`\<[`OAuthConfig`](../interfaces/OAuthConfig.md), `"clientSecret"`\>

Configuration information (excluding sensitive data).

***

### ~~getTokenInfo()~~

> **getTokenInfo**(): `null` \| \{ `expiresAt`: `Date`; `hasRefreshToken`: `boolean`; `scope?`: `string`; \}

Defined in: [src/auth/GenericOAuthStrategy.ts:293](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/GenericOAuthStrategy.ts#L293)

Gets information about the current cached token.

#### Returns

`null` \| \{ `expiresAt`: `Date`; `hasRefreshToken`: `boolean`; `scope?`: `string`; \}

Token information or null if no token is cached.

***

### ~~refreshToken()~~

> **refreshToken**(): `Promise`\<`Record`\<`string`, `string`\>\>

Defined in: [src/auth/GenericOAuthStrategy.ts:273](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/GenericOAuthStrategy.ts#L273)

Manually refreshes the cached token.

#### Returns

`Promise`\<`Record`\<`string`, `string`\>\>

A promise that resolves to new authentication headers.
