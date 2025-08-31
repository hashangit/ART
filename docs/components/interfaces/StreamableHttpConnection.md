[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / StreamableHttpConnection

# Interface: StreamableHttpConnection

Defined in: [src/systems/mcp/types.ts:13](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L13)

Defines the connection details for a streamable HTTP-based MCP server.
This is the primary transport mechanism for browser-based MCP communication.

 StreamableHttpConnection

## Properties

### authStrategyId?

> `optional` **authStrategyId**: `string`

Defined in: [src/systems/mcp/types.ts:28](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L28)

The ID of an authentication strategy to use for this connection.

***

### headers?

> `optional` **headers**: `Record`\<`string`, `string`\>

Defined in: [src/systems/mcp/types.ts:23](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L23)

Optional headers to include in every request to the server.

***

### oauth?

> `optional` **oauth**: `object`

Defined in: [src/systems/mcp/types.ts:34](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L34)

Optional OAuth configuration for automatic PKCE setup per server.
This enables secure, per-server authentication without manual token handling.

#### authorizationEndpoint

> **authorizationEndpoint**: `string`

The OAuth 2.1 Authorization Endpoint URL.

#### channelName?

> `optional` **channelName**: `string`

An optional BroadcastChannel name for delivering tokens, useful in multi-window scenarios.

#### clientId

> **clientId**: `string`

The public client ID for the OAuth application.

#### openInNewTab?

> `optional` **openInNewTab**: `boolean`

Determines whether to open the login page in a new tab.
Defaults to true if omitted.

#### redirectUri

> **redirectUri**: `string`

The redirect URI that will handle the OAuth callback.

#### resource?

> `optional` **resource**: `string`

Optional 'resource' parameter for OAuth 2.1, often used as an audience identifier.

#### scopes

> **scopes**: `string`

A space-delimited string of OAuth scopes to request.

#### tokenEndpoint

> **tokenEndpoint**: `string`

The OAuth 2.1 Token Endpoint URL.

#### type

> **type**: `"pkce"`

The type of OAuth flow, currently supporting 'pkce'.

***

### url

> **url**: `string`

Defined in: [src/systems/mcp/types.ts:18](https://github.com/hashangit/ART/blob/fe46dfaaacd3f198d9540925c3184fcab0f9c813/src/systems/mcp/types.ts#L18)

The base URL of the MCP server.
