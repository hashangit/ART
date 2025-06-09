import { IAuthStrategy } from '../core/interfaces';
import { ARTError, ErrorCode } from '../errors';
import { Logger } from '../utils/logger';

/**
 * Configuration for OAuth 2.0 authentication strategy
 */
export interface OAuthConfig {
  /** Client ID for OAuth authentication */
  clientId: string;
  /** Client secret for OAuth authentication */
  clientSecret: string;
  /** OAuth token endpoint URL */
  tokenEndpoint: string;
  /** OAuth scopes to request (space-separated) */
  scopes?: string;
  /** Grant type to use (defaults to 'client_credentials') */
  grantType?: 'client_credentials' | 'authorization_code' | 'refresh_token';
  /** Additional headers to send with token requests */
  tokenRequestHeaders?: Record<string, string>;
  /** Custom timeout for token requests in milliseconds (default: 30000) */
  tokenTimeoutMs?: number;
  /** Buffer time before token expiry to trigger refresh (default: 300000 = 5 minutes) */
  tokenRefreshBufferMs?: number;
}

/**
 * OAuth token response structure
 */
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Cached token with expiry information
 */
interface CachedToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number; // Unix timestamp
  refreshToken?: string;
  scope?: string;
}

/**
 * Generic OAuth 2.0 authentication strategy with token caching and refresh capabilities.
 * Supports client credentials flow and authorization code flow with automatic token refresh.
 */
export class GenericOAuthStrategy implements IAuthStrategy {
  private config: OAuthConfig;
  private cachedToken: CachedToken | null = null;
  private refreshPromise: Promise<CachedToken> | null = null;

  /**
   * Creates a new OAuth authentication strategy.
   * @param config - OAuth configuration including endpoints, credentials, and options
   */
  constructor(config: OAuthConfig) {
    this.validateConfig(config);
    this.config = {
      grantType: 'client_credentials',
      tokenTimeoutMs: 30000,
      tokenRefreshBufferMs: 300000, // 5 minutes
      ...config
    };
    
    Logger.debug(`GenericOAuthStrategy: Initialized with endpoint ${config.tokenEndpoint} and grant type ${this.config.grantType}`);
  }

