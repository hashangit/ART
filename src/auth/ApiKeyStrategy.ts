import { IAuthStrategy } from '../core/interfaces';

/**
 * Simple API key authentication strategy.
 * Supports configurable header names for different service requirements.
 */
export class ApiKeyStrategy implements IAuthStrategy {
  /**
   * Creates a new API key authentication strategy.
   * @param apiKey - The API key to use for authentication
   * @param headerName - The header name to use (defaults to 'Authorization')
   */
  constructor(
    private readonly apiKey: string,
    private readonly headerName: string = 'Authorization'
  ) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key cannot be empty or null');
    }
    if (!headerName || headerName.trim() === '') {
      throw new Error('Header name cannot be empty or null');
    }
  }

  /**
   * Generates authentication headers for API key-based authentication.
   * Uses Bearer token format for Authorization header, plain key for custom headers.
   * @returns Promise resolving to authentication headers
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    // Use Bearer token format for Authorization header, plain key for custom headers
    const value = this.headerName === 'Authorization' 
      ? `Bearer ${this.apiKey}` 
      : this.apiKey;
    
    return { [this.headerName]: value };
  }

  /**
   * Gets the configured header name for this strategy.
   * @returns The header name that will be used
   */
  public getHeaderName(): string {
    return this.headerName;
  }

  /**
   * Checks if this strategy uses the standard Authorization header.
   * @returns True if using Authorization header, false for custom headers
   */
  public isUsingAuthorizationHeader(): boolean {
    return this.headerName === 'Authorization';
  }
} 