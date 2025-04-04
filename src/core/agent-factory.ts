// src/core/agent-factory.ts
import {
    IAgentCore,
    StorageAdapter,
    IConversationRepository,
    IObservationRepository,
    IStateRepository,
    ConversationManager,
    StateManager,
    ObservationManager,
    ToolRegistry,
    IToolExecutor,
    PromptManager,
    ProviderAdapter,
    ReasoningEngine,
    OutputParser,
    ToolSystem,
    UISystem
    // Removed ObservationSocket, ConversationSocket interface imports
} from './interfaces';
import { PESAgent } from './agents/pes-agent';

// Import concrete implementations (assuming paths)
// Storage Adapters
import { InMemoryStorageAdapter } from '../adapters/storage/inMemory'; // Corrected path
import { IndexedDBStorageAdapter } from '../adapters/storage/indexedDB'; // Corrected path
// Repositories
import { ConversationRepository } from '../systems/context/repositories/ConversationRepository'; // Corrected path
import { ObservationRepository } from '../systems/context/repositories/ObservationRepository'; // Corrected path - Moved from observation system
import { StateRepository } from '../systems/context/repositories/StateRepository'; // Corrected path
// Managers
import { ConversationManager as ConversationManagerImpl } from '../systems/context/managers/ConversationManager'; // Corrected path
import { StateManager as StateManagerImpl } from '../systems/context/managers/StateManager'; // Corrected path
import { ObservationManager as ObservationManagerImpl } from '../systems/observation/observation-manager'; // Correct path
// Tool System
import { ToolRegistry as ToolRegistryImpl } from '../systems/tool/ToolRegistry'; // Correct path
import { ToolSystem as ToolSystemImpl } from '../systems/tool/ToolSystem'; // Correct path
// Reasoning System
import { PromptManager as PromptManagerImpl } from '../systems/reasoning/PromptManager'; // Correct path
import { ReasoningEngine as ReasoningEngineImpl } from '../systems/reasoning/ReasoningEngine'; // Correct path
import { OutputParser as OutputParserImpl } from '../systems/reasoning/OutputParser'; // Correct path
// Provider Adapters (Examples - Assuming correct paths/exports)
import { OpenAIAdapter } from '../adapters/reasoning/openai';
import { GeminiAdapter } from '../adapters/reasoning/gemini';
import { AnthropicAdapter } from '../adapters/reasoning/anthropic';
import { OpenRouterAdapter } from '../adapters/reasoning/openrouter';
import { DeepSeekAdapter } from '../adapters/reasoning/deepseek';
// UI System
import { UISystem as UISystemImpl } from '../systems/ui/ui-system'; // Correct path
// Removed direct imports of concrete socket classes - they will be accessed via UISystem instance
// Removed unused type imports: Observation, ConversationMessage, ObservationType, MessageRole


// Configuration Interfaces
export interface StorageConfig {
    type: 'memory' | 'indexedDB';
    dbName?: string; // For IndexedDB
    // other adapter-specific config
}

export interface ReasoningConfig {
    provider: 'openai' | 'gemini' | 'anthropic' | 'openrouter' | 'deepseek'; // Add others as implemented
    apiKey: string; // Sensitive, handle appropriately
    // provider-specific options (model, baseURL, etc.)
    model?: string;
    baseURL?: string;
}

export interface AgentFactoryConfig {
    storage: StorageConfig;
    reasoning: ReasoningConfig;
    tools?: IToolExecutor[]; // Optional list of tools to register initially
    agentCore?: new (dependencies: any) => IAgentCore; // Optional: Specify Agent Core implementation (defaults to PESAgent)
    // Add other configurations (e.g., default prompts, UI options)
}

/**
 * Factory class responsible for creating and configuring agent instances
 * with all their dependencies.
 */
