import { IAuthStrategy } from '../../core/interfaces';
import { ARTError, ErrorCode } from '../../errors';
import { Logger } from '../../utils/logger';

/**
 * Central authentication manager for handling multiple authentication strategies.
 * Manages registration and retrieval of different auth strategies for secure connections
 * to remote services like MCP servers and A2A agents.
 */
export class AuthManager {
  private strategies = new Map<string, IAuthStrategy>();

  constructor() {
    Logger.info('AuthManager initialized.');
  }

  /**
   * Registers an authentication strategy with the given ID.
   * @param strategyId - Unique identifier for the strategy (e.g., 'default_zyntopia_auth', 'api_key_strategy')
   * @param strategy - Implementation of IAuthStrategy
   * @throws {ARTError} If strategyId is empty or null
   */
  public registerStrategy(strategyId: string, strategy: IAuthStrategy): void {
    if (!strategyId || strategyId.trim() === '') {
      throw new ARTError('Strategy ID cannot be empty or null', ErrorCode.INVALID_CONFIG);
    }

    if (this.strategies.has(strategyId)) {
      Logger.warn(`AuthManager: Overwriting existing auth strategy with ID: ${strategyId}`);
    }
    
    this.strategies.set(strategyId, strategy);
    Logger.debug(`AuthManager: Registered strategy '${strategyId}'.`);
  }

  /**
   * Retrieves authentication headers from the specified strategy.
   * @param strategyId - The ID of the registered strategy to use
   * @returns Promise resolving to authentication headers
   * @throws {ARTError} If strategy is not found or authentication fails
   */
  public async getHeaders(strategyId: string): Promise<Record<string, string>> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      // Convention: If a Zyntopia-related auth is needed but not found, guide the developer.
      if (strategyId.includes('zyntopia')) {
        Logger.error(`AuthManager: Strategy '${strategyId}' not found. Did you register a ZyntopiaOAuthStrategy with the ID 'default_zyntopia_auth'?`);
      }
      throw new ARTError(`Authentication strategy with ID '${strategyId}' not found.`, ErrorCode.INVALID_CONFIG);
    }

    try {
      return await strategy.getAuthHeaders();
    } catch (error) {
      const message = `Failed to get authentication headers from strategy '${strategyId}'`;
      Logger.error(message, error);
      throw new ARTError(message, ErrorCode.LLM_PROVIDER_ERROR, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Checks if a strategy with the given ID is registered.
   * @param strategyId - The ID to check
   * @returns True if the strategy exists, false otherwise
   */
  public hasStrategy(strategyId: string): boolean {
    return this.strategies.has(strategyId);
  }

  /**
   * Lists all registered strategy IDs.
   * @returns Array of registered strategy IDs
   */
  public getRegisteredStrategyIds(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Removes a registered strategy.
   * @param strategyId - The ID of the strategy to remove
   * @returns True if strategy was removed, false if it didn't exist
   */
  public removeStrategy(strategyId: string): boolean {
    const removed = this.strategies.delete(strategyId);
    if (removed) {
      Logger.debug(`AuthManager: Removed strategy '${strategyId}'.`);
    }
    return removed;
  }

  /**
   * Clears all registered strategies.
   * Useful for testing or complete reconfiguration.
   */
  public clearAllStrategies(): void {
    const count = this.strategies.size;
    this.strategies.clear();
    Logger.debug(`AuthManager: Cleared ${count} strategies.`);
  }
} 