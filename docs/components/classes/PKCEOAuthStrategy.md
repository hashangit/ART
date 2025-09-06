[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / PKCEOAuthStrategy

# Class: PKCEOAuthStrategy

Defined in: [src/auth/PKCEOAuthStrategy.ts:37](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/auth/PKCEOAuthStrategy.ts#L37)

Implements the OAuth 2.0 Authorization Code Flow with PKCE (Proof Key for Code Exchange).
This is the recommended, most secure method for authenticating users in browser-based applications.

## Implements

- [`IAuthStrategy`](../interfaces/IAuthStrategy.md)

## Constructors

### Constructor

> **new PKCEOAuthStrategy**(`config`): `PKCEOAuthStrategy`

Defined in: [src/auth/PKCEOAuthStrategy.ts:48](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/auth/PKCEOAuthStrategy.ts#L48)

Creates an instance of PKCEOAuthStrategy.

#### Parameters

##### config

[`PKCEOAuthConfig`](../interfaces/PKCEOAuthConfig.md)

The configuration for the PKCE OAuth 2.0 strategy.

#### Returns

`PKCEOAuthStrategy`

## Methods

### getAuthHeaders()

> **getAuthHeaders**(): `Promise`\<`Record`\<`string`, `string`\>\>

Defined in: [src/auth/PKCEOAuthStrategy.ts:199](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/auth/PKCEOAuthStrategy.ts#L199)

Gets the authentication headers, automatically handling token refresh if needed.

#### Returns

`Promise`\<`Record`\<`string`, `string`\>\>

A promise that resolves to the authentication headers.

#### Implementation of

[`IAuthStrategy`](../interfaces/IAuthStrategy.md).[`getAuthHeaders`](../interfaces/IAuthStrategy.md#getauthheaders)

***

### handleRedirect()

> **handleRedirect**(): `Promise`\<`void`\>

Defined in: [src/auth/PKCEOAuthStrategy.ts:141](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/auth/PKCEOAuthStrategy.ts#L141)

Handles the redirect from the authorization server.
This method should be called on the redirect URI page.
It exchanges the authorization code for an access token.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the redirect has been handled.

#### Implementation of

[`IAuthStrategy`](../interfaces/IAuthStrategy.md).[`handleRedirect`](../interfaces/IAuthStrategy.md#handleredirect)

***

### isAuthenticated()

> **isAuthenticated**(): `Promise`\<`boolean`\>

Defined in: [src/auth/PKCEOAuthStrategy.ts:227](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/auth/PKCEOAuthStrategy.ts#L227)

Checks if there is a valid, non-expired token.

#### Returns

`Promise`\<`boolean`\>

A promise that resolves to true if the token is valid, false otherwise.

#### Implementation of

[`IAuthStrategy`](../interfaces/IAuthStrategy.md).[`isAuthenticated`](../interfaces/IAuthStrategy.md#isauthenticated)

***

### login()

> **login**(): `Promise`\<`void`\>

Defined in: [src/auth/PKCEOAuthStrategy.ts:82](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/auth/PKCEOAuthStrategy.ts#L82)

Initiates the PKCE login flow by redirecting the user to the authorization endpoint.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the login process is complete.

#### Implementation of

[`IAuthStrategy`](../interfaces/IAuthStrategy.md).[`login`](../interfaces/IAuthStrategy.md#login)

***

### logout()

> **logout**(): `void`

Defined in: [src/auth/PKCEOAuthStrategy.ts:217](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/auth/PKCEOAuthStrategy.ts#L217)

Clears the cached token.

#### Returns

`void`

#### Implementation of

[`IAuthStrategy`](../interfaces/IAuthStrategy.md).[`logout`](../interfaces/IAuthStrategy.md#logout)
