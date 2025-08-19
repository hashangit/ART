# GenericOAuthStrategy

The `GenericOAuthStrategy` is an implementation of the `IAuthStrategy` interface designed for **confidential clients**, such as backend services or command-line tools, where credentials can be stored securely. It is a more general-purpose strategy that can be used for various OAuth 2.0 flows, but it is most suitable for the **Client Credentials Flow**.

**Warning:** This strategy is **not recommended for use in public clients** like browser-based applications, as it would require exposing a client secret, which is a major security risk. For browser-based applications, always use the `PKCEOAuthStrategy`.

## Use Cases

The primary use case for `GenericOAuthStrategy` is for server-to-server communication where an application needs to authenticate itself to access an API, rather than authenticating a user.

Examples:
*   A backend service that needs to call another internal API.
*   A cron job that needs to fetch data from a protected endpoint.
*   A command-line tool that needs to authenticate to a service.

## Role and Responsibilities

*   **Implements the Client Credentials Flow:** Handles the process of exchanging a client ID and client secret for an access token.
*   **Token Caching:** Caches the retrieved access token in memory to avoid unnecessary requests to the token endpoint.
*   **Token Expiration:** Checks if the cached token is expired before returning it and automatically fetches a new one if needed.

## Usage

The `GenericOAuthStrategy` is configured as the strategy for the `AuthManager` within the `ArtInstanceConfig`.

### Configuration

```typescript
import { GenericOAuthStrategy } from "@art-framework/core";

const genericStrategy = new GenericOAuthStrategy({
  tokenUrl: "https://auth.example.com/token",
  clientId: "your-service-client-id",
  clientSecret: "your-service-client-secret",
  scope: "api:read api:write",
});
```

**Configuration Options:**

*   `tokenUrl`: The URL of the OAuth 2.0 token endpoint.
*   `clientId`: The client ID for your service application.
*   `clientSecret`: The client secret for your service application. This should be treated as a password and stored securely.
*   `scope`: A space-delimited list of scopes you are requesting.

### Getting a Token

To get a token for an API request, you can use the `getToken` method. The `McpClient` and other internal components do this automatically.

```typescript
const token = await genericStrategy.getToken();
if (token) {
  // Use the token in your API request
}
```

The `getToken` method will return a valid access token, fetching a new one if the cached token is expired. There is no user interaction required for this flow.

## Security Considerations

*   **Never use this strategy in a public client.** The `clientSecret` must be kept confidential. Exposing it in a browser application would allow anyone to impersonate your application.
*   **Store credentials securely.** When using this strategy in a backend service, store the `clientId` and `clientSecret` in a secure manner, such as environment variables, a secret management service (e.g., AWS Secrets Manager, HashiCorp Vault), or encrypted configuration files. Do not hardcode them in your source code.