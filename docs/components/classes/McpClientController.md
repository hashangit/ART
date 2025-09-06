[**ART Framework Component Reference**](../README.md)

***

[ART Framework Component Reference](../README.md) / McpClientController

# Class: McpClientController

Defined in: [src/systems/mcp/McpClient.ts:149](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/mcp/McpClient.ts#L149)

McpClientController
Controls the MCP client, including OAuth flow, connection, and tool calls.

## Properties

### baseUrl

> **baseUrl**: `URL`

Defined in: [src/systems/mcp/McpClient.ts:150](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/mcp/McpClient.ts#L150)

## Methods

### callTool()

> **callTool**(`name`, `args`): `Promise`\<`any`\>

Defined in: [src/systems/mcp/McpClient.ts:416](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/mcp/McpClient.ts#L416)

Calls a tool on the MCP server.

#### Parameters

##### name

`string`

The name of the tool to call.

##### args

`any`

The arguments to pass to the tool.

#### Returns

`Promise`\<`any`\>

A promise that resolves to the result of the tool call.

***

### connect()

> **connect**(): `Promise`\<`void`\>

Defined in: [src/systems/mcp/McpClient.ts:356](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/mcp/McpClient.ts#L356)

Connects to the MCP server.

#### Returns

`Promise`\<`void`\>

***

### ensureConnected()

> **ensureConnected**(): `Promise`\<`void`\>

Defined in: [src/systems/mcp/McpClient.ts:396](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/mcp/McpClient.ts#L396)

Ensures that the client is connected to the MCP server.

#### Returns

`Promise`\<`void`\>

***

### isAuthenticated()

> **isAuthenticated**(): `boolean`

Defined in: [src/systems/mcp/McpClient.ts:347](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/mcp/McpClient.ts#L347)

Checks if the user is authenticated.

#### Returns

`boolean`

True if the user is authenticated, false otherwise.

***

### listTools()

> **listTools**(): `Promise`\<`object`[]\>

Defined in: [src/systems/mcp/McpClient.ts:404](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/mcp/McpClient.ts#L404)

Lists the available tools on the MCP server.

#### Returns

`Promise`\<`object`[]\>

A promise that resolves to a list of tools.

***

### loadExistingSession()

> **loadExistingSession**(): `void`

Defined in: [src/systems/mcp/McpClient.ts:335](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/mcp/McpClient.ts#L335)

Loads an existing session from session storage.

#### Returns

`void`

***

### logout()

> **logout**(): `Promise`\<`void`\>

Defined in: [src/systems/mcp/McpClient.ts:439](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/mcp/McpClient.ts#L439)

Logs out from the MCP server and clears the session.

#### Returns

`Promise`\<`void`\>

***

### maybeHandleCallback()

> **maybeHandleCallback**(): `Promise`\<`boolean`\>

Defined in: [src/systems/mcp/McpClient.ts:288](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/mcp/McpClient.ts#L288)

Handles the OAuth callback, exchanging the authorization code for an access token.

#### Returns

`Promise`\<`boolean`\>

A promise that resolves to true if the callback was handled, false otherwise.

***

### startOAuth()

> **startOAuth**(): `Promise`\<`void`\>

Defined in: [src/systems/mcp/McpClient.ts:263](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/mcp/McpClient.ts#L263)

Starts the OAuth flow by redirecting the user to the authorization server.

#### Returns

`Promise`\<`void`\>

***

### create()

> `static` **create**(`baseUrl`, `scopes?`): `McpClientController`

Defined in: [src/systems/mcp/McpClient.ts:176](https://github.com/hashangit/ART/blob/e4c184bd9ffa5ef078ee6a88704f24584b173411/src/systems/mcp/McpClient.ts#L176)

Creates a new instance of McpClientController.

#### Parameters

##### baseUrl

`string`

The base URL of the MCP server.

##### scopes?

`string`[]

The OAuth scopes to request.

#### Returns

`McpClientController`

A new instance of McpClientController.