export class AgentFactory {
    private config: AgentFactoryConfig;
    private storageAdapter: StorageAdapter | null = null;
    private uiSystem: UISystem | null = null;
    private conversationRepository: IConversationRepository | null = null;
    private observationRepository: IObservationRepository | null = null;
    private stateRepository: IStateRepository | null = null;
    private conversationManager: ConversationManager | null = null;
    private stateManager: StateManager | null = null;
    private observationManager: ObservationManager | null = null;
    private toolRegistry: ToolRegistry | null = null;
    private providerAdapter: ProviderAdapter | null = null;
    private reasoningEngine: ReasoningEngine | null = null;
    private promptManager: PromptManager | null = null;
    private outputParser: OutputParser | null = null;
    private toolSystem: ToolSystem | null = null;


    constructor(config: AgentFactoryConfig) {
        this.config = config;
        // Basic validation
        if (!config.storage) throw new Error("Storage configuration is required.");
        if (!config.reasoning) throw new Error("Reasoning configuration is required.");
    }

    /**
     * Initializes shared components like storage and UI system.
     * Should be called once before creating agents.
     */
    async initialize(): Promise<void> {
        // --- Initialize Storage ---
        switch (this.config.storage.type) {
            case 'indexedDB':
                // Assuming constructor expects { dbName: string, objectStores: string[] }
                this.storageAdapter = new IndexedDBStorageAdapter({
                    dbName: this.config.storage.dbName || 'ARTDB',
                    objectStores: ['conversations', 'observations', 'state'] // Define required stores
                });
                break;
            case 'memory':
            default:
                this.storageAdapter = new InMemoryStorageAdapter();
                break;
        }
        await this.storageAdapter!.init?.(); // Add non-null assertion

        // --- Initialize Repositories ---
        // Add non-null assertions assuming storageAdapter is initialized above
        this.conversationRepository = new ConversationRepository(this.storageAdapter!);
        this.observationRepository = new ObservationRepository(this.storageAdapter!);
        this.stateRepository = new StateRepository(this.storageAdapter!);

        // --- Initialize UI System ---
        // UISystem constructor expects repositories, not sockets
        this.uiSystem = new UISystemImpl(this.observationRepository!, this.conversationRepository!); // Pass repositories

        // --- Initialize Managers ---
        // Pass the actual socket instances obtained from the initialized uiSystem
        this.conversationManager = new ConversationManagerImpl(this.conversationRepository!, this.uiSystem.getConversationSocket());
        this.stateManager = new StateManagerImpl(this.stateRepository!);
        this.observationManager = new ObservationManagerImpl(this.observationRepository!, this.uiSystem.getObservationSocket());

        // --- Initialize Tool Registry & Register Tools ---
        this.toolRegistry = new ToolRegistryImpl();
        if (this.config.tools) {
            for (const tool of this.config.tools) {
                await this.toolRegistry!.registerTool(tool); // Add non-null assertion
            }
        }

        // --- Initialize Reasoning Provider ---
        // --- Initialize Reasoning Provider ---
        const reasoningConfig = this.config.reasoning;
        switch (reasoningConfig.provider) {
            case 'openai':
                this.providerAdapter = new OpenAIAdapter({ apiKey: reasoningConfig.apiKey, model: reasoningConfig.model });
                break;
            case 'gemini':
                 this.providerAdapter = new GeminiAdapter({ apiKey: reasoningConfig.apiKey, model: reasoningConfig.model });
                 break;
            case 'anthropic':
                 this.providerAdapter = new AnthropicAdapter({ apiKey: reasoningConfig.apiKey, model: reasoningConfig.model });
                 break;
            case 'openrouter':
                 this.providerAdapter = new OpenRouterAdapter({ apiKey: reasoningConfig.apiKey, model: reasoningConfig.model! }); // Model is required for OpenRouter
                 break;
            case 'deepseek':
                 this.providerAdapter = new DeepSeekAdapter({ apiKey: reasoningConfig.apiKey, model: reasoningConfig.model });
                 break;
            default:
                throw new Error(`Unsupported reasoning provider: ${reasoningConfig.provider}`);
        }

        // --- Initialize Reasoning Components ---
        this.reasoningEngine = new ReasoningEngineImpl(this.providerAdapter!); // Add non-null assertion
        this.promptManager = new PromptManagerImpl(); // Basic implementation for now
        this.outputParser = new OutputParserImpl(); // Basic implementation for now

        // --- Initialize Tool System ---
        // ToolSystem constructor expects only registry and stateManager currently
        this.toolSystem = new ToolSystemImpl(this.toolRegistry!, this.stateManager!);
    }

