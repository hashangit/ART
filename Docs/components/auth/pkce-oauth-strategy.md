# PKCEOAuthStrategy

The `PKCEOAuthStrategy` is an implementation of the `IAuthStrategy` interface that provides a secure way for public clients, such as single-page applications (SPAs) running in a browser, to authenticate users and obtain access tokens. It implements the **Authorization Code Flow with Proof Key for Code Exchange (PKCE)**, which is the industry best practice for OAuth 2.0 in browser-based applications.

## Why PKCE?

The PKCE extension prevents a type of attack called "authorization code interception." In a public client, there is no secure way to store a client secret. PKCE works by having the application create a secret on the fly (the `code_verifier`) and a transformed version of that secret (the `code_challenge`), which is sent to the authorization server. When the application exchanges the authorization code for an access token, it must also send the original `code_verifier`. The server can then verify that the client exchanging the code is the same one that initiated the flow.

## Role and Responsibilities

*   **Implements the PKCE Flow:** Handles all the steps of the PKCE flow, including:
    *   Generating a `code_verifier` and `code_challenge`.
    *   Redirecting the user to the authorization server with the correct parameters.
    *   Handling the redirect back from the authorization server to exchange the authorization code for an access token.
*   **Token Storage:** Securely stores the retrieved access and refresh tokens (e.g., in browser storage).
*   **Token Refresh:** Automatically handles refreshing the access token using the refresh token when it expires.

## Usage

The `PKCEOAuthStrategy` is configured as the strategy for the `AuthManager` within the `ArtInstanceConfig`.

### Configuration

```typescript
import { PKCEOAuthStrategy } from "@art-framework/core";

const pkceStrategy = new PKCEOAuthStrategy({
  authorizationUrl: "https://auth.example.com/authorize",
  tokenUrl: "https://auth.example.com/token",
  clientId: "your-client-id",
  redirectUri: "http://localhost:3000/callback",
  scope: "openid profile email api:read",
});
```

**Configuration Options:**

*   `authorizationUrl`: The URL of the OAuth 2.0 authorization endpoint.
*   `tokenUrl`: The URL of the OAuth 2.0 token endpoint.
*   `clientId`: The public client ID for your application.
*   `redirectUri`: The URI that the authorization server will redirect the user back to after authentication. This must be registered with your OAuth provider.
*   `scope`: A space-delimited list of scopes you are requesting.

### Initiating Login

To start the login process, you can call the `login` method on the strategy instance.

```typescript
// Assuming you have access to the strategy instance
await pkceStrategy.login();
```

This will redirect the user's browser to the `authorizationUrl`.

### Handling the Callback

After the user authenticates, they will be redirected back to your `redirectUri`. In your application's callback component, you need to call the `handleRedirectCallback` method to complete the flow.

```typescript
// In your callback component (e.g., /callback)
import { useEffect } from "react";

const Callback = () => {
  useEffect(() => {
    const completeAuth = async () => {
      try {
        await pkceStrategy.handleRedirectCallback();
        // Redirect to the main part of the app
        window.location.href = "/";
      } catch (error) {
        console.error("Authentication failed", error);
      }
    };
    completeAuth();
  }, []);

  return <div>Loading...</div>;
};
```

This method will exchange the authorization code for an access token and store it.

### Getting a Token

To get a token for an API request, you can use the `getToken` method. The `McpClient` and other internal components do this automatically.

```typescript
const token = await pkceStrategy.getToken();
if (token) {
  // Use the token in your API request
}
```

The `getToken` method will return a valid access token, refreshing it if necessary.