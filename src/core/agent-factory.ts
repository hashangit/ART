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
    UISystem,
    ObservationSocket,
    ConversationSocket
} from './interfaces';
import { PESAgent } from './agents/pes-agent';

// Import concrete implementations (assuming paths)
// Storage Adapters
import { InMemoryStorageAdapter } from '../adapters/storage/in-memory';
import { IndexedDBStorageAdapter } from '../adapters/storage/indexedDB'; // Corrected casing
// Repositories
import { ConversationRepository } from '../systems/context/conversation-repository'; // Assuming path
import { ObservationRepository } from '../systems/observation/observation-repository'; // Assuming path
import { StateRepository } from '../systems/context/state-repository'; // Assuming path
// Managers
import { ConversationManager as ConversationManagerImpl } from '../systems/context/conversation-manager'; // Assuming path
import { StateManager as StateManagerImpl } from '../systems/context/state-manager'; // Assuming path
import { ObservationManager as ObservationManagerImpl } from '../systems/observation/observation-manager'; // Assuming path
// Tool System
import { ToolRegistry as ToolRegistryImpl } from '../systems/tool/tool-registry'; // Assuming path
import { ToolSystem as ToolSystemImpl } from '../systems/tool/tool-system'; // Assuming path
// Reasoning System
import { PromptManager as PromptManagerImpl } from '../systems/reasoning/prompt-manager'; // Assuming path
import { ReasoningEngine as ReasoningEngineImpl } from '../systems/reasoning/reasoning-engine'; // Assuming path
import { OutputParser as OutputParserImpl } from '../systems/reasoning/output-parser'; // Assuming path
// Provider Adapters (Example)
import { OpenAIAdapter } from '../adapters/reasoning/openai'; // Assuming path
// UI System
import { UISystem as UISystemImpl } from '../systems/ui/ui-system'; // Assuming path
import { TypedSocket } from '../systems/ui/typed-socket'; // Assuming path
import { Observation, ConversationMessage, ObservationType, MessageRole } from '../types';


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

        // --- Initialize UI System & Sockets ---
        // Assuming TypedSocket is the base implementation for sockets
        const observationSocket = new TypedSocket<Observation, ObservationType | ObservationType[]>();
        const conversationSocket = new TypedSocket<ConversationMessage, MessageRole | MessageRole[]>();
        this.uiSystem = new UISystemImpl(observationSocket, conversationSocket);

        // --- Initialize Managers ---
        // Add non-null assertions assuming repositories and uiSystem are initialized above
        this.conversationManager = new ConversationManagerImpl(this.conversationRepository!, this.uiSystem!.getConversationSocket()); // Pass socket
        this.stateManager = new StateManagerImpl(this.stateRepository!);
        this.observationManager = new ObservationManagerImpl(this.observationRepository!, this.uiSystem!.getObservationSocket()); // Pass socket

        // --- Initialize Tool Registry & Register Tools ---
        this.toolRegistry = new ToolRegistryImpl();
        if (this.config.tools) {
            for (const tool of this.config.tools) {
                await this.toolRegistry!.registerTool(tool); // Add non-null assertion
            }
        }

        // --- Initialize Reasoning Provider ---
        switch (this.config.reasoning.provider) {
            case 'openai':
                this.providerAdapter = new OpenAIAdapter({
                    apiKey: this.config.reasoning.apiKey,
                    model: this.config.reasoning.model, // Pass model if provided
                    // baseURL: this.config.reasoning.baseURL // Removed - Property 'baseURL' does not exist
                });
                break;
            // Add cases for other providers (Gemini, Anthropic, etc.) as adapters are implemented
            // case 'gemini':
            //     this.providerAdapter = new GeminiAdapter(...);
            //     break;
            default:
                throw new Error(`Unsupported reasoning provider: ${this.config.reasoning.provider}`);
        }

        // --- Initialize Reasoning Components ---
        this.reasoningEngine = new ReasoningEngineImpl(this.providerAdapter!); // Add non-null assertion
        this.promptManager = new PromptManagerImpl(); // Basic implementation for now
        this.outputParser = new OutputParserImpl(); // Basic implementation for now

        // --- Initialize Tool System ---
        // Add non-null assertions
        this.toolSystem = new ToolSystemImpl(this.toolRegistry!, this.stateManager!, this.observationManager!);
    }

    /**
     * Creates a new agent instance (currently PESAgent) with injected dependencies.
     * Requires initialize() to have been called first.
     * @returns An IAgentCore instance.
     * @throws Error if initialize() was not called or failed.
     */
    createAgent(): IAgentCore {
        if (!this.stateManager || !this.conversationManager || !this.toolRegistry ||
            !this.promptManager || !this.reasoningEngine || !this.outputParser ||
            !this.observationManager || !this.toolSystem) {
            throw new Error("AgentFactory not initialized. Call initialize() before creating an agent.");
        }

        const dependencies = {
            stateManager: this.stateManager,
            conversationManager: this.conversationManager,
            toolRegistry: this.toolRegistry,
            promptManager: this.promptManager,
            reasoningEngine: this.reasoningEngine,
            outputParser: this.outputParser,
            observationManager: this.observationManager,
            toolSystem: this.toolSystem,
        };

        // For v1.0, we directly instantiate PESAgent. Future versions might choose based on config.
        const agent = new PESAgent(dependencies);
        return agent;
    }

    // --- Optional: Getters for accessing initialized components if needed externally ---
    getStorageAdapter(): StorageAdapter | null { return this.storageAdapter; }
    getUISystem(): UISystem | null { return this.uiSystem; }
    getToolRegistry(): ToolRegistry | null { return this.toolRegistry; }
    // ... add others as needed
}