[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / ZyntopiaOAuthStrategy

# Class: ZyntopiaOAuthStrategy

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:31](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ZyntopiaOAuthStrategy.ts#L31)

Zyntopia-specific OAuth 2.0 authentication strategy.
Pre-configured for Zyntopia services with standard endpoints, scopes, and authentication flows.
Extends GenericOAuthStrategy with Zyntopia-specific defaults and configurations.

## Extends

- [`GenericOAuthStrategy`](GenericOAuthStrategy.md)

## Constructors

### Constructor

> **new ZyntopiaOAuthStrategy**(`config`): `ZyntopiaOAuthStrategy`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:50](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ZyntopiaOAuthStrategy.ts#L50)

Creates a new Zyntopia OAuth authentication strategy.

#### Parameters

##### config

[`ZyntopiaOAuthConfig`](../interfaces/ZyntopiaOAuthConfig.md)

Zyntopia-specific OAuth configuration

#### Returns

`ZyntopiaOAuthStrategy`

#### Overrides

[`GenericOAuthStrategy`](GenericOAuthStrategy.md).[`constructor`](GenericOAuthStrategy.md#constructor)

## Methods

### clearTokenCache()

> **clearTokenCache**(): `void`

Defined in: [src/auth/GenericOAuthStrategy.ts:283](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/GenericOAuthStrategy.ts#L283)

Clears the cached token, forcing a new token request on next use.

#### Returns

`void`

#### Inherited from

[`GenericOAuthStrategy`](GenericOAuthStrategy.md).[`clearTokenCache`](GenericOAuthStrategy.md#cleartokencache)

***

### getAuthHeaders()

> **getAuthHeaders**(): `Promise`\<`Record`\<`string`, `string`\>\>

Defined in: [src/auth/GenericOAuthStrategy.ts:103](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/GenericOAuthStrategy.ts#L103)

Gets authentication headers, automatically handling token refresh if needed.

#### Returns

`Promise`\<`Record`\<`string`, `string`\>\>

A promise that resolves to the authentication headers.

#### Inherited from

[`GenericOAuthStrategy`](GenericOAuthStrategy.md).[`getAuthHeaders`](GenericOAuthStrategy.md#getauthheaders)

***

### getConfig()

> **getConfig**(): `Omit`\<[`OAuthConfig`](../interfaces/OAuthConfig.md), `"clientSecret"`\>

Defined in: [src/auth/GenericOAuthStrategy.ts:309](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/GenericOAuthStrategy.ts#L309)

Gets the configured OAuth endpoints and settings.

#### Returns

`Omit`\<[`OAuthConfig`](../interfaces/OAuthConfig.md), `"clientSecret"`\>

Configuration information (excluding sensitive data).

#### Inherited from

[`GenericOAuthStrategy`](GenericOAuthStrategy.md).[`getConfig`](GenericOAuthStrategy.md#getconfig)

***

### getEnvironment()

> **getEnvironment**(): `"production"` \| `"staging"` \| `"development"`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:113](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ZyntopiaOAuthStrategy.ts#L113)

Gets the current environment this strategy is configured for.

#### Returns

`"production"` \| `"staging"` \| `"development"`

The environment ('production', 'staging', or 'development').

***

### getTokenInfo()

> **getTokenInfo**(): `null` \| \{ `expiresAt`: `Date`; `hasRefreshToken`: `boolean`; `scope?`: `string`; \}

Defined in: [src/auth/GenericOAuthStrategy.ts:293](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/GenericOAuthStrategy.ts#L293)

Gets information about the current cached token.

#### Returns

`null` \| \{ `expiresAt`: `Date`; `hasRefreshToken`: `boolean`; `scope?`: `string`; \}

Token information or null if no token is cached.

#### Inherited from

[`GenericOAuthStrategy`](GenericOAuthStrategy.md).[`getTokenInfo`](GenericOAuthStrategy.md#gettokeninfo)

***

### getZyntopiaConfig()

> **getZyntopiaConfig**(): `Omit`\<[`ZyntopiaOAuthConfig`](../interfaces/ZyntopiaOAuthConfig.md), `"clientSecret"`\>

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:97](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ZyntopiaOAuthStrategy.ts#L97)

Gets the Zyntopia-specific configuration.

#### Returns

`Omit`\<[`ZyntopiaOAuthConfig`](../interfaces/ZyntopiaOAuthConfig.md), `"clientSecret"`\>

Zyntopia configuration (excluding sensitive data).

***

### isDevelopment()

> **isDevelopment**(): `boolean`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:129](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ZyntopiaOAuthStrategy.ts#L129)

Checks if this strategy is configured for development/testing.

#### Returns

`boolean`

True if configured for development or staging, false for production.

***

### isProduction()

> **isProduction**(): `boolean`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:121](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ZyntopiaOAuthStrategy.ts#L121)

Checks if this strategy is configured for production environment.

#### Returns

`boolean`

True if configured for production, false otherwise.

***

### refreshToken()

> **refreshToken**(): `Promise`\<`Record`\<`string`, `string`\>\>

Defined in: [src/auth/GenericOAuthStrategy.ts:273](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/GenericOAuthStrategy.ts#L273)

Manually refreshes the cached token.

#### Returns

`Promise`\<`Record`\<`string`, `string`\>\>

A promise that resolves to new authentication headers.

#### Inherited from

[`GenericOAuthStrategy`](GenericOAuthStrategy.md).[`refreshToken`](GenericOAuthStrategy.md#refreshtoken)

***

### forDevelopment()

> `static` **forDevelopment**(`clientId`, `clientSecret`, `customScopes?`): `ZyntopiaOAuthStrategy`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:180](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ZyntopiaOAuthStrategy.ts#L180)

Creates a ZyntopiaOAuthStrategy instance pre-configured for development.

#### Parameters

##### clientId

`string`

Zyntopia client ID

##### clientSecret

`string`

Zyntopia client secret

##### customScopes?

`string`

Optional custom scopes (defaults to development scopes)

#### Returns

`ZyntopiaOAuthStrategy`

Configured ZyntopiaOAuthStrategy for development.

***

### forProduction()

> `static` **forProduction**(`clientId`, `clientSecret`, `customScopes?`): `ZyntopiaOAuthStrategy`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:140](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ZyntopiaOAuthStrategy.ts#L140)

Creates a ZyntopiaOAuthStrategy instance pre-configured for production.

#### Parameters

##### clientId

`string`

Zyntopia client ID

##### clientSecret

`string`

Zyntopia client secret

##### customScopes?

`string`

Optional custom scopes (defaults to production scopes)

#### Returns

`ZyntopiaOAuthStrategy`

Configured ZyntopiaOAuthStrategy for production.

***

### forStaging()

> `static` **forStaging**(`clientId`, `clientSecret`, `customScopes?`): `ZyntopiaOAuthStrategy`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:160](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ZyntopiaOAuthStrategy.ts#L160)

Creates a ZyntopiaOAuthStrategy instance pre-configured for staging.

#### Parameters

##### clientId

`string`

Zyntopia client ID

##### clientSecret

`string`

Zyntopia client secret

##### customScopes?

`string`

Optional custom scopes (defaults to staging scopes)

#### Returns

`ZyntopiaOAuthStrategy`

Configured ZyntopiaOAuthStrategy for staging.

***

### getDefaultScopes()

> `static` **getDefaultScopes**(`environment`): `string`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:198](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ZyntopiaOAuthStrategy.ts#L198)

Gets the default scopes for a specific environment.

#### Parameters

##### environment

The environment to get scopes for

`"production"` | `"staging"` | `"development"`

#### Returns

`string`

Default scopes for the specified environment.

***

### getTokenEndpoint()

> `static` **getTokenEndpoint**(`environment`): `string`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:207](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ZyntopiaOAuthStrategy.ts#L207)

Gets the token endpoint for a specific environment.

#### Parameters

##### environment

The environment to get endpoint for

`"production"` | `"staging"` | `"development"`

#### Returns

`string`

Token endpoint URL for the specified environment.

***

### validateZyntopiaConfig()

> `static` **validateZyntopiaConfig**(`config`): `void`

Defined in: [src/auth/ZyntopiaOAuthStrategy.ts:216](https://github.com/hashangit/ART/blob/389c66e54bc50d9dde33052d28a5a19571a13dbf/src/auth/ZyntopiaOAuthStrategy.ts#L216)

Validates Zyntopia-specific configuration requirements.

#### Parameters

##### config

[`ZyntopiaOAuthConfig`](../interfaces/ZyntopiaOAuthConfig.md)

Configuration to validate

#### Returns

`void`

#### Throws

If configuration is invalid.
