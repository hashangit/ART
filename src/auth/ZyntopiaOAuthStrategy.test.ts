import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { ZyntopiaOAuthStrategy, type ZyntopiaOAuthConfig } from './ZyntopiaOAuthStrategy';

// Mock the Logger
vi.mock('../utils/logger', () => ({
  Logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

// Mock fetch globally
const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('ZyntopiaOAuthStrategy', () => {
  let strategy: ZyntopiaOAuthStrategy;
  let baseConfig: ZyntopiaOAuthConfig;

  beforeEach(() => {
    baseConfig = {
      clientId: 'zyntopia-client-id',
      clientSecret: 'zyntopia-client-secret'
    };

    // Set up fake timers
    vi.useFakeTimers();

    // Clear all mocks
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create strategy with minimal config (defaults to production)', () => {
      strategy = new ZyntopiaOAuthStrategy(baseConfig);

      const zyntopiaConfig = strategy.getZyntopiaConfig();
      expect(zyntopiaConfig.clientId).toBe('zyntopia-client-id');
      expect(zyntopiaConfig.environment).toBe('production');
      expect(zyntopiaConfig.tokenEndpoint).toBe('https://auth.zyntopia.com/oauth/token');
      expect(zyntopiaConfig.scopes).toBe('zyntopia:read zyntopia:write zyntopia:admin');
      expect(zyntopiaConfig.tokenTimeoutMs).toBe(30000);
      expect(zyntopiaConfig.tokenRefreshBufferMs).toBe(300000);
    });

    it('should create strategy with staging environment', () => {
      const stagingConfig = { ...baseConfig, environment: 'staging' as const };
      strategy = new ZyntopiaOAuthStrategy(stagingConfig);

      const zyntopiaConfig = strategy.getZyntopiaConfig();
      expect(zyntopiaConfig.environment).toBe('staging');
      expect(zyntopiaConfig.tokenEndpoint).toBe('https://staging-auth.zyntopia.com/oauth/token');
      expect(zyntopiaConfig.scopes).toBe('zyntopia:read zyntopia:write zyntopia:admin zyntopia:debug');
    });

    it('should create strategy with development environment', () => {
      const devConfig = { ...baseConfig, environment: 'development' as const };
      strategy = new ZyntopiaOAuthStrategy(devConfig);

      const zyntopiaConfig = strategy.getZyntopiaConfig();
      expect(zyntopiaConfig.environment).toBe('development');
      expect(zyntopiaConfig.tokenEndpoint).toBe('https://dev-auth.zyntopia.com/oauth/token');
      expect(zyntopiaConfig.scopes).toBe('zyntopia:read zyntopia:write zyntopia:admin zyntopia:debug zyntopia:test');
    });

    it('should create strategy with custom configuration overrides', () => {
      const customConfig: ZyntopiaOAuthConfig = {
        ...baseConfig,
        environment: 'staging',
        tokenEndpoint: 'https://custom-auth.zyntopia.com/oauth/token',
        scopes: 'custom:scope1 custom:scope2',
        tokenTimeoutMs: 45000,
        tokenRefreshBufferMs: 600000,
        customHeaders: { 'X-Custom-Header': 'custom-value' }
      };

      strategy = new ZyntopiaOAuthStrategy(customConfig);

      const zyntopiaConfig = strategy.getZyntopiaConfig();
      expect(zyntopiaConfig.tokenEndpoint).toBe('https://custom-auth.zyntopia.com/oauth/token');
      expect(zyntopiaConfig.scopes).toBe('custom:scope1 custom:scope2');
      expect(zyntopiaConfig.tokenTimeoutMs).toBe(45000);
      expect(zyntopiaConfig.tokenRefreshBufferMs).toBe(600000);
      expect(zyntopiaConfig.customHeaders).toEqual({ 'X-Custom-Header': 'custom-value' });
    });
  });

  describe('environment methods', () => {
    it('should identify production environment correctly', () => {
      strategy = new ZyntopiaOAuthStrategy({ ...baseConfig, environment: 'production' });
      
      expect(strategy.getEnvironment()).toBe('production');
      expect(strategy.isProduction()).toBe(true);
      expect(strategy.isDevelopment()).toBe(false);
    });

    it('should identify staging environment correctly', () => {
      strategy = new ZyntopiaOAuthStrategy({ ...baseConfig, environment: 'staging' });
      
      expect(strategy.getEnvironment()).toBe('staging');
      expect(strategy.isProduction()).toBe(false);
      expect(strategy.isDevelopment()).toBe(true);
    });

    it('should identify development environment correctly', () => {
      strategy = new ZyntopiaOAuthStrategy({ ...baseConfig, environment: 'development' });
      
      expect(strategy.getEnvironment()).toBe('development');
      expect(strategy.isProduction()).toBe(false);
      expect(strategy.isDevelopment()).toBe(true);
    });
  });

  describe('static factory methods', () => {
    it('should create production strategy with forProduction', () => {
      strategy = ZyntopiaOAuthStrategy.forProduction('prod-client', 'prod-secret');
      
      const config = strategy.getZyntopiaConfig();
      expect(config.clientId).toBe('prod-client');
      expect(config.environment).toBe('production');
      expect(config.tokenEndpoint).toBe('https://auth.zyntopia.com/oauth/token');
      expect(config.scopes).toBe('zyntopia:read zyntopia:write zyntopia:admin');
    });

    it('should create production strategy with custom scopes', () => {
      strategy = ZyntopiaOAuthStrategy.forProduction('prod-client', 'prod-secret', 'custom:prod:scope');
      
      const config = strategy.getZyntopiaConfig();
      expect(config.scopes).toBe('custom:prod:scope');
    });

    it('should create staging strategy with forStaging', () => {
      strategy = ZyntopiaOAuthStrategy.forStaging('stage-client', 'stage-secret');
      
      const config = strategy.getZyntopiaConfig();
      expect(config.clientId).toBe('stage-client');
      expect(config.environment).toBe('staging');
      expect(config.tokenEndpoint).toBe('https://staging-auth.zyntopia.com/oauth/token');
      expect(config.scopes).toBe('zyntopia:read zyntopia:write zyntopia:admin zyntopia:debug');
    });

    it('should create development strategy with forDevelopment', () => {
      strategy = ZyntopiaOAuthStrategy.forDevelopment('dev-client', 'dev-secret');
      
      const config = strategy.getZyntopiaConfig();
      expect(config.clientId).toBe('dev-client');
      expect(config.environment).toBe('development');
      expect(config.tokenEndpoint).toBe('https://dev-auth.zyntopia.com/oauth/token');
      expect(config.scopes).toBe('zyntopia:read zyntopia:write zyntopia:admin zyntopia:debug zyntopia:test');
    });
  });

  describe('static utility methods', () => {
    it('should return correct default scopes for each environment', () => {
      expect(ZyntopiaOAuthStrategy.getDefaultScopes('production'))
        .toBe('zyntopia:read zyntopia:write zyntopia:admin');
      expect(ZyntopiaOAuthStrategy.getDefaultScopes('staging'))
        .toBe('zyntopia:read zyntopia:write zyntopia:admin zyntopia:debug');
      expect(ZyntopiaOAuthStrategy.getDefaultScopes('development'))
        .toBe('zyntopia:read zyntopia:write zyntopia:admin zyntopia:debug zyntopia:test');
    });

    it('should return correct token endpoints for each environment', () => {
      expect(ZyntopiaOAuthStrategy.getTokenEndpoint('production'))
        .toBe('https://auth.zyntopia.com/oauth/token');
      expect(ZyntopiaOAuthStrategy.getTokenEndpoint('staging'))
        .toBe('https://staging-auth.zyntopia.com/oauth/token');
      expect(ZyntopiaOAuthStrategy.getTokenEndpoint('development'))
        .toBe('https://dev-auth.zyntopia.com/oauth/token');
    });
  });

  describe('configuration validation', () => {
    it('should validate valid configuration', () => {
      expect(() => {
        ZyntopiaOAuthStrategy.validateZyntopiaConfig(baseConfig);
      }).not.toThrow();
    });

    it('should throw error for empty client ID', () => {
      const invalidConfig = { ...baseConfig, clientId: '' };
      expect(() => {
        ZyntopiaOAuthStrategy.validateZyntopiaConfig(invalidConfig);
      }).toThrow('Zyntopia client ID is required');
    });

    it('should throw error for empty client secret', () => {
      const invalidConfig = { ...baseConfig, clientSecret: '' };
      expect(() => {
        ZyntopiaOAuthStrategy.validateZyntopiaConfig(invalidConfig);
      }).toThrow('Zyntopia client secret is required');
    });

    it('should throw error for invalid environment', () => {
      const invalidConfig = { ...baseConfig, environment: 'invalid' as any };
      expect(() => {
        ZyntopiaOAuthStrategy.validateZyntopiaConfig(invalidConfig);
      }).toThrow('Zyntopia environment must be one of: production, staging, development');
    });

    it('should throw error for invalid timeout (too low)', () => {
      const invalidConfig = { ...baseConfig, tokenTimeoutMs: 500 };
      expect(() => {
        ZyntopiaOAuthStrategy.validateZyntopiaConfig(invalidConfig);
      }).toThrow('Zyntopia token timeout must be between 1000ms and 60000ms');
    });

    it('should throw error for invalid timeout (too high)', () => {
      const invalidConfig = { ...baseConfig, tokenTimeoutMs: 70000 };
      expect(() => {
        ZyntopiaOAuthStrategy.validateZyntopiaConfig(invalidConfig);
      }).toThrow('Zyntopia token timeout must be between 1000ms and 60000ms');
    });

    it('should throw error for invalid refresh buffer (too low)', () => {
      const invalidConfig = { ...baseConfig, tokenRefreshBufferMs: 15000 };
      expect(() => {
        ZyntopiaOAuthStrategy.validateZyntopiaConfig(invalidConfig);
      }).toThrow('Zyntopia token refresh buffer must be between 30000ms and 600000ms');
    });

    it('should throw error for invalid refresh buffer (too high)', () => {
      const invalidConfig = { ...baseConfig, tokenRefreshBufferMs: 700000 };
      expect(() => {
        ZyntopiaOAuthStrategy.validateZyntopiaConfig(invalidConfig);
      }).toThrow('Zyntopia token refresh buffer must be between 30000ms and 600000ms');
    });
  });

  describe('integration with GenericOAuthStrategy', () => {
    beforeEach(() => {
      strategy = new ZyntopiaOAuthStrategy(baseConfig);
    });

    it('should successfully get auth headers', async () => {
      // Mock successful token response
      const tokenResponse = {
        access_token: 'zyntopia-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tokenResponse)
      } as Response);

      const headers = await strategy.getAuthHeaders();
      
      expect(headers).toEqual({
        Authorization: 'Bearer zyntopia-access-token'
      });

      // Verify the request was made with Zyntopia-specific headers
      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.zyntopia.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'User-Agent': 'ART-Framework-Zyntopia/1.0',
            'X-Zyntopia-Client': 'art-framework',
            'X-Zyntopia-Environment': 'production'
          }),
          body: expect.stringContaining('grant_type=client_credentials')
        })
      );
    });

    it('should include custom headers in requests', async () => {
      const customConfig = {
        ...baseConfig,
        customHeaders: { 'X-Custom-Zyntopia-Header': 'custom-value' }
      };
      strategy = new ZyntopiaOAuthStrategy(customConfig);

      const tokenResponse = {
        access_token: 'zyntopia-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tokenResponse)
      } as Response);

      await strategy.getAuthHeaders();
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.zyntopia.com/oauth/token',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Zyntopia-Header': 'custom-value'
          })
        })
      );
    });

    it('should include correct scopes in token request', async () => {
      const tokenResponse = {
        access_token: 'zyntopia-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tokenResponse)
      } as Response);

      await strategy.getAuthHeaders();
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.zyntopia.com/oauth/token',
        expect.objectContaining({
          body: expect.stringContaining('scope=zyntopia%3Aread+zyntopia%3Awrite+zyntopia%3Aadmin')
        })
      );
    });
  });

  describe('configuration security', () => {
    it('should exclude client secret from getZyntopiaConfig', () => {
      strategy = new ZyntopiaOAuthStrategy(baseConfig);
      
      const config = strategy.getZyntopiaConfig();
      expect(config).not.toHaveProperty('clientSecret');
      expect(config.clientId).toBe('zyntopia-client-id');
    });

    it('should exclude client secret from base strategy config', () => {
      strategy = new ZyntopiaOAuthStrategy(baseConfig);
      
      const strategyConfig = strategy.getConfig();
      expect(strategyConfig).not.toHaveProperty('clientSecret');
      expect(strategyConfig.clientId).toBe('zyntopia-client-id');
    });
  });
}); 