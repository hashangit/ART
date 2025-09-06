[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / IAuthStrategy

# Interface: IAuthStrategy

Defined in: [src/core/interfaces.ts:623](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L623)

Interface for an authentication strategy that can provide authorization headers.
This enables pluggable security for remote service connections (MCP servers, A2A agents, etc.)

## Methods

### getAuthHeaders()

> **getAuthHeaders**(): `Promise`\<`Record`\<`string`, `string`\>\>

Defined in: [src/core/interfaces.ts:630](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L630)

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

Defined in: [src/core/interfaces.ts:636](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L636)

Optional: Handles the redirect from the authentication server.

#### Returns

`Promise`\<`void`\>

***

### isAuthenticated()?

> `optional` **isAuthenticated**(): `Promise`\<`boolean`\>

Defined in: [src/core/interfaces.ts:642](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L642)

Optional: Checks if the user is authenticated.

#### Returns

`Promise`\<`boolean`\>

***

### login()?

> `optional` **login**(): `Promise`\<`void`\>

Defined in: [src/core/interfaces.ts:633](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L633)

Optional: Initiates the login flow for the strategy.

#### Returns

`Promise`\<`void`\>

***

### logout()?

> `optional` **logout**(): `void`

Defined in: [src/core/interfaces.ts:639](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/core/interfaces.ts#L639)

Optional: Logs the user out.

#### Returns

`void`
