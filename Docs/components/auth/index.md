# Authentication

The Authentication system in ART is responsible for managing secure access to external resources, including MCP servers and other protected endpoints. It is designed to be flexible, allowing developers to configure different authentication strategies based on the application's environment (e.g., browser vs. server).

## Core Components

*   **[AuthManager](./auth-manager.md):** The central service that orchestrates the authentication process. It is configured with a specific authentication strategy and provides a simple interface for obtaining authentication tokens.

*   **Authentication Strategies:** These are swappable components that implement specific authentication flows.
    *   **[PKCEOAuthStrategy](./pkce-oauth-strategy.md):** Implements the Authorization Code Flow with PKCE, the recommended and most secure method for public clients like browser-based applications.
    *   **[GenericOAuthStrategy](./generic-oauth-strategy.md):** A more general-purpose strategy suitable for confidential clients, such as server-to-server communication, where credentials can be securely stored.
    *   **[ApiKeyStrategy](./api-key-strategy.md):** A simple strategy that uses a static API key for authentication.
    *   **[ZyntopiaOAuthStrategy](./zyntopia-oauth-strategy.md):** A specialized strategy for authenticating with the Zyntopia identity provider.

## Key Concepts

*   **Strategy-Based Design:** The `AuthManager` relies on a strategy pattern, allowing the authentication logic to be decoupled from the rest of the application. This makes it easy to switch between different authentication methods without changing the core application code.

*   **Browser-First:** The inclusion of `PKCEOAuthStrategy` highlights the framework's commitment to being browser-compatible and secure by default for web applications.

*   **Configuration:** The authentication system is configured within the `ArtInstanceConfig` when creating an ART instance. This is where you specify which authentication strategy to use and provide the necessary configuration for that strategy.