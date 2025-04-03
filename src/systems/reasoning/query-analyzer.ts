// src/systems/reasoning/query-analyzer.ts
import { ModelCapability } from './model-registry';
import { Logger } from '../../utils/logger';

export class QueryAnalyzer {
  /**
   * Analyze a query string to determine required capabilities
   */
  analyzeQuery(query: string): ModelCapability[] {
    const requiredCapabilities: Set<ModelCapability> = new Set([ModelCapability.TEXT]);

    try {
      // Check for image content (basic check for URLs or data URIs)
      if (query.includes('data:image') ||
          /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp)(\?[^\s]*)?/i.test(query)) {
        requiredCapabilities.add(ModelCapability.VISION);
      }

      // Check for code-related queries (keywords or code blocks)
      if (/\b(code|function|class|interface|type|const|let|var|import|export|require|module|def|pip|npm|yarn|git|docker|kubernetes|terraform|ansible|bash|shell|script|debug|error|stacktrace)\b/i.test(query) ||
          /```[\s\S]*?```/.test(query)) { // Check for markdown code blocks
        requiredCapabilities.add(ModelCapability.CODE);
      }

      // Check for complex reasoning queries (keywords suggesting analysis, comparison, etc.)
      if (/\b(analyze|compare|contrast|evaluate|optimize|summarize|explain|reason about|derive|deduce|plan|strategize)\b/i.test(query)) {
        requiredCapabilities.add(ModelCapability.REASONING);
      }

      // Convert Set back to Array
      const finalCapabilities = Array.from(requiredCapabilities);
      Logger.debug(`QueryAnalyzer detected capabilities: ${finalCapabilities.join(', ')}`);
      return finalCapabilities;
    } catch (error: any) {
      Logger.warn(`QueryAnalyzer error: ${error.message}`, { error });
      return [ModelCapability.TEXT]; // Default to basic text on error
    }
  }
}