  /**
   * Validates the OAuth configuration to ensure required fields are present.
   */
  private validateConfig(config: OAuthConfig): void {
    if (!config.clientId || config.clientId.trim() === '') {
      throw new ARTError('OAuth client ID cannot be empty', ErrorCode.VALIDATION_ERROR);
    }
    if (!config.clientSecret || config.clientSecret.trim() === '') {
      throw new ARTError('OAuth client secret cannot be empty', ErrorCode.VALIDATION_ERROR);
    }
    if (!config.tokenEndpoint || config.tokenEndpoint.trim() === '') {
      throw new ARTError('OAuth token endpoint cannot be empty', ErrorCode.VALIDATION_ERROR);
    }
    
    // Validate URL format
    try {
      new URL(config.tokenEndpoint);
    } catch (error) {
      throw new ARTError('Invalid OAuth token endpoint URL', ErrorCode.VALIDATION_ERROR, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Gets authentication headers, automatically handling token refresh if needed.
   * @returns Promise resolving to authentication headers with Bearer token
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const token = await this.getValidToken();
      return {
        'Authorization': `${token.tokenType} ${token.accessToken}`
      };
    } catch (error) {
      const message = 'Failed to get OAuth authentication headers';
      Logger.error(message, error);
      throw new ARTError(message, ErrorCode.LLM_PROVIDER_ERROR, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Gets a valid access token, refreshing if necessary.
   * @returns Promise resolving to a valid cached token
   */
  private async getValidToken(): Promise<CachedToken> {
    // Check if we have a valid cached token
    if (this.cachedToken && this.isTokenValid(this.cachedToken)) {
      Logger.debug('GenericOAuthStrategy: Using cached token');
      return this.cachedToken;
    }

    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      Logger.debug('GenericOAuthStrategy: Waiting for ongoing token refresh');
      return await this.refreshPromise;
    }

    // Start new token acquisition
    this.refreshPromise = this.acquireNewToken();
    
    try {
      const token = await this.refreshPromise;
      this.cachedToken = token;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Checks if a token is still valid (not expired with buffer).
   */
  private isTokenValid(token: CachedToken): boolean {
    const now = Date.now();
    const buffer = this.config.tokenRefreshBufferMs!;
    return token.expiresAt > (now + buffer);
  }

  /**
   * Acquires a new token from the OAuth provider.
   */
  private async acquireNewToken(): Promise<CachedToken> {
    Logger.debug(`GenericOAuthStrategy: Acquiring new token from ${this.config.tokenEndpoint}`);

    const tokenRequest = this.buildTokenRequest();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.tokenTimeoutMs!);

      const response = await fetch(this.config.tokenEndpoint, {
        ...tokenRequest,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new ARTError(
          `OAuth token request failed: ${response.status} ${response.statusText}: ${errorText}`,
          ErrorCode.EXTERNAL_SERVICE_ERROR
        );
      }

      const tokenResponse: TokenResponse = await response.json();
      return this.processTokenResponse(tokenResponse);

    } catch (error) {
      if (error instanceof ARTError) {
        throw error;
      }
      
      const message = `Failed to acquire OAuth token: ${error instanceof Error ? error.message : String(error)}`;
      Logger.error(message, error);
      throw new ARTError(message, ErrorCode.EXTERNAL_SERVICE_ERROR, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Builds the token request configuration based on grant type.
   */
  private buildTokenRequest(): RequestInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      ...this.config.tokenRequestHeaders
    };

    let body: string;
    
    if (this.config.grantType === 'client_credentials') {
      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      });
      
      if (this.config.scopes) {
        params.append('scope', this.config.scopes);
      }
      
      body = params.toString();
    } else if (this.config.grantType === 'refresh_token' && this.cachedToken?.refreshToken) {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.cachedToken.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      });
      
      body = params.toString();
    } else {
      throw new ARTError(`Unsupported grant type: ${this.config.grantType}`, ErrorCode.NOT_IMPLEMENTED);
    }

    return {
      method: 'POST',
      headers,
      body
    };
  }

  /**
   * Processes the token response and creates a cached token object.
   */
  private processTokenResponse(response: TokenResponse): CachedToken {
    if (!response.access_token) {
      throw new ARTError('OAuth token response missing access_token', ErrorCode.EXTERNAL_SERVICE_ERROR);
    }

    const now = Date.now();
    const expiresIn = response.expires_in || 3600; // Default to 1 hour if not specified
    const expiresAt = now + (expiresIn * 1000);

    const cachedToken: CachedToken = {
      accessToken: response.access_token,
      tokenType: response.token_type || 'Bearer',
      expiresAt,
      refreshToken: response.refresh_token,
      scope: response.scope
    };

    Logger.debug(`GenericOAuthStrategy: Token acquired, expires at ${new Date(expiresAt).toISOString()}`);
    return cachedToken;
  }

  /**
   * Manually refreshes the cached token.
   * @returns Promise resolving to new authentication headers
   */
  public async refreshToken(): Promise<Record<string, string>> {
    Logger.debug('GenericOAuthStrategy: Manual token refresh requested');
    this.cachedToken = null; // Force refresh
    this.refreshPromise = null;
    return await this.getAuthHeaders();
  }

  /**
   * Clears the cached token, forcing a new token request on next use.
   */
  public clearTokenCache(): void {
    Logger.debug('GenericOAuthStrategy: Clearing token cache');
    this.cachedToken = null;
    this.refreshPromise = null;
  }

  /**
   * Gets information about the current cached token.
   * @returns Token information or null if no token is cached
   */
  public getTokenInfo(): { expiresAt: Date; scope?: string; hasRefreshToken: boolean } | null {
    if (!this.cachedToken) {
      return null;
    }

    return {
      expiresAt: new Date(this.cachedToken.expiresAt),
      scope: this.cachedToken.scope,
      hasRefreshToken: !!this.cachedToken.refreshToken
    };
  }

  /**
   * Gets the configured OAuth endpoints and settings.
   * @returns Configuration information (excluding sensitive data)
   */
  public getConfig(): Omit<OAuthConfig, 'clientSecret'> {
    return {
      clientId: this.config.clientId,
      tokenEndpoint: this.config.tokenEndpoint,
      scopes: this.config.scopes,
      grantType: this.config.grantType,
      tokenRequestHeaders: this.config.tokenRequestHeaders,
      tokenTimeoutMs: this.config.tokenTimeoutMs,
      tokenRefreshBufferMs: this.config.tokenRefreshBufferMs
    };
  }
} 