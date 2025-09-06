[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / OAuthConfig

# Interface: OAuthConfig

Defined in: [src/auth/GenericOAuthStrategy.ts:8](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/GenericOAuthStrategy.ts#L8)

Configuration for OAuth 2.0 authentication strategy

## Properties

### clientId

> **clientId**: `string`

Defined in: [src/auth/GenericOAuthStrategy.ts:10](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/GenericOAuthStrategy.ts#L10)

Client ID for OAuth authentication

***

### clientSecret

> **clientSecret**: `string`

Defined in: [src/auth/GenericOAuthStrategy.ts:12](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/GenericOAuthStrategy.ts#L12)

Client secret for OAuth authentication

***

### grantType?

> `optional` **grantType**: `"refresh_token"` \| `"authorization_code"` \| `"client_credentials"`

Defined in: [src/auth/GenericOAuthStrategy.ts:18](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/GenericOAuthStrategy.ts#L18)

Grant type to use (defaults to 'client_credentials')

***

### scopes?

> `optional` **scopes**: `string`

Defined in: [src/auth/GenericOAuthStrategy.ts:16](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/GenericOAuthStrategy.ts#L16)

OAuth scopes to request (space-separated)

***

### tokenEndpoint

> **tokenEndpoint**: `string`

Defined in: [src/auth/GenericOAuthStrategy.ts:14](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/GenericOAuthStrategy.ts#L14)

OAuth token endpoint URL

***

### tokenRefreshBufferMs?

> `optional` **tokenRefreshBufferMs**: `number`

Defined in: [src/auth/GenericOAuthStrategy.ts:24](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/GenericOAuthStrategy.ts#L24)

Buffer time before token expiry to trigger refresh (default: 300000 = 5 minutes)

***

### tokenRequestHeaders?

> `optional` **tokenRequestHeaders**: `Record`\<`string`, `string`\>

Defined in: [src/auth/GenericOAuthStrategy.ts:20](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/GenericOAuthStrategy.ts#L20)

Additional headers to send with token requests

***

### tokenTimeoutMs?

> `optional` **tokenTimeoutMs**: `number`

Defined in: [src/auth/GenericOAuthStrategy.ts:22](https://github.com/hashangit/ART/blob/1e49ae91e230443ba790ac800658233963b3d60c/src/auth/GenericOAuthStrategy.ts#L22)

Custom timeout for token requests in milliseconds (default: 30000)
