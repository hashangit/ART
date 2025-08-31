[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / PKCEOAuthConfig

# Interface: PKCEOAuthConfig

Defined in: [src/auth/PKCEOAuthStrategy.ts:8](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/auth/PKCEOAuthStrategy.ts#L8)

Configuration for the PKCE OAuth 2.0 authentication strategy.

## Properties

### authorizationEndpoint

> **authorizationEndpoint**: `string`

Defined in: [src/auth/PKCEOAuthStrategy.ts:10](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/auth/PKCEOAuthStrategy.ts#L10)

The OAuth 2.0 authorization endpoint URL.

***

### channelName?

> `optional` **channelName**: `string`

Defined in: [src/auth/PKCEOAuthStrategy.ts:24](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/auth/PKCEOAuthStrategy.ts#L24)

BroadcastChannel name used to receive auth codes from callback tab (default 'art-auth').

***

### clientId

> **clientId**: `string`

Defined in: [src/auth/PKCEOAuthStrategy.ts:14](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/auth/PKCEOAuthStrategy.ts#L14)

The client ID for the application.

***

### openInNewTab?

> `optional` **openInNewTab**: `boolean`

Defined in: [src/auth/PKCEOAuthStrategy.ts:22](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/auth/PKCEOAuthStrategy.ts#L22)

Open login in a new tab (default true for ART MCP flows).

***

### redirectUri

> **redirectUri**: `string`

Defined in: [src/auth/PKCEOAuthStrategy.ts:16](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/auth/PKCEOAuthStrategy.ts#L16)

The redirect URI for the application.

***

### resource?

> `optional` **resource**: `string`

Defined in: [src/auth/PKCEOAuthStrategy.ts:20](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/auth/PKCEOAuthStrategy.ts#L20)

Optional: The resource parameter to specify the target audience (for MCP servers).

***

### scopes

> **scopes**: `string`

Defined in: [src/auth/PKCEOAuthStrategy.ts:18](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/auth/PKCEOAuthStrategy.ts#L18)

The scopes to request (space-separated).

***

### tokenEndpoint

> **tokenEndpoint**: `string`

Defined in: [src/auth/PKCEOAuthStrategy.ts:12](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/auth/PKCEOAuthStrategy.ts#L12)

The OAuth 2.0 token endpoint URL.
