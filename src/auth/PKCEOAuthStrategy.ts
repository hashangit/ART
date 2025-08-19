import { IAuthStrategy } from '../core/interfaces';
import { ARTError, ErrorCode } from '../errors';
import { Logger } from '../utils/logger';

/**
 * Configuration for the PKCE OAuth 2.0 authentication strategy.
 */
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

interface CachedToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

/**
 * Implements the OAuth 2.0 Authorization Code Flow with PKCE (Proof Key for Code Exchange).
 * This is the recommended, most secure method for authenticating users in browser-based applications.
 */
export class PKCEOAuthStrategy implements IAuthStrategy {
  private config: PKCEOAuthConfig;
  private cachedToken: CachedToken | null = null;

  constructor(config: PKCEOAuthConfig) {
    if (!config.authorizationEndpoint || !config.tokenEndpoint || !config.clientId || !config.redirectUri || !config.scopes) {
      throw new ARTError(
        'PKCEOAuthStrategy requires authorizationEndpoint, tokenEndpoint, clientId, redirectUri, and scopes.',
        ErrorCode.INVALID_CONFIG,
      );
    }
    this.config = config;
  }

  /**
   * Initiates the PKCE login flow by redirecting the user to the authorization endpoint.
   */
  public async login(): Promise<void> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    sessionStorage.setItem('pkce_code_verifier', codeVerifier);

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes,
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    if (this.config.resource) {
      params.append('resource', this.config.resource);
    }

    const authorizationUrl = `${this.config.authorizationEndpoint}?${params.toString()}`;
    Logger.info('Redirecting to authorization endpoint.');
    window.location.assign(authorizationUrl);
  }

  /**
   * Handles the redirect from the authorization server.
   * This method should be called on the redirect URI page.
   * It exchanges the authorization code for an access token.
   */
  public async handleRedirect(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      const error = params.get('error');
      const errorDescription = params.get('error_description');
      throw new ARTError(
        `OAuth error on redirect: ${error} - ${errorDescription || 'No description provided.'}`,
        ErrorCode.EXTERNAL_SERVICE_ERROR,
      );
    }

    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
    if (!codeVerifier) {
      throw new ARTError('No PKCE code verifier found in session storage. Please initiate login again.', ErrorCode.INVALID_CONFIG);
    }

    try {
      const tokenResponse = await fetch(this.config.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          redirect_uri: this.config.redirectUri,
          code: code,
          code_verifier: codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new ARTError(`Failed to exchange authorization code for token: ${errorText}`, ErrorCode.NETWORK_ERROR);
      }

      const tokenData = await tokenResponse.json();
      this.cachedToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
      };

      Logger.info('Successfully obtained access token.');
    } catch (error) {
      Logger.error('Error during token exchange:', error);
      throw new ARTError('An unexpected error occurred during the token exchange process.', ErrorCode.UNKNOWN_ERROR, error as Error);
    } finally {
      sessionStorage.removeItem('pkce_code_verifier');
    }
  }

  /**
   * Gets the authentication headers, automatically handling token refresh if needed.
   * @returns A promise that resolves to the authentication headers.
   */
  public async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.cachedToken) {
      throw new ARTError('No cached token available. Please login first.', ErrorCode.INVALID_CONFIG);
    }

    if (Date.now() >= this.cachedToken.expiresAt) {
      Logger.info('Access token expired, attempting to refresh.');
      await this.refreshToken();
    }

    return {
      Authorization: `Bearer ${this.cachedToken!.accessToken}`,
    };
  }

  /**
   * Clears the cached token.
   */
  public logout(): void {
    this.cachedToken = null;
    sessionStorage.removeItem('pkce_code_verifier');
    Logger.info('Cached token and PKCE code verifier cleared.');
  }

  /**
   * Checks if there is a valid, non-expired token.
   * @returns A promise that resolves to true if the token is valid, false otherwise.
   */
  public async isAuthenticated(): Promise<boolean> {
    if (!this.cachedToken) {
      return false;
    }

    if (Date.now() >= this.cachedToken.expiresAt) {
      try {
        await this.refreshToken();
        return true;
      } catch (error) {
        return false;
      }
    }

    return true;
  }

  // --- Private Helper Methods ---

  private generateCodeVerifier(): string {
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    return this.base64UrlEncode(randomBytes);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(hashBuffer));
  }

  private base64UrlEncode(bytes: Uint8Array): string {
    return btoa(String.fromCharCode.apply(null, Array.from(bytes)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private async refreshToken(): Promise<void> {
    if (!this.cachedToken?.refreshToken) {
      this.logout(); // Clear expired token
      throw new ARTError('No refresh token available. User must re-authenticate.', ErrorCode.INVALID_CONFIG);
    }

    try {
      const tokenResponse = await fetch(this.config.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          refresh_token: this.cachedToken.refreshToken,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        this.logout(); // Clear tokens on failure
        throw new ARTError(`Failed to refresh token: ${errorText}`, ErrorCode.NETWORK_ERROR);
      }

      const tokenData = await tokenResponse.json();
      this.cachedToken = {
        accessToken: tokenData.access_token,
        // Keep the same refresh token if a new one isn't provided
        refreshToken: tokenData.refresh_token || this.cachedToken.refreshToken,
        expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
      };

      Logger.info('Successfully refreshed access token.');
    } catch (error) {
      this.logout();
      Logger.error('Error during token refresh:', error);
      throw new ARTError('An unexpected error occurred during the token refresh process.', ErrorCode.UNKNOWN_ERROR, error as Error);
    }
  }
}