    /**
     * Creates a new agent instance (currently PESAgent) with injected dependencies.
     * Requires initialize() to have been called first.
     * @returns An IAgentCore instance.
     * @returns An IAgentCore instance.
     * @returns An IAgentCore instance.
     * @throws Error if initialize() was not called or failed.
     */
    createAgent(): IAgentCore {
        // Check for all required components after initialization
        if (!this.stateManager || !this.conversationManager || !this.toolRegistry ||
            !this.promptManager || !this.reasoningEngine || !this.outputParser ||
            !this.observationManager || !this.toolSystem || !this.providerAdapter) { // Added providerAdapter check
            throw new Error("AgentFactory not fully initialized. Call initialize() before creating an agent.");
        }

        // Pass dependencies to the agent constructor
        const dependencies = {
            stateManager: this.stateManager,
            conversationManager: this.conversationManager,
            toolRegistry: this.toolRegistry,
            promptManager: this.promptManager,
            reasoningEngine: this.reasoningEngine,
            outputParser: this.outputParser,
            observationManager: this.observationManager,
            toolSystem: this.toolSystem,
            // Note: providerAdapter is used by reasoningEngine, not directly by agent core usually
        };

        // Instantiate the specified Agent Core or default to PESAgent
        const AgentCoreImplementation = this.config.agentCore || PESAgent;
        const agent = new AgentCoreImplementation(dependencies);
        return agent;
    }

    // --- Optional: Getters for accessing initialized components if needed externally ---
    getStorageAdapter(): StorageAdapter | null { return this.storageAdapter; }
    getUISystem(): UISystem | null { return this.uiSystem; }
    getToolRegistry(): ToolRegistry | null { return this.toolRegistry; }
    getStateManager(): StateManager | null { return this.stateManager; }
    getConversationManager(): ConversationManager | null { return this.conversationManager; }
    getObservationManager(): ObservationManager | null { return this.observationManager; }
    // ... add others as needed
}

// --- Convenience Factory Function ---
import { ArtInstance } from './interfaces'; // Import the new interface

/**
 * Creates and initializes an ART instance with the specified configuration.
 * This is the recommended way to get started with the ART framework.
 * @param config The configuration for the ART instance.
 * @returns A promise resolving to the initialized ArtInstance.
 */
export async function createArtInstance(config: AgentFactoryConfig): Promise<ArtInstance> {
    const factory = new AgentFactory(config);
    await factory.initialize();
    const agentCore = factory.createAgent();

    // Retrieve initialized components from the factory
    const uiSystem = factory.getUISystem();
    const stateManager = factory.getStateManager(); // Assuming getStateManager getter exists
    const conversationManager = factory.getConversationManager(); // Assuming getter exists
    const toolRegistry = factory.getToolRegistry(); // Assuming getter exists
    const observationManager = factory.getObservationManager(); // Assuming getter exists

    // Ensure all required components were initialized
    if (!uiSystem || !stateManager || !conversationManager || !toolRegistry || !observationManager) {
        throw new Error("Failed to initialize one or more core components within AgentFactory.");
    }

    return {
        process: agentCore.process.bind(agentCore), // Bind the process method
        uiSystem: uiSystem,
        stateManager: stateManager,
        conversationManager: conversationManager,
        toolRegistry: toolRegistry,
        observationManager: observationManager,
    };
}