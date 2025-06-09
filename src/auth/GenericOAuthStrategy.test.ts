import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { GenericOAuthStrategy, type OAuthConfig } from './GenericOAuthStrategy';
import { ARTError, ErrorCode } from '../errors';

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

describe('GenericOAuthStrategy', () => {
  let strategy: GenericOAuthStrategy;
  let baseConfig: OAuthConfig;

  beforeEach(() => {
    baseConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tokenEndpoint: 'https://auth.example.com/oauth/token',
      scopes: 'read write',
      grantType: 'client_credentials'
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
    it('should create strategy with valid config', () => {
      expect(() => new GenericOAuthStrategy(baseConfig)).not.toThrow();
    });

    it('should apply default values', () => {
      strategy = new GenericOAuthStrategy(baseConfig);
      const config = strategy.getConfig();
      
      expect(config.grantType).toBe('client_credentials');
      expect(config.tokenTimeoutMs).toBe(30000);
      expect(config.tokenRefreshBufferMs).toBe(300000);
    });

    it('should throw error for empty client ID', () => {
      const invalidConfig = { ...baseConfig, clientId: '' };
      expect(() => new GenericOAuthStrategy(invalidConfig)).toThrow(ARTError);
      expect(() => new GenericOAuthStrategy(invalidConfig)).toThrow('OAuth client ID cannot be empty');
    });

    it('should throw error for empty client secret', () => {
      const invalidConfig = { ...baseConfig, clientSecret: '' };
      expect(() => new GenericOAuthStrategy(invalidConfig)).toThrow(ARTError);
      expect(() => new GenericOAuthStrategy(invalidConfig)).toThrow('OAuth client secret cannot be empty');
    });

    it('should throw error for empty token endpoint', () => {
      const invalidConfig = { ...baseConfig, tokenEndpoint: '' };
      expect(() => new GenericOAuthStrategy(invalidConfig)).toThrow(ARTError);
      expect(() => new GenericOAuthStrategy(invalidConfig)).toThrow('OAuth token endpoint cannot be empty');
    });

    it('should throw error for invalid token endpoint URL', () => {
      const invalidConfig = { ...baseConfig, tokenEndpoint: 'not-a-url' };
      expect(() => new GenericOAuthStrategy(invalidConfig)).toThrow(ARTError);
      expect(() => new GenericOAuthStrategy(invalidConfig)).toThrow('Invalid OAuth token endpoint URL');
    });
  });

  describe('getAuthHeaders', () => {
    beforeEach(() => {
      strategy = new GenericOAuthStrategy(baseConfig);
    });

    it('should get auth headers with client credentials flow', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
        status: 200,
        statusText: 'OK'
      } as Response);

      const headers = await strategy.getAuthHeaders();

      expect(headers).toEqual({
        'Authorization': 'Bearer test-access-token'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://auth.example.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: expect.stringContaining('grant_type=client_credentials')
        })
      );
    });

    it('should use cached token on subsequent calls', async () => {
      const mockTokenResponse = {
        access_token: 'cached-token',
        token_type: 'Bearer',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      } as Response);

      // First call
      await strategy.getAuthHeaders();
      
      // Second call - should use cache
      const headers = await strategy.getAuthHeaders();

      expect(headers).toEqual({
        'Authorization': 'Bearer cached-token'
      });

      // Should only call fetch once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should refresh token when it expires', async () => {
      // Mock short-lived token
      const firstTokenResponse = {
        access_token: 'first-token',
        token_type: 'Bearer',
        expires_in: 1 // 1 second
      };

      const secondTokenResponse = {
        access_token: 'refreshed-token',
        token_type: 'Bearer',
        expires_in: 3600
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(firstTokenResponse)
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(secondTokenResponse)
        } as Response);

      // Get first token
      await strategy.getAuthHeaders();

      // Wait for token to expire (considering the 5-minute buffer)
      vi.advanceTimersByTime(1000 + 300000); // 1 second + buffer

      // This should trigger a refresh
      const headers = await strategy.getAuthHeaders();

      expect(headers).toEqual({
        'Authorization': 'Bearer refreshed-token'
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle token request failure', async () => {
      // Clear any cached tokens
      strategy.clearTokenCache();
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('invalid_client')
      } as Response);

      await expect(strategy.getAuthHeaders()).rejects.toThrow(ARTError);
      await expect(strategy.getAuthHeaders()).rejects.toThrow('Failed to get OAuth authentication headers');
    });

    it('should handle network error', async () => {
      // Clear any cached tokens
      strategy.clearTokenCache();
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(strategy.getAuthHeaders()).rejects.toThrow(ARTError);
      await expect(strategy.getAuthHeaders()).rejects.toThrow('Failed to get OAuth authentication headers');
    });

    it('should handle timeout', async () => {
      // Create a strategy with short timeout
      const timeoutConfig = { ...baseConfig, tokenTimeoutMs: 100 };
      strategy = new GenericOAuthStrategy(timeoutConfig);

      // Clear any cached tokens
      strategy.clearTokenCache();

      // Mock AbortController to simulate timeout
      const mockAbort = vi.fn();
      const mockController = { abort: mockAbort, signal: {} as AbortSignal };
      const originalAbortController = global.AbortController;
      global.AbortController = vi.fn(() => mockController) as any;

      // Mock fetch to simulate timeout by rejecting with AbortError
      mockFetch.mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'));

      try {
        await expect(strategy.getAuthHeaders()).rejects.toThrow(ARTError);
      } finally {
        // Restore original AbortController
        global.AbortController = originalAbortController;
      }
    });

    it('should include scopes in token request', async () => {
      const mockTokenResponse = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      } as Response);

      await strategy.getAuthHeaders();

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = fetchCall[1]?.body as string;
      
      expect(requestBody).toContain('scope=read+write');
    });

    it('should include custom headers in token request', async () => {
      const configWithHeaders = {
        ...baseConfig,
        tokenRequestHeaders: {
          'Custom-Header': 'custom-value',
          'User-Agent': 'test-agent'
        }
      };

      strategy = new GenericOAuthStrategy(configWithHeaders);

      const mockTokenResponse = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      } as Response);

      await strategy.getAuthHeaders();

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1]?.headers as Record<string, string>;
      
      expect(headers['Custom-Header']).toBe('custom-value');
      expect(headers['User-Agent']).toBe('test-agent');
    });
  });

  describe('token management', () => {
    beforeEach(() => {
      strategy = new GenericOAuthStrategy(baseConfig);
    });

    it('should handle missing access_token in response', async () => {
      // Clear any cached tokens
      strategy.clearTokenCache();
      
      const invalidResponse = {
        token_type: 'Bearer',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(invalidResponse)
      } as Response);

      await expect(strategy.getAuthHeaders()).rejects.toThrow(ARTError);
      await expect(strategy.getAuthHeaders()).rejects.toThrow('Failed to get OAuth authentication headers');
    });

    it('should default to Bearer token type', async () => {
      const responseWithoutTokenType = {
        access_token: 'test-token',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseWithoutTokenType)
      } as Response);

      const headers = await strategy.getAuthHeaders();
      expect(headers['Authorization']).toBe('Bearer test-token');
    });

    it('should default to 1 hour expiry', async () => {
      const responseWithoutExpiry = {
        access_token: 'test-token',
        token_type: 'Bearer'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseWithoutExpiry)
      } as Response);

      await strategy.getAuthHeaders();
      
      const tokenInfo = strategy.getTokenInfo();
      expect(tokenInfo).not.toBeNull();
      
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 3600 * 1000);
      const actualExpiry = tokenInfo!.expiresAt;
      
      // Allow for small timing differences (within 1 second)
      expect(Math.abs(actualExpiry.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });
  });

  describe('public methods', () => {
    beforeEach(() => {
      strategy = new GenericOAuthStrategy(baseConfig);
    });

    it('should manually refresh token', async () => {
      const tokenResponse = {
        access_token: 'refreshed-token',
        token_type: 'Bearer',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tokenResponse)
      } as Response);

      const headers = await strategy.refreshToken();
      
      expect(headers).toEqual({
        'Authorization': 'Bearer refreshed-token'
      });
    });

    it('should clear token cache', async () => {
      // First get a token
      const tokenResponse = {
        access_token: 'initial-token',
        token_type: 'Bearer',
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tokenResponse)
      } as Response);

      await strategy.getAuthHeaders();
      expect(strategy.getTokenInfo()).not.toBeNull();

      // Clear cache
      strategy.clearTokenCache();
      expect(strategy.getTokenInfo()).toBeNull();
    });

    it('should get token info', async () => {
      const tokenResponse = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read write',
        refresh_token: 'refresh-123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(tokenResponse)
      } as Response);

      await strategy.getAuthHeaders();
      
      const tokenInfo = strategy.getTokenInfo();
      expect(tokenInfo).not.toBeNull();
      expect(tokenInfo!.scope).toBe('read write');
      expect(tokenInfo!.hasRefreshToken).toBe(true);
      expect(tokenInfo!.expiresAt).toBeInstanceOf(Date);
    });

    it('should get config without secrets', () => {
      const config = strategy.getConfig();
      
      expect(config).toEqual({
        clientId: 'test-client-id',
        tokenEndpoint: 'https://auth.example.com/oauth/token',
        scopes: 'read write',
        grantType: 'client_credentials',
        tokenRequestHeaders: undefined,
        tokenTimeoutMs: 30000,
        tokenRefreshBufferMs: 300000
      });

      // Should not include client secret
      expect('clientSecret' in config).toBe(false);
    });
  });

  describe('concurrent token requests', () => {
    beforeEach(() => {
      strategy = new GenericOAuthStrategy(baseConfig);
    });

    it('should handle concurrent token requests gracefully', async () => {
      const tokenResponse = {
        access_token: 'concurrent-token',
        token_type: 'Bearer',
        expires_in: 3600
      };

      // Mock a slow response
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(slowPromise);

      // Start multiple concurrent requests
      const promise1 = strategy.getAuthHeaders();
      const promise2 = strategy.getAuthHeaders();
      const promise3 = strategy.getAuthHeaders();

      // Resolve the fetch promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve(tokenResponse)
      });

      // All should return the same result
      const [headers1, headers2, headers3] = await Promise.all([promise1, promise2, promise3]);
      
      expect(headers1).toEqual(headers2);
      expect(headers2).toEqual(headers3);
      expect(headers1).toEqual({
        'Authorization': 'Bearer concurrent-token'
      });

      // Should only call fetch once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
}); 