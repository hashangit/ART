import { Logger } from '@/utils/logger';
import { ARTError, ErrorCode } from '@/errors';
import { A2AAgentInfo } from '@/types';

/**
 * Interface for A2A Agent Card as defined in the A2A protocol standards.
 * This represents the digital "business card" that agents use to advertise their capabilities.
 */
export interface A2AAgentCard {
  /** Unique identifier for the agent */
  id: string;
  /** Human-readable name of the agent */
  name: string;
  /** Version of the agent */
  version: string;
  /** Brief description of what the agent does */
  description: string;
  /** Agent category (e.g., 'healthcare', 'research', 'analytics') */
  category: string;
  /** Base endpoint URL for A2A communication */
  endpoint: string;
  /** Array of capabilities the agent can perform */
  capabilities: string[];
  /** Authentication requirements */
  authentication: {
    type: string;
    required: boolean;
  };
  /** Input schema definition */
  inputSchema?: {
    type: string;
    properties: Record<string, any>;
  };
  /** Output schema definition */
  outputSchema?: {
    type: string;
    properties: Record<string, any>;
  };
  /** Rate limiting information */
  rateLimits?: {
    requestsPerMinute: number;
  };
  /** Tags for categorization */
  tags?: string[];
}

/**
 * Response structure from the discovery endpoint
 */
export interface DiscoveryResponse {
  services: Array<{
    id: string;
    service_type: string;
    card_data: A2AAgentCard;
    status: string;
    owner_id?: string;
    created_at: string;
    updated_at: string;
  }>;
  count: number;
  timestamp: string;
}

/**
 * Configuration for the AgentDiscoveryService
 */
export interface AgentDiscoveryConfig {
  /** Base URL for the discovery endpoint. If not provided, a default will be used. */
  discoveryEndpoint?: string;
  /** Timeout for discovery requests in milliseconds */
  timeoutMs?: number;
  /** Whether to cache discovered agents */
  enableCaching?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtlMs?: number;
}

/**
 * Service for discovering A2A protocol compatible agents.
 * Implements the A2A discovery standards for finding and identifying compatible agents.
 */
export class AgentDiscoveryService {
  private readonly config: Required<AgentDiscoveryConfig>;
  private agentCache: Map<string, { agents: A2AAgentInfo[]; timestamp: number }> = new Map();

  /**
   * Creates an instance of AgentDiscoveryService.
   * @param {Partial<AgentDiscoveryConfig>} config - The configuration for the service.
   * @see A2AAgentCard
   */
  constructor(config?: Partial<AgentDiscoveryConfig>) {
    this.config = {
      discoveryEndpoint: 'https://api.zyntopia.com/a2a/discover', // Default endpoint
      timeoutMs: 10000, // 10 seconds default
      enableCaching: true,
      cacheTtlMs: 300000, // 5 minutes default
      ...config
    };
    
    Logger.debug(`AgentDiscoveryService initialized with endpoint: ${this.config.discoveryEndpoint}`);
  }

