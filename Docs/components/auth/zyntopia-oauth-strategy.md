# ZyntopiaOAuthStrategy

The `ZyntopiaOAuthStrategy` is a specialized authentication strategy designed to work with the Zyntopia identity provider. It is an extension of the `GenericOAuthStrategy` but includes specific logic to handle Zyntopia's unique authentication requirements.

## Use Cases

This strategy should be used exclusively when authenticating with services that are protected by the Zyntopia identity and access management platform.

## Role and Responsibilities

*   **Extends `GenericOAuthStrategy`:** It inherits the core functionality of the `GenericOAuthStrategy`, such as handling the Client Credentials Flow.
*   **Zyntopia-Specific Logic:** It includes additional logic to correctly format requests and handle responses from the Zyntopia token endpoint.
*   **Handles Custom Claims:** It may be responsible for parsing and handling custom claims that are specific to Zyntopia's access tokens.

## Usage

The `ZyntopiaOAuthStrategy` is configured as the strategy for the `AuthManager` within the `ArtInstanceConfig`.

### Configuration

```typescript
import { ZyntopiaOAuthStrategy } from "@art-framework/core";

const zyntopiaStrategy = new ZyntopiaOAuthStrategy({
  tokenUrl: "https://auth.zyntopia.com/oauth/token",
  clientId: "your-zyntopia-client-id",
  clientSecret: "your-zyntopia-client-secret",
  scope: "read:data write:data",
});
```

The configuration options are the same as for the `GenericOAuthStrategy`, but the values should be specific to your Zyntopia application.

**Configuration Options:**

*   `tokenUrl`: The URL of the Zyntopia OAuth 2.0 token endpoint.
*   `clientId`: The client ID for your Zyntopia application.
*   `clientSecret`: The client secret for your Zyntopia application.
*   `scope`: A space-delimited list of scopes you are requesting.

## How It Works

The `ZyntopiaOAuthStrategy` works in the same way as the `GenericOAuthStrategy`, by exchanging a client ID and secret for an access token. However, it may include internal modifications to the request or response handling to ensure compatibility with the Zyntopia platform.

## Security Considerations

As this strategy extends `GenericOAuthStrategy`, the same security considerations apply:

*   **Never use this strategy in a public client.** The `clientSecret` must be kept confidential.
*   **Store credentials securely.** Use environment variables or a secret management service to store your Zyntopia client ID and secret.