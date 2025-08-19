# ApiKeyStrategy

The `ApiKeyStrategy` is a simple authentication strategy that uses a static API key for authenticating requests. It is suitable for scenarios where a service is protected by a pre-shared key.

## Use Cases

*   Authenticating with internal services that use a simple API key for authorization.
*   Connecting to third-party APIs that require an API key to be sent in the headers.
*   Development and testing environments where a simple authentication mechanism is sufficient.

## Role and Responsibilities

*   **Stores an API Key:** The strategy is configured with a static API key.
*   **Provides the Key:** When requested, it provides the API key to be included in the `Authorization` header of an HTTP request, typically as a Bearer token.

## Usage

The `ApiKeyStrategy` is configured as the strategy for the `AuthManager` within the `ArtInstanceConfig`.

### Configuration

```typescript
import { ApiKeyStrategy } from "@art-framework/core";

const apiKeyStrategy = new ApiKeyStrategy({
  apiKey: "your-secret-api-key",
});
```

**Configuration Options:**

*   `apiKey`: The static API key to be used for authentication.

### How It Works

When the `getToken` method is called on the `ApiKeyStrategy`, it simply returns the configured `apiKey`. The `McpClient` or any other HTTP client can then use this key to set the `Authorization` header for its requests.

```
Authorization: Bearer your-secret-api-key
```

## Security Considerations

*   **Treat API keys as passwords.** They should be stored securely and not hardcoded in your source code. Use environment variables or a secret management service to handle API keys.
*   **Use this strategy only with trusted services.** As the key is static, it does not provide the same level of security as OAuth 2.0 flows. It is best suited for server-to-server communication within a trusted environment.