  /**
   * Discovers all available A2A agents from the discovery endpoint.
   * @param traceId - Optional trace ID for request tracking
   * @returns Promise resolving to array of discovered A2A agents
   * @throws {ARTError} If discovery fails or no agents are found
   */
  async discoverAgents(traceId?: string): Promise<A2AAgentInfo[]> {
    const cacheKey = 'all_agents';
    
    // Check cache first if enabled
    if (this.config.enableCaching) {
      const cached = this.getCachedAgents(cacheKey);
      if (cached) {
        Logger.debug(`[${traceId}] Returning ${cached.length} cached A2A agents`);
        return cached;
      }
    }

    try {
      Logger.debug(`[${traceId}] Discovering A2A agents from: ${this.config.discoveryEndpoint}`);
      
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await fetch(this.config.discoveryEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ARTError(
          `Discovery endpoint returned ${response.status}: ${response.statusText}`,
          ErrorCode.EXTERNAL_SERVICE_ERROR
        );
      }

      const discoveryData: DiscoveryResponse = await response.json();
      
      // Filter for A2A agents only
      const a2aServices = discoveryData.services.filter(
        service => service.service_type === 'A2A_AGENT' && service.status === 'active'
      );

      if (a2aServices.length === 0) {
        Logger.warn(`[${traceId}] No active A2A agents found in discovery response`);
        return [];
      }

      // Transform to A2AAgentInfo format
      const agents = a2aServices.map(service => this.transformToA2AAgentInfo(service.card_data));
      
      // Cache the results
      if (this.config.enableCaching) {
        this.setCachedAgents(cacheKey, agents);
      }

      Logger.info(`[${traceId}] Discovered ${agents.length} A2A agents: ${agents.map(a => a.agentName).join(', ')}`);
      return agents;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new ARTError(
          `Agent discovery request timed out after ${this.config.timeoutMs}ms`,
          ErrorCode.TIMEOUT
        );
      }
      
      if (error instanceof ARTError) {
        throw error;
      }

      throw new ARTError(
        `Failed to discover A2A agents: ${error.message}`,
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        error
      );
    }
  }

  /**
   * Finds the top K A2A agents for a specific task type, ranked by suitability.
   * This method acts as a pre-filter, returning a list of the most promising candidates
   * for an LLM to make the final selection from.
   * @param taskType - The type of task (e.g., 'analysis', 'research', 'generation')
   * @param topK - The maximum number of agents to return.
   * @param traceId - Optional trace ID for request tracking.
   * @returns Promise resolving to a ranked array of matching agents.
   * @todo Revisit and enhance the scoring algorithm.
   */
  async findTopAgentsForTask(taskType: string, topK: number = 3, traceId?: string): Promise<A2AAgentInfo[]> {
    const agents = await this.discoverAgents(traceId);
    
    if (agents.length === 0) {
      Logger.warn(`[${traceId}] No A2A agents available for task type: ${taskType}`);
      return [];
    }

    // TODO: This scoring algorithm is a foundational heuristic. Revisit and enhance this
    // frequently. Future optimizations could include:
    // 1. LLM-based semantic scoring for more nuanced understanding.
    // 2. Incorporating a "specialization score" to reward agents with fewer, more focused capabilities.
    // 3. Factoring in agent metadata (name, description, tags) for contextual relevance.
    // 4. Caching individual agent scores for performance.

    // Score agents based on capability relevance to the task type
    const scoredAgents = agents.map(agent => {
      const capabilities = agent.capabilities || [];
      let totalScore = 0;
      const matchedCapabilities: string[] = [];

      for (const capability of capabilities) {
        const capLower = capability.toLowerCase();
        const taskLower = taskType.toLowerCase();
        let capabilityScore = 0;

        // Exact match with task type
        if (capLower === taskLower) {
          capabilityScore = 10;
        }
        // Capability contains task type
        else if (capLower.includes(taskLower)) {
          capabilityScore = 8;
        }
        // Task type contains capability (e.g., capability "research" matches task "medical_research")
        else if (taskLower.includes(capLower)) {
          capabilityScore = 6;
        }
        // Semantic similarity for common patterns
        else {
          // Check for semantic relationships
          const semanticScore = this.calculateSemanticScore(capLower, taskLower);
          capabilityScore = semanticScore;
        }

        if (capabilityScore > 0) {
          totalScore += capabilityScore;
          matchedCapabilities.push(capability);
        }
      }

      return {
        agent,
        score: totalScore,
        matchedCapabilities
      };
    });

    // Filter out agents with no score, sort by score (highest first), and take the top K
    const topMatches = scoredAgents
      .filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    if (topMatches.length === 0) {
      Logger.warn(`[${traceId}] No suitable A2A agent found for task type: ${taskType}`);
      return [];
    }

    Logger.debug(`[${traceId}] Found ${topMatches.length} candidate agents for task type "${taskType}":`);
    topMatches.forEach(match => {
      Logger.debug(`  - ${match.agent.agentName} (Score: ${match.score}, Matched: ${match.matchedCapabilities.join(', ')})`);
    });

    return topMatches.map(match => match.agent);
  }

  /**
   * Calculates semantic similarity score between capability and task type.
   * This uses common word patterns to identify relationships without hardcoded mappings.
   * @private
   */
  private calculateSemanticScore(capability: string, taskType: string): number {
    // Common semantic relationships
    const semanticPairs = [
      // Analysis-related
      ['analysis', 'analyze'], ['analysis', 'examine'], ['analysis', 'evaluate'],
      ['statistical', 'statistics'], ['data', 'information'],
      
      // Research-related  
      ['research', 'investigate'], ['research', 'study'], ['research', 'explore'],
      ['medical', 'health'], ['web', 'online'], ['literature', 'document'],
      
      // Generation-related
      ['generation', 'generate'], ['generation', 'create'], ['generation', 'produce'],
      ['report', 'document'], ['visualization', 'visual'], ['chart', 'graph'],
      
      // Computation-related
      ['computation', 'compute'], ['computation', 'calculate'], ['computation', 'process'],
      ['mathematical', 'math'], ['algorithm', 'algorithmic'],
      
      // Transformation-related
      ['transformation', 'transform'], ['conversion', 'convert'], ['translation', 'translate'],
      
      // Validation-related
      ['validation', 'validate'], ['verification', 'verify'], ['testing', 'test']
    ];

    for (const [word1, word2] of semanticPairs) {
      if ((capability.includes(word1) && taskType.includes(word2)) ||
          (capability.includes(word2) && taskType.includes(word1))) {
        return 4; // Medium semantic match
      }
    }

    // Check for common word roots (basic stemming)
    const getWordRoot = (word: string) => {
      return word.replace(/ing$|ed$|er$|tion$|sion$|ment$|ness$|ly$|al$/, '');
    };

    const capWords = capability.split(/[_\s-]/).map(getWordRoot);
    const taskWords = taskType.split(/[_\s-]/).map(getWordRoot);

    for (const capWord of capWords) {
      for (const taskWord of taskWords) {
        if (capWord.length > 3 && taskWord.length > 3 && 
            (capWord.includes(taskWord) || taskWord.includes(capWord))) {
          return 3; // Lower semantic match
        }
      }
    }

    return 0; // No semantic relationship found
  }

  /**
   * Finds agents by specific capabilities.
   * @param capabilities - Array of required capabilities
   * @param traceId - Optional trace ID for request tracking
   * @returns Promise resolving to agents that have all specified capabilities
   */
  async findAgentsByCapabilities(capabilities: string[], traceId?: string): Promise<A2AAgentInfo[]> {
    const agents = await this.discoverAgents(traceId);
    
    const matchingAgents = agents.filter(agent => {
      return capabilities.every(requiredCap => 
        agent.capabilities?.some(agentCap => 
          agentCap.toLowerCase().includes(requiredCap.toLowerCase()) ||
          requiredCap.toLowerCase().includes(agentCap.toLowerCase())
        )
      );
    });

    Logger.debug(`[${traceId}] Found ${matchingAgents.length} agents matching capabilities: ${capabilities.join(', ')}`);
    return matchingAgents;
  }

  /**
   * Clears the agent cache.
   */
  clearCache(): void {
    this.agentCache.clear();
    Logger.debug('Agent discovery cache cleared');
  }

  /**
   * Gets cached agents if they exist and are not expired.
   * @private
   */
  private getCachedAgents(cacheKey: string): A2AAgentInfo[] | null {
    const cached = this.agentCache.get(cacheKey);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.config.cacheTtlMs;
    if (isExpired) {
      this.agentCache.delete(cacheKey);
      return null;
    }

    return cached.agents;
  }

  /**
   * Sets agents in cache with current timestamp.
   * @private
   */
  private setCachedAgents(cacheKey: string, agents: A2AAgentInfo[]): void {
    this.agentCache.set(cacheKey, {
      agents,
      timestamp: Date.now()
    });
  }

  /**
   * Transforms an A2A Agent Card to the ART framework's A2AAgentInfo format.
   * @private
   */
  private transformToA2AAgentInfo(card: A2AAgentCard): A2AAgentInfo {
    return {
      agentId: card.id,
      agentName: card.name,
      agentType: card.category || 'unknown',
      endpoint: card.endpoint,
      capabilities: card.capabilities || [],
      status: 'available' // Assume available since it was returned by discovery
    };
  }
} 