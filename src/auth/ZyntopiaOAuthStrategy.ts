import { GenericOAuthStrategy, type OAuthConfig } from './GenericOAuthStrategy';
import { Logger } from '../utils/logger';

/**
 * Configuration specific to Zyntopia OAuth strategy
 */
export interface ZyntopiaOAuthConfig {
  /** Client ID for Zyntopia OAuth authentication */
  clientId: string;
  /** Client secret for Zyntopia OAuth authentication */
  clientSecret: string;
  /** Optional custom token endpoint (defaults to Zyntopia's standard endpoint) */
  tokenEndpoint?: string;
  /** Optional custom scopes (defaults to Zyntopia's standard scopes) */
  scopes?: string;
  /** Optional environment ('production' | 'staging' | 'development') */
  environment?: 'production' | 'staging' | 'development';
  /** Optional custom timeout for token requests in milliseconds */
  tokenTimeoutMs?: number;
  /** Optional custom buffer time before token expiry to trigger refresh */
  tokenRefreshBufferMs?: number;
  /** Additional custom headers for Zyntopia API requirements */
  customHeaders?: Record<string, string>;
}

/**
 * Zyntopia-specific OAuth 2.0 authentication strategy.
 * Pre-configured for Zyntopia services with standard endpoints, scopes, and authentication flows.
 * Extends GenericOAuthStrategy with Zyntopia-specific defaults and configurations.
 */
export class ZyntopiaOAuthStrategy extends GenericOAuthStrategy {
  private static readonly ZYNTOPIA_ENDPOINTS = {
    production: 'https://auth.zyntopia.com/oauth/token',
    staging: 'https://staging-auth.zyntopia.com/oauth/token',
    development: 'https://dev-auth.zyntopia.com/oauth/token'
  };

  private static readonly ZYNTOPIA_DEFAULT_SCOPES = {
    production: 'zyntopia:read zyntopia:write zyntopia:admin',
    staging: 'zyntopia:read zyntopia:write zyntopia:admin zyntopia:debug',
    development: 'zyntopia:read zyntopia:write zyntopia:admin zyntopia:debug zyntopia:test'
  };

  private zyntopiaConfig: Required<ZyntopiaOAuthConfig>;

  /**
   * Creates a new Zyntopia OAuth authentication strategy.
   * @param config - Zyntopia-specific OAuth configuration
   */
  constructor(config: ZyntopiaOAuthConfig) {
    // Set defaults for Zyntopia
    const environment = config.environment || 'production';
    const defaultTokenEndpoint = ZyntopiaOAuthStrategy.ZYNTOPIA_ENDPOINTS[environment];
    const defaultScopes = ZyntopiaOAuthStrategy.ZYNTOPIA_DEFAULT_SCOPES[environment];

    // Build the complete configuration with Zyntopia defaults
    const zyntopiaConfig: Required<ZyntopiaOAuthConfig> = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      tokenEndpoint: config.tokenEndpoint || defaultTokenEndpoint,
      scopes: config.scopes || defaultScopes,
      environment,
      tokenTimeoutMs: config.tokenTimeoutMs || 30000,
      tokenRefreshBufferMs: config.tokenRefreshBufferMs || 300000, // 5 minutes
      customHeaders: config.customHeaders || {}
    };

    // Create the generic OAuth config with Zyntopia-specific settings
    const genericConfig: OAuthConfig = {
      clientId: zyntopiaConfig.clientId,
      clientSecret: zyntopiaConfig.clientSecret,
      tokenEndpoint: zyntopiaConfig.tokenEndpoint,
      scopes: zyntopiaConfig.scopes,
      grantType: 'client_credentials', // Zyntopia uses client credentials flow
      tokenTimeoutMs: zyntopiaConfig.tokenTimeoutMs,
      tokenRefreshBufferMs: zyntopiaConfig.tokenRefreshBufferMs,
      tokenRequestHeaders: {
        'User-Agent': 'ART-Framework-Zyntopia/1.0',
        'X-Zyntopia-Client': 'art-framework',
        'X-Zyntopia-Environment': environment,
        ...zyntopiaConfig.customHeaders
      }
    };

    // Initialize the parent GenericOAuthStrategy
    super(genericConfig);

    this.zyntopiaConfig = zyntopiaConfig;

