[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / IAuthStrategy

# Interface: IAuthStrategy

Defined in: [src/core/interfaces.ts:638](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L638)

Interface for an authentication strategy that can provide authorization headers.
This enables pluggable security for remote service connections (MCP servers, A2A agents, etc.)

## Methods

### getAuthHeaders()

> **getAuthHeaders**(): `Promise`\<`Record`\<`string`, `string`\>\>

Defined in: [src/core/interfaces.ts:645](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L645)

Asynchronously retrieves the authentication headers.
This might involve checking a cached token, refreshing it if expired, and then returning it.

#### Returns

`Promise`\<`Record`\<`string`, `string`\>\>

A promise that resolves to a record of header keys and values.

#### Throws

If authentication fails or cannot be obtained.

***

### handleRedirect()?

> `optional` **handleRedirect**(): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:651](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L651)

Optional: Handles the redirect from the authentication server.

#### Returns

`Promise`\<`void`\>

***

### isAuthenticated()?

> `optional` **isAuthenticated**(): `Promise`\<`boolean`\>

Defined in: [src/core/interfaces.ts:657](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L657)

Optional: Checks if the user is authenticated.

#### Returns

`Promise`\<`boolean`\>

***

### login()?

> `optional` **login**(): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:648](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L648)

Optional: Initiates the login flow for the strategy.

#### Returns

`Promise`\<`void`\>

***

### logout()?

> `optional` **logout**(): `void`

Defined in: [src/core/interfaces.ts:654](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/core/interfaces.ts#L654)

Optional: Logs the user out.

#### Returns

`void`
