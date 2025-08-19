# AuthManager

The `AuthManager` is the central service for handling authentication within the ART framework. It acts as a facade, providing a simple and consistent interface for the rest of the application to interact with the authentication system, while delegating the complex details of specific authentication flows to a configured strategy.

## Role and Responsibilities

*   **Orchestration:** The `AuthManager` orchestrates the authentication process, such as initiating login flows and refreshing tokens, by calling the appropriate methods on its configured strategy.
*   **Token Management:** It is responsible for retrieving and providing authentication tokens to other parts of the framework, such as the `McpClient`, when making authenticated requests.
*   **Configuration:** It holds the configuration for the chosen authentication strategy and provides it to the strategy during initialization.
*   **Decoupling:** It decouples the core framework from the specifics of any particular authentication method, allowing strategies to be swapped without affecting other components.

## Usage

The `AuthManager` is not typically used directly by the application developer. Instead, it is configured as part of the `ArtInstanceConfig` and used internally by other framework components.

### Configuration

Here is an example of how to configure the `AuthManager` with the `PKCEOAuthStrategy` in your `ArtInstanceConfig`:

```typescript
import { createArtInstance, PKCEOAuthStrategy } from "@art-framework/core";

const art = await createArtInstance({
  // ... other configurations
  auth: {
    strategy: new PKCEOAuthStrategy({
      authorizationUrl: "https://auth.example.com/authorize",
      tokenUrl: "https://auth.example.com/token",
      clientId: "your-client-id",
      redirectUri: "http://localhost:3000/callback",
      scope: "openid profile email",
    }),
  },
});
```

In this example, we are creating a new instance of `PKCEOAuthStrategy` with its required configuration and passing it to the `auth.strategy` property of the `ArtInstanceConfig`. The framework will then instantiate an `AuthManager` with this strategy.

## How It Works

1.  **Initialization:** When an `ArtInstance` is created, it initializes the `AuthManager` with the provided strategy and configuration.
2.  **Authentication Flow:** When an action requiring authentication is triggered (e.g., the user clicks a "Login" button that calls a method on the strategy), the `AuthManager` delegates the call to the `login` method of the configured strategy.
3.  **Token Retrieval:** When a component like `McpClient` needs to make an authenticated API call, it requests a token from the `AuthManager`. The `AuthManager` in turn calls the `getToken` method on its strategy, which handles the logic of retrieving a valid token (e.g., from storage, or by refreshing an expired token).
4.  **Token Usage:** The retrieved token is then used in the API request, typically as a Bearer token in the `Authorization` header.

By using this strategy-based approach, the `AuthManager` provides a clean separation of concerns, making the authentication system both powerful and easy to extend.