[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / AuthManager

# Class: AuthManager

Defined in: [src/systems/auth/AuthManager.ts:10](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/auth/AuthManager.ts#L10)

Central authentication manager for handling multiple authentication strategies.
Manages registration and retrieval of different auth strategies for secure connections
to remote services like MCP servers and A2A agents.

## Constructors

### Constructor

> **new AuthManager**(): `AuthManager`

Defined in: [src/systems/auth/AuthManager.ts:13](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/auth/AuthManager.ts#L13)

#### Returns

`AuthManager`

## Methods

### clearAllStrategies()

> **clearAllStrategies**(): `void`

Defined in: [src/systems/auth/AuthManager.ts:95](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/auth/AuthManager.ts#L95)

Clears all registered strategies.
Useful for testing or complete reconfiguration.

#### Returns

`void`

***

### getHeaders()

> **getHeaders**(`strategyId`): `Promise`\<`Record`\<`string`, `string`\>\>

Defined in: [src/systems/auth/AuthManager.ts:42](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/auth/AuthManager.ts#L42)

Retrieves authentication headers from the specified strategy.

#### Parameters

##### strategyId

`string`

The ID of the registered strategy to use

#### Returns

`Promise`\<`Record`\<`string`, `string`\>\>

Promise resolving to authentication headers

#### Throws

If strategy is not found or authentication fails

***

### getRegisteredStrategyIds()

> **getRegisteredStrategyIds**(): `string`[]

Defined in: [src/systems/auth/AuthManager.ts:74](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/auth/AuthManager.ts#L74)

Lists all registered strategy IDs.

#### Returns

`string`[]

Array of registered strategy IDs

***

### handleRedirect()

> **handleRedirect**(`strategyId`): `Promise`\<`void`\>

Defined in: [src/systems/auth/AuthManager.ts:121](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/auth/AuthManager.ts#L121)

Handles the redirect from an OAuth provider.

#### Parameters

##### strategyId

`string`

The ID of the strategy that initiated the redirect.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the redirect has been handled.

#### Throws

If the strategy is not found or does not support handling redirects.

***

### hasStrategy()

> **hasStrategy**(`strategyId`): `boolean`

Defined in: [src/systems/auth/AuthManager.ts:66](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/auth/AuthManager.ts#L66)

Checks if a strategy with the given ID is registered.

#### Parameters

##### strategyId

`string`

The ID to check

#### Returns

`boolean`

True if the strategy exists, false otherwise

***

### isAuthenticated()

> **isAuthenticated**(`strategyId`): `Promise`\<`boolean`\>

Defined in: [src/systems/auth/AuthManager.ts:147](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/auth/AuthManager.ts#L147)

Checks if the user is authenticated with a specific strategy.

#### Parameters

##### strategyId

`string`

The ID of the strategy to check.

#### Returns

`Promise`\<`boolean`\>

A promise that resolves to true if authenticated, false otherwise.

***

### login()

> **login**(`strategyId`): `Promise`\<`void`\>

Defined in: [src/systems/auth/AuthManager.ts:107](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/auth/AuthManager.ts#L107)

Initiates the login flow for a specific strategy.

#### Parameters

##### strategyId

`string`

The ID of the strategy to use for login.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the login process is initiated.

#### Throws

If the strategy is not found or does not support login.

***

### logout()

> **logout**(`strategyId`): `void`

Defined in: [src/systems/auth/AuthManager.ts:134](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/auth/AuthManager.ts#L134)

Logs the user out of a specific strategy.

#### Parameters

##### strategyId

`string`

The ID of the strategy to use for logout.

#### Returns

`void`

#### Throws

If the strategy is not found or does not support logout.

***

### registerStrategy()

> **registerStrategy**(`strategyId`, `strategy`): `void`

Defined in: [src/systems/auth/AuthManager.ts:23](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/auth/AuthManager.ts#L23)

Registers an authentication strategy with the given ID.

#### Parameters

##### strategyId

`string`

Unique identifier for the strategy (e.g., 'default_zyntopia_auth', 'api_key_strategy')

##### strategy

[`IAuthStrategy`](../interfaces/IAuthStrategy.md)

Implementation of IAuthStrategy

#### Returns

`void`

#### Throws

If strategyId is empty or null

***

### removeStrategy()

> **removeStrategy**(`strategyId`): `boolean`

Defined in: [src/systems/auth/AuthManager.ts:83](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/systems/auth/AuthManager.ts#L83)

Removes a registered strategy.

#### Parameters

##### strategyId

`string`

The ID of the strategy to remove

#### Returns

`boolean`

True if strategy was removed, false if it didn't exist