    Logger.debug(`ZyntopiaOAuthStrategy: Initialized for ${environment} environment with endpoint ${zyntopiaConfig.tokenEndpoint}`);
  }

  /**
   * Gets the Zyntopia-specific configuration.
   * @returns Zyntopia configuration (excluding sensitive data)
   */
  public getZyntopiaConfig(): Omit<ZyntopiaOAuthConfig, 'clientSecret'> {
    return {
      clientId: this.zyntopiaConfig.clientId,
      tokenEndpoint: this.zyntopiaConfig.tokenEndpoint,
      scopes: this.zyntopiaConfig.scopes,
      environment: this.zyntopiaConfig.environment,
      tokenTimeoutMs: this.zyntopiaConfig.tokenTimeoutMs,
      tokenRefreshBufferMs: this.zyntopiaConfig.tokenRefreshBufferMs,
      customHeaders: this.zyntopiaConfig.customHeaders
    };
  }

  /**
   * Gets the current environment this strategy is configured for.
   * @returns The environment ('production', 'staging', or 'development')
   */
  public getEnvironment(): 'production' | 'staging' | 'development' {
    return this.zyntopiaConfig.environment;
  }

  /**
   * Checks if this strategy is configured for production environment.
   * @returns True if configured for production, false otherwise
   */
  public isProduction(): boolean {
    return this.zyntopiaConfig.environment === 'production';
  }

  /**
   * Checks if this strategy is configured for development/testing.
   * @returns True if configured for development or staging, false for production
   */
  public isDevelopment(): boolean {
    return this.zyntopiaConfig.environment !== 'production';
  }

  /**
   * Creates a ZyntopiaOAuthStrategy instance pre-configured for production.
   * @param clientId - Zyntopia client ID
   * @param clientSecret - Zyntopia client secret
   * @param customScopes - Optional custom scopes (defaults to production scopes)
   * @returns Configured ZyntopiaOAuthStrategy for production
   */
  public static forProduction(
    clientId: string, 
    clientSecret: string, 
    customScopes?: string
  ): ZyntopiaOAuthStrategy {
    return new ZyntopiaOAuthStrategy({
      clientId,
      clientSecret,
      environment: 'production',
      scopes: customScopes
    });
  }

  /**
   * Creates a ZyntopiaOAuthStrategy instance pre-configured for staging.
   * @param clientId - Zyntopia client ID
   * @param clientSecret - Zyntopia client secret
   * @param customScopes - Optional custom scopes (defaults to staging scopes)
   * @returns Configured ZyntopiaOAuthStrategy for staging
   */
  public static forStaging(
    clientId: string, 
    clientSecret: string, 
    customScopes?: string
  ): ZyntopiaOAuthStrategy {
    return new ZyntopiaOAuthStrategy({
      clientId,
      clientSecret,
      environment: 'staging',
      scopes: customScopes
    });
  }

  /**
   * Creates a ZyntopiaOAuthStrategy instance pre-configured for development.
   * @param clientId - Zyntopia client ID
   * @param clientSecret - Zyntopia client secret
   * @param customScopes - Optional custom scopes (defaults to development scopes)
   * @returns Configured ZyntopiaOAuthStrategy for development
   */
  public static forDevelopment(
    clientId: string, 
    clientSecret: string, 
    customScopes?: string
  ): ZyntopiaOAuthStrategy {
    return new ZyntopiaOAuthStrategy({
      clientId,
      clientSecret,
      environment: 'development',
      scopes: customScopes
    });
  }

  /**
   * Gets the default scopes for a specific environment.
   * @param environment - The environment to get scopes for
   * @returns Default scopes for the specified environment
   */
  public static getDefaultScopes(environment: 'production' | 'staging' | 'development'): string {
    return ZyntopiaOAuthStrategy.ZYNTOPIA_DEFAULT_SCOPES[environment];
  }

  /**
   * Gets the token endpoint for a specific environment.
   * @param environment - The environment to get endpoint for
   * @returns Token endpoint URL for the specified environment
   */
  public static getTokenEndpoint(environment: 'production' | 'staging' | 'development'): string {
    return ZyntopiaOAuthStrategy.ZYNTOPIA_ENDPOINTS[environment];
  }

  /**
   * Validates Zyntopia-specific configuration requirements.
   * @param config - Configuration to validate
   * @throws {Error} If configuration is invalid
   */
  public static validateZyntopiaConfig(config: ZyntopiaOAuthConfig): void {
    if (!config.clientId || config.clientId.trim() === '') {
      throw new Error('Zyntopia client ID is required');
    }
    if (!config.clientSecret || config.clientSecret.trim() === '') {
      throw new Error('Zyntopia client secret is required');
    }
    if (config.environment && !['production', 'staging', 'development'].includes(config.environment)) {
      throw new Error('Zyntopia environment must be one of: production, staging, development');
    }
    if (config.tokenTimeoutMs && (config.tokenTimeoutMs < 1000 || config.tokenTimeoutMs > 60000)) {
      throw new Error('Zyntopia token timeout must be between 1000ms and 60000ms');
    }
    if (config.tokenRefreshBufferMs && (config.tokenRefreshBufferMs < 30000 || config.tokenRefreshBufferMs > 600000)) {
      throw new Error('Zyntopia token refresh buffer must be between 30000ms and 600000ms');
    }
  }
} 