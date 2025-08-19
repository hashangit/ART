# Using the PKCEOAuthStrategy

## 1. Overview

The `PKCEOAuthStrategy` implements the **OAuth 2.0 Authorization Code Flow with PKCE (Proof Key for Code Exchange)**. This is the industry-standard, most secure method for authenticating users in browser-based applications (public clients).

This strategy is the recommended authentication method for any application built with the ART framework that needs to connect to secure, cloud-hosted A2A agents or MCP servers that are protected by OAuth 2.0.

## 2. How it Works

The PKCE flow involves two main steps:

1.  **Initiating Login:** The application redirects the user to the authorization server with a unique `code_challenge`.
2.  **Handling Redirect:** After the user authenticates, the server redirects them back to the application with an `authorization_code`. The application then exchanges this code and the original `code_verifier` for an access token.

The `PKCEOAuthStrategy` handles all the details of this flow, including generating the code verifier and challenge, constructing the URLs, and managing the tokens.

## 3. Configuration

The strategy is configured via the `PKCEOAuthConfig` interface.

### `PKCEOAuthConfig` Interface

```typescript
export interface PKCEOAuthConfig {
  /** The OAuth 2.0 authorization endpoint URL. */
  authorizationEndpoint: string;
  /** The OAuth 2.0 token endpoint URL. */
  tokenEndpoint: string;
  /** The client ID for the application. */
  clientId: string;
  /** The redirect URI for the application. */
  redirectUri: string;
  /** The scopes to request (space-separated). */
  scopes: string;
  /** Optional: The resource parameter to specify the target audience (for MCP servers). */
  resource?: string;
}
```

## 4. Usage

Using the `PKCEOAuthStrategy` involves three main parts: configuration, initiating the login, and handling the callback.

### Step 1: Configure the Strategy

In your `ArtInstanceConfig`, provide an `auth` configuration that includes the `PKCEOAuthStrategy`.

```typescript
// src/config/art-config.ts
import { ArtInstanceConfig, PKCEOAuthStrategy } from 'art-framework';

const artConfig: ArtInstanceConfig = {
  // ... other configurations ...
  auth: {
    strategy: new PKCEOAuthStrategy({
      authorizationEndpoint: 'https://auth.example.com/authorize',
      tokenEndpoint: 'https://auth.example.com/token',
      clientId: 'your-client-id',
      redirectUri: 'http://localhost:3000/callback',
      scopes: 'openid profile email offline_access',
      resource: 'https://mcp.example.com', // Optional: Audience for the token
    }),
  },
};

export default artConfig;
```

### Step 2: Initiate the Login

From your application's UI (e.g., when a user clicks a "Login" button), get the `authManager` from your `ArtInstance` and call the `login()` method. The strategy will handle the redirect.

```typescript
// src/components/LoginButton.tsx
import { artInstance } from '../services/art'; // Your initialized ArtInstance

const LoginButton = () => {
  const handleLogin = async () => {
    try {
      // This will redirect the user's browser to the authorization endpoint
      await artInstance.authManager.login();
    } catch (error) {
      console.error('Login failed to initiate:', error);
    }
  };

  return <button onClick={handleLogin}>Login with Example Corp</button>;
};
```

### Step 3: Handle the Redirect Callback

Create a dedicated page or route in your application at the `redirectUri` you configured. On this page, call the `handleRedirect()` method to complete the flow. This method will exchange the code for a token and then you can redirect the user to the main part of your application.

```typescript
// src/pages/Callback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { artInstance } from '../services/art';

const CallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const completeLogin = async () => {
      try {
        // Handle the redirect, exchange code for token
        await artInstance.authManager.handleRedirect();
        // Redirect to the main application page on success
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to handle auth redirect:', error);
        // Redirect to an error page or back to login
        navigate('/login-error');
      }
    };

    completeLogin();
  }, [navigate]);

  return <div>Loading...</div>;
};
```

Once `handleRedirect` is complete, the `PKCEOAuthStrategy` will have the token cached in memory. Subsequent calls to A2A or MCP services that require authentication will automatically have the `Authorization: Bearer <token>` header attached by the `AuthManager` via the `getAuthHeaders()` method.