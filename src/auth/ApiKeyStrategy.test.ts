import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiKeyStrategy } from './ApiKeyStrategy';

// Mock the Logger if needed
vi.mock('../utils/logger', () => ({
  Logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

describe('ApiKeyStrategy', () => {
  let strategy: ApiKeyStrategy;

  describe('constructor', () => {
    it('should create strategy with valid API key (default Authorization header)', () => {
      expect(() => new ApiKeyStrategy('test-api-key')).not.toThrow();
      
      strategy = new ApiKeyStrategy('test-api-key');
      expect(strategy.getHeaderName()).toBe('Authorization');
      expect(strategy.isUsingAuthorizationHeader()).toBe(true);
    });

    it('should create strategy with valid API key and custom header', () => {
      expect(() => new ApiKeyStrategy('test-api-key', 'X-API-Key')).not.toThrow();
      
      strategy = new ApiKeyStrategy('test-api-key', 'X-API-Key');
      expect(strategy.getHeaderName()).toBe('X-API-Key');
      expect(strategy.isUsingAuthorizationHeader()).toBe(false);
    });

    it('should throw error for empty API key', () => {
      expect(() => new ApiKeyStrategy('')).toThrow('API key cannot be empty or null');
    });

    it('should throw error for null API key', () => {
      expect(() => new ApiKeyStrategy(null as any)).toThrow('API key cannot be empty or null');
    });

    it('should throw error for undefined API key', () => {
      expect(() => new ApiKeyStrategy(undefined as any)).toThrow('API key cannot be empty or null');
    });

    it('should throw error for whitespace-only API key', () => {
      expect(() => new ApiKeyStrategy('   ')).toThrow('API key cannot be empty or null');
    });

    it('should throw error for empty header name', () => {
      expect(() => new ApiKeyStrategy('test-key', '')).toThrow('Header name cannot be empty or null');
    });

    it('should throw error for null header name', () => {
      expect(() => new ApiKeyStrategy('test-key', null as any)).toThrow('Header name cannot be empty or null');
    });

    it('should use default header name when undefined header name is provided', () => {
      // The constructor uses default parameter, so undefined results in default 'Authorization' header
      const strategy = new ApiKeyStrategy('test-key', undefined as any);
      expect(strategy.getHeaderName()).toBe('Authorization');
      expect(strategy.isUsingAuthorizationHeader()).toBe(true);
    });

    it('should throw error for whitespace-only header name', () => {
      expect(() => new ApiKeyStrategy('test-key', '   ')).toThrow('Header name cannot be empty or null');
    });
  });

  describe('getAuthHeaders', () => {
    describe('with Authorization header (default)', () => {
      beforeEach(() => {
        strategy = new ApiKeyStrategy('test-api-key-123');
      });

      it('should generate Bearer token format for Authorization header', async () => {
        const headers = await strategy.getAuthHeaders();
        
        expect(headers).toEqual({
          'Authorization': 'Bearer test-api-key-123'
        });
      });

      it('should return same headers on multiple calls', async () => {
        const headers1 = await strategy.getAuthHeaders();
        const headers2 = await strategy.getAuthHeaders();
        
        expect(headers1).toEqual(headers2);
        expect(headers1).toEqual({
          'Authorization': 'Bearer test-api-key-123'
        });
      });

      it('should handle special characters in API key', async () => {
        const specialKeyStrategy = new ApiKeyStrategy('sk-1234567890abcdef!@#$%^&*()');
        const headers = await specialKeyStrategy.getAuthHeaders();
        
        expect(headers).toEqual({
          'Authorization': 'Bearer sk-1234567890abcdef!@#$%^&*()'
        });
      });

      it('should handle very long API key', async () => {
        const longKey = 'a'.repeat(1000);
        const longKeyStrategy = new ApiKeyStrategy(longKey);
        const headers = await longKeyStrategy.getAuthHeaders();
        
        expect(headers).toEqual({
          'Authorization': `Bearer ${longKey}`
        });
      });
    });

    describe('with custom header', () => {
      beforeEach(() => {
        strategy = new ApiKeyStrategy('custom-api-key-456', 'X-API-Key');
      });

      it('should use plain key value for custom headers', async () => {
        const headers = await strategy.getAuthHeaders();
        
        expect(headers).toEqual({
          'X-API-Key': 'custom-api-key-456'
        });
      });

      it('should support different custom header names', async () => {
        const strategies = [
          { strategy: new ApiKeyStrategy('key1', 'X-Custom-Auth'), expected: { 'X-Custom-Auth': 'key1' } },
          { strategy: new ApiKeyStrategy('key2', 'Api-Token'), expected: { 'Api-Token': 'key2' } },
          { strategy: new ApiKeyStrategy('key3', 'X-Service-Key'), expected: { 'X-Service-Key': 'key3' } },
          { strategy: new ApiKeyStrategy('key4', 'Authentication'), expected: { 'Authentication': 'key4' } }
        ];

        for (const { strategy: testStrategy, expected } of strategies) {
          const headers = await testStrategy.getAuthHeaders();
          expect(headers).toEqual(expected);
        }
      });

      it('should handle case-sensitive header names', async () => {
        const lowerCaseStrategy = new ApiKeyStrategy('key1', 'x-api-key');
        const upperCaseStrategy = new ApiKeyStrategy('key2', 'X-API-KEY');
        const mixedCaseStrategy = new ApiKeyStrategy('key3', 'X-Api-Key');

        const lowerHeaders = await lowerCaseStrategy.getAuthHeaders();
        const upperHeaders = await upperCaseStrategy.getAuthHeaders();
        const mixedHeaders = await mixedCaseStrategy.getAuthHeaders();

        expect(lowerHeaders).toEqual({ 'x-api-key': 'key1' });
        expect(upperHeaders).toEqual({ 'X-API-KEY': 'key2' });
        expect(mixedHeaders).toEqual({ 'X-Api-Key': 'key3' });
      });
    });

    describe('edge cases and special scenarios', () => {
      it('should handle Authorization header with different casing', async () => {
        // Test that exact string comparison works correctly
        const authStrategy = new ApiKeyStrategy('auth-key', 'Authorization');
        const authLowerStrategy = new ApiKeyStrategy('auth-lower-key', 'authorization');
        
        const authHeaders = await authStrategy.getAuthHeaders();
        const authLowerHeaders = await authLowerStrategy.getAuthHeaders();
        
        expect(authHeaders).toEqual({ 'Authorization': 'Bearer auth-key' });
        expect(authLowerHeaders).toEqual({ 'authorization': 'auth-lower-key' }); // Should not use Bearer format
      });

      it('should handle headers that contain "Authorization" as substring', async () => {
        const authPrefixStrategy = new ApiKeyStrategy('prefix-key', 'Authorization-Custom');
        const authSuffixStrategy = new ApiKeyStrategy('suffix-key', 'X-Authorization');
        
        const prefixHeaders = await authPrefixStrategy.getAuthHeaders();
        const suffixHeaders = await authSuffixStrategy.getAuthHeaders();
        
        expect(prefixHeaders).toEqual({ 'Authorization-Custom': 'prefix-key' });
        expect(suffixHeaders).toEqual({ 'X-Authorization': 'suffix-key' });
      });

      it('should return a new object on each call (immutability)', async () => {
        strategy = new ApiKeyStrategy('immutable-test');
        
        const headers1 = await strategy.getAuthHeaders();
        const headers2 = await strategy.getAuthHeaders();
        
        // Should be equal but not the same object
        expect(headers1).toEqual(headers2);
        expect(headers1).not.toBe(headers2);
        
        // Modifying one should not affect the other
        (headers1 as any).newProperty = 'test';
        expect(headers2).not.toHaveProperty('newProperty');
      });
    });
  });

  describe('getHeaderName', () => {
    it('should return the configured header name', () => {
      const defaultStrategy = new ApiKeyStrategy('key1');
      const customStrategy = new ApiKeyStrategy('key2', 'X-Custom-Header');
      
      expect(defaultStrategy.getHeaderName()).toBe('Authorization');
      expect(customStrategy.getHeaderName()).toBe('X-Custom-Header');
    });

    it('should return the exact header name provided', () => {
      const testCases = [
        'Authorization',
        'X-API-Key',
        'Api-Token',
        'custom-header',
        'UPPER-CASE-HEADER',
        'Mixed-Case-Header'
      ];
      
      testCases.forEach(headerName => {
        const strategy = new ApiKeyStrategy('test-key', headerName);
        expect(strategy.getHeaderName()).toBe(headerName);
      });
    });
  });

  describe('isUsingAuthorizationHeader', () => {
    it('should return true for default Authorization header', () => {
      strategy = new ApiKeyStrategy('test-key');
      expect(strategy.isUsingAuthorizationHeader()).toBe(true);
    });

    it('should return true for explicit Authorization header', () => {
      strategy = new ApiKeyStrategy('test-key', 'Authorization');
      expect(strategy.isUsingAuthorizationHeader()).toBe(true);
    });

    it('should return false for custom headers', () => {
      const customHeaders = [
        'X-API-Key',
        'Api-Token',
        'authorization', // lowercase
        'AUTHORIZATION', // uppercase
        'X-Authorization',
        'Authorization-Custom'
      ];
      
      customHeaders.forEach(headerName => {
        const strategy = new ApiKeyStrategy('test-key', headerName);
        expect(strategy.isUsingAuthorizationHeader()).toBe(false);
      });
    });

    it('should be case-sensitive for Authorization header check', () => {
      const exactMatch = new ApiKeyStrategy('key1', 'Authorization');
      const lowerCase = new ApiKeyStrategy('key2', 'authorization');
      const upperCase = new ApiKeyStrategy('key3', 'AUTHORIZATION');
      const mixed = new ApiKeyStrategy('key4', 'AuthoRizaTion');
      
      expect(exactMatch.isUsingAuthorizationHeader()).toBe(true);
      expect(lowerCase.isUsingAuthorizationHeader()).toBe(false);
      expect(upperCase.isUsingAuthorizationHeader()).toBe(false);
      expect(mixed.isUsingAuthorizationHeader()).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should work with different service patterns', async () => {
      // Common API key patterns for different services
      const serviceConfigs = [
        // OpenAI style
        { key: 'sk-1234567890abcdef1234567890abcdef', header: 'Authorization', expected: 'Bearer sk-1234567890abcdef1234567890abcdef' },
        // Custom API key header
        { key: 'abc123def456', header: 'X-API-Key', expected: 'abc123def456' },
        // Service token
        { key: 'svc_token_123456789', header: 'X-Service-Token', expected: 'svc_token_123456789' },
        // Auth token (but not Authorization header)
        { key: 'auth_12345', header: 'Auth-Token', expected: 'auth_12345' }
      ];

      for (const config of serviceConfigs) {
        const strategy = new ApiKeyStrategy(config.key, config.header);
        const headers = await strategy.getAuthHeaders();
        
        expect(headers[config.header]).toBe(config.expected);
        
        // Verify helper methods
        expect(strategy.getHeaderName()).toBe(config.header);
        expect(strategy.isUsingAuthorizationHeader()).toBe(config.header === 'Authorization');
      }
    });

    it('should handle concurrent header generation requests', async () => {
      strategy = new ApiKeyStrategy('concurrent-test-key');
      
      // Make multiple concurrent requests
      const promises = Array.from({ length: 10 }, () => strategy.getAuthHeaders());
      const results = await Promise.all(promises);
      
      // All should return the same headers
      const expected = { 'Authorization': 'Bearer concurrent-test-key' };
      results.forEach(headers => {
        expect(headers).toEqual(expected);
      });
    });

    it('should be memory efficient with repeated calls', async () => {
      strategy = new ApiKeyStrategy('memory-test-key', 'X-Memory-Test');
      
      // Make many repeated calls
      for (let i = 0; i < 100; i++) {
        const headers = await strategy.getAuthHeaders();
        expect(headers).toEqual({ 'X-Memory-Test': 'memory-test-key' });
      }
      
      // Should still work correctly
      expect(strategy.getHeaderName()).toBe('X-Memory-Test');
      expect(strategy.isUsingAuthorizationHeader()).toBe(false);
    });
  });

  describe('error handling and robustness', () => {
    it('should handle extremely long header names', () => {
      const longHeaderName = 'X-' + 'Very-Long-Header-Name-'.repeat(50);
      expect(() => new ApiKeyStrategy('test-key', longHeaderName)).not.toThrow();
      
      const strategy = new ApiKeyStrategy('test-key', longHeaderName);
      expect(strategy.getHeaderName()).toBe(longHeaderName);
    });

    it('should handle special characters in header names', () => {
      // Valid HTTP header characters
      const specialHeaderNames = [
        'X-API-Key',
        'X_API_KEY',
        'X.API.Key',
        'Custom123Header',
        'Header-With-Numbers-123'
      ];
      
      specialHeaderNames.forEach(headerName => {
        expect(() => new ApiKeyStrategy('test-key', headerName)).not.toThrow();
        const strategy = new ApiKeyStrategy('test-key', headerName);
        expect(strategy.getHeaderName()).toBe(headerName);
      });
    });

    it('should maintain state integrity after repeated operations', async () => {
      strategy = new ApiKeyStrategy('integrity-test', 'X-Integrity');
      
      // Perform various operations
      for (let i = 0; i < 50; i++) {
        await strategy.getAuthHeaders();
        strategy.getHeaderName();
        strategy.isUsingAuthorizationHeader();
      }
      
      // Verify state is still correct
      const finalHeaders = await strategy.getAuthHeaders();
      expect(finalHeaders).toEqual({ 'X-Integrity': 'integrity-test' });
      expect(strategy.getHeaderName()).toBe('X-Integrity');
      expect(strategy.isUsingAuthorizationHeader()).toBe(false);
    });
  });
}); 