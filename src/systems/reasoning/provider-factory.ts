// src/systems/reasoning/provider-factory.ts
import { ProviderAdapter } from '../../core/interfaces';
import { OpenAIAdapter, OpenAIAdapterOptions } from '../../adapters/reasoning/openai';
import { AnthropicAdapter, AnthropicAdapterOptions } from '../../adapters/reasoning/anthropic';
import { GeminiAdapter, GeminiAdapterOptions } from '../../adapters/reasoning/gemini';
import { DeepSeekAdapter, DeepSeekAdapterOptions } from '../../adapters/reasoning/deepseek';
import { OpenRouterAdapter, OpenRouterAdapterOptions } from '../../adapters/reasoning/openrouter';
import { Logger } from '../../utils/logger';

// Union type for all possible adapter options
type AdapterOptions =
  | ({ provider: 'openai' } & OpenAIAdapterOptions)
  | ({ provider: 'anthropic' } & AnthropicAdapterOptions)
  | ({ provider: 'gemini' } & GeminiAdapterOptions)
  | ({ provider: 'deepseek' } & DeepSeekAdapterOptions)
  | ({ provider: 'openrouter' } & OpenRouterAdapterOptions);

// Configuration structure expected by the factory
export type ProviderFactoryConfig = AdapterOptions; // Use type alias for union


export class ProviderFactory {
  /**
   * Create provider adapters from an array of configurations.
   * @param configs - An array of ProviderFactoryConfig objects.
   * @returns A record mapping provider names to their adapter instances.
   */
  static createProviders(configs: ProviderFactoryConfig[]): Record<string, ProviderAdapter> {
    const providers: Record<string, ProviderAdapter> = {};

    if (!configs || configs.length === 0) {
        Logger.warn('ProviderFactory.createProviders called with empty or invalid config array.');
        return providers;
    }

    for (const config of configs) {
      try {
        // Ensure provider name matches the config type (though TypeScript handles this)
        if (!config.provider) {
            Logger.error('Provider config missing provider name.', { config });
            continue;
        }
        // Avoid creating duplicate providers if the same name appears multiple times
        if (providers[config.provider]) {
            Logger.warn(`Provider '${config.provider}' already configured. Skipping duplicate configuration.`);
            continue;
        }
        providers[config.provider] = ProviderFactory.createProvider(config);
        Logger.debug(`Created provider adapter for: ${config.provider}`);
      } catch (error: any) {
        Logger.error(`Failed to create provider adapter for '${config.provider || 'unknown'}': ${error.message}`, { config, error });
      }
    }

    if (Object.keys(providers).length === 0) {
        Logger.warn('ProviderFactory.createProviders did not successfully create any providers.');
    }

    return providers;
  }

  /**
   * Create a single provider adapter based on its configuration.
   * @param config - The configuration object for the specific provider.
   * @returns An instance of the corresponding ProviderAdapter.
   * @throws Error if the provider type is unsupported or config is invalid.
   */
  static createProvider(config: ProviderFactoryConfig): ProviderAdapter {
    switch (config.provider) {
      case 'openai':
        // Type assertion needed because TypeScript can't automatically narrow the union based on config.provider here
        return new OpenAIAdapter(config as OpenAIAdapterOptions);

      case 'anthropic':
        return new AnthropicAdapter(config as AnthropicAdapterOptions);

      case 'gemini':
        return new GeminiAdapter(config as GeminiAdapterOptions);

      case 'deepseek':
        return new DeepSeekAdapter(config as DeepSeekAdapterOptions);

      case 'openrouter':
         // OpenRouter requires the model in its options, ensure it's passed
         if (!(config as OpenRouterAdapterOptions).model) {
             throw new Error("OpenRouterAdapter requires 'model' in its configuration options.");
         }
        return new OpenRouterAdapter(config as OpenRouterAdapterOptions);

      default: { // Added block scope
        // Handle cases where config.provider might be an unexpected value
        const unknownProvider = (config as any).provider || 'unknown';
        throw new Error(`Unsupported provider type: ${unknownProvider}`);
      }
    }
  }
}