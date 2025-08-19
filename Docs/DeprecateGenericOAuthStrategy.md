# Authentication Strategies

## 1. Overview

The ART framework provides different authentication strategies to accommodate various application architectures. Choosing the correct strategy is crucial for security. The two primary scenarios are server-to-server communication (confidential clients) and browser-based applications (public clients).

## 2. Choosing the Right Strategy

### For Browser-Based Applications (Public Clients)

-   **Strategy**: [`PKCEOAuthStrategy`](./PKCEOAuthStrategy.md)
-   **Grant Type**: Authorization Code Flow with PKCE
-   **Why**: This is the **only secure method** for applications running in a web browser. The browser cannot securely store a `client_secret`, so the PKCE flow is used to prove that the application instance initiating the login is the same one exchanging the authorization code for a token.

### For Server-to-Server Communication (Confidential Clients)

-   **Strategy**: `GenericOAuthStrategy`
-   **Grant Type**: `client_credentials`
-   **Why**: This strategy is suitable for backend services, command-line tools, or any environment where a `client_secret` can be stored securely. It is a simpler, direct flow for non-interactive clients.

## 3. `GenericOAuthStrategy` Deprecation Notice

The `GenericOAuthStrategy` class itself is marked with a `@deprecated` tag to strongly discourage its use in browser environments.

```typescript
/**
 * @deprecated This strategy is not recommended for browser-based applications as it uses the insecure client_credentials grant type. For browser-based apps, please use PKCEOAuthStrategy instead. This strategy is only suitable for secure, server-to-server (confidential client) scenarios.
 */
export class GenericOAuthStrategy implements IAuthStrategy {
  // ... implementation ...
}