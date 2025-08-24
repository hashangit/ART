// src/core/agent-factory.ts
import {
    IAgentCore,
    StorageAdapter,
    IConversationRepository,
    IObservationRepository,
    IStateRepository,
    IA2ATaskRepository,
    ConversationManager,
    StateManager,
    ObservationManager,
    ToolRegistry,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type IToolExecutor, // type-only import
    PromptManager,
    // ProviderAdapter, // Removed direct ProviderAdapter interface import
    ReasoningEngine,
    OutputParser,
    ToolSystem,
    UISystem
    // Removed ObservationSocket, ConversationSocket interface imports
} from './interfaces';
import { IProviderManager } from '../types/providers'; // Corrected path
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ProviderManagerConfig } from '../types/providers'; // type-only import
// Import ArtInstanceConfig and StateSavingStrategy
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ArtInstanceConfig } from '../types'; // type-only import
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { StateSavingStrategy } from '../types'; // type-only import
import { ProviderManagerImpl } from '../providers/ProviderManagerImpl'; // Corrected path
import { PESAgent } from './agents/pes-agent';

// Import concrete implementations (assuming paths)
// Storage Adapters
import { InMemoryStorageAdapter } from '../adapters/storage/inMemory'; // Corrected path
import { IndexedDBStorageAdapter } from '../adapters/storage/indexedDB'; // Corrected path
// Repositories
import { ConversationRepository } from '../systems/context/repositories/ConversationRepository'; // Corrected path
import { ObservationRepository } from '../systems/context/repositories/ObservationRepository'; // Corrected path - Moved from observation system
import { StateRepository } from '../systems/context/repositories/StateRepository'; // Corrected path
import { TaskStatusRepository } from '../systems/context/repositories/TaskStatusRepository'; // A2A task repository
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
// Provider Adapters are now managed by ProviderManagerImpl
// UI System
import { UISystem as UISystemImpl } from '../systems/ui/ui-system'; // Correct path
// Auth and MCP Systems
import { AuthManager } from '../systems/auth/AuthManager'; // Import AuthManager
import { McpManager } from '../systems/mcp/McpManager'; // Import McpManager
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { McpManagerConfig } from '../systems/mcp/types'; // type-only import for McpManagerConfig
import { AgentDiscoveryService } from '../systems/a2a/AgentDiscoveryService';
import { TaskDelegationService } from '../systems/a2a/TaskDelegationService';
// Removed direct imports of concrete socket classes - they will be accessed via UISystem instance
// Removed unused type imports: Observation, ConversationMessage, ObservationType, MessageRole
import { Logger } from '../utils/logger'; // Import Logger
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { LogLevel } from '../utils/logger'; // type-only import


/**
 * Configuration for the Storage System adapter.
 */
export interface StorageConfig {
    /** Specifies the type of storage adapter to use. */
    type: 'memory' | 'indexedDB';
    /** The name of the database to use (required for 'indexedDB'). */
    dbName?: string;
    /** Optional: Database version for schema migrations (for 'indexedDB'). Defaults might apply. */
    version?: number;
    /** Optional: Advanced configuration for IndexedDB object stores and indexes. Defaults are usually sufficient. */
    objectStores?: any[]; // Define a more specific type if possible
    // Add other adapter-specific config options as needed
}

/**
 * Configuration for the Reasoning System provider adapter.
 */
export interface ReasoningConfig {
    /** The identifier of the LLM provider to use. */
    provider: 'openai' | 'gemini' | 'anthropic' | 'openrouter' | 'deepseek'; // Add others as implemented
    /** The API key for the selected provider. Handle securely (e.g., via environment variables). */
    apiKey: string;
    /** Optional: The default model ID to use for this provider if not specified elsewhere (e.g., in ThreadConfig). */
    model?: string;
    /** Optional: Custom base URL for the provider's API (e.g., for proxies or self-hosted models). */
    baseURL?: string;
    /** Optional: Default parameters to pass to the LLM provider on each call (e.g., temperature). */
    defaultParams?: Record<string, any>;
    // Add other provider-specific options as needed
}

/**
 * Configuration object required by the AgentFactory and createArtInstance function.
 * This will now use ArtInstanceConfig from types.ts which includes stateSavingStrategy.
 */
// export interface AgentFactoryConfig { // Commented out, will use ArtInstanceConfig
//     /** Configuration for the storage adapter. */
//     storage: StorageConfig;
//     /** Configuration for the Provider Manager, defining available adapters and rules. */
//     providers: ProviderManagerConfig; // Changed from reasoning: ReasoningConfig
//     /** Optional array of tool executor instances to register at initialization. */
//     tools?: IToolExecutor[];
//     /** Optional: Specify a different Agent Core implementation class (defaults to PESAgent). */
//     agentCore?: new (dependencies: any) => IAgentCore;
//     /** Optional: Configuration for the logger. */
//     logger?: { level?: LogLevel }; // Assuming LogLevel enum exists
//     // TODO: Add other potential global configurations (e.g., default ThreadConfig, UI system options)
// }

/**
 * Handles the instantiation and wiring of all core ART framework components based on provided configuration.
 * This class performs the dependency injection needed to create a functional `ArtInstance`.
 * It's typically used internally by the `createArtInstance` function.
 */
export class AgentFactory {
    private config: ArtInstanceConfig; // Changed to ArtInstanceConfig
    private storageAdapter: StorageAdapter | null = null;
    private uiSystem: UISystem | null = null;
    private conversationRepository: IConversationRepository | null = null;
    private observationRepository: IObservationRepository | null = null;
    private stateRepository: IStateRepository | null = null;
    private a2aTaskRepository: IA2ATaskRepository | null = null;
    private conversationManager: ConversationManager | null = null;
    private stateManager: StateManager | null = null;
    private observationManager: ObservationManager | null = null;
    private toolRegistry: ToolRegistry | null = null;
    // private providerAdapter: ProviderAdapter | null = null; // Replaced with providerManager
    private providerManager: IProviderManager | null = null; // Added providerManager
    private reasoningEngine: ReasoningEngine | null = null;
    private promptManager: PromptManager | null = null;
    private outputParser: OutputParser | null = null;
    private toolSystem: ToolSystem | null = null;
    private authManager: AuthManager | null = null;
    private mcpManager: McpManager | null = null;
    private agentDiscoveryService: AgentDiscoveryService | null = null;
    private taskDelegationService: TaskDelegationService | null = null;


    /**
     * Creates a new AgentFactory instance.
     * @param config - The configuration specifying which adapters and components to use.
     */
    constructor(config: ArtInstanceConfig) { // Changed to ArtInstanceConfig
        this.config = config;
        // Basic validation
        if (!config.storage) throw new Error("ArtInstanceConfig requires 'storage' configuration.");
        if (!config.providers) throw new Error("ArtInstanceConfig requires 'providers' configuration.");
    }

    /**
     * Asynchronously initializes all core components based on the configuration.
     * This includes setting up the storage adapter, repositories, managers, tool registry,
     * reasoning engine, and UI system.
     * This method MUST be called before `createAgent()`.
     * @returns A promise that resolves when initialization is complete.
     * @throws {Error} If configuration is invalid or initialization fails for a component.
     */
    async initialize(): Promise<void> {
        // --- Initialize Storage ---
        if ('type' in this.config.storage) { // Type guard for storage config object
            const storageConfig = this.config.storage; // storageConfig is now { type: 'memory' | 'indexedDB', ... }
            switch (storageConfig.type) {
                case 'indexedDB':
                    this.storageAdapter = new IndexedDBStorageAdapter({
                        dbName: storageConfig.dbName || 'ARTDB',
                        objectStores: storageConfig.objectStores || ['conversations', 'observations', 'state', 'a2a_tasks']
                    });
                    break;
                case 'memory':
                default:
                    this.storageAdapter = new InMemoryStorageAdapter();
                    break;
            }
        } else { // It's a pre-configured StorageAdapter instance
            this.storageAdapter = this.config.storage;
        }
        await this.storageAdapter!.init?.(); // Add non-null assertion

        // --- Initialize Repositories ---
        // Add non-null assertions assuming storageAdapter is initialized above
        this.conversationRepository = new ConversationRepository(this.storageAdapter!);
        this.observationRepository = new ObservationRepository(this.storageAdapter!);
        this.stateRepository = new StateRepository(this.storageAdapter!);
        this.a2aTaskRepository = new TaskStatusRepository(this.storageAdapter!);

        // --- Initialize UI System ---
        // UISystem constructor expects repositories, not sockets
        this.uiSystem = new UISystemImpl(this.observationRepository!, this.conversationRepository!, this.a2aTaskRepository || undefined); // Pass repositories including A2A task repository

        // --- Initialize Managers ---
        // Pass the actual socket instances obtained from the initialized uiSystem
        this.conversationManager = new ConversationManagerImpl(this.conversationRepository!, this.uiSystem.getConversationSocket());
        // Pass the stateSavingStrategy to StateManagerImpl constructor
        const strategy = this.config.stateSavingStrategy || 'explicit'; // Default to 'explicit'
        this.stateManager = new StateManagerImpl(this.stateRepository!, strategy);
        this.observationManager = new ObservationManagerImpl(this.observationRepository!, this.uiSystem.getObservationSocket());

        // --- Initialize Tool Registry & Register Tools ---
        // Pass the initialized StateManager to the ToolRegistry constructor
        this.toolRegistry = new ToolRegistryImpl(this.stateManager!);
        if (this.config.tools) {
            for (const tool of this.config.tools) {
                await this.toolRegistry!.registerTool(tool); // Add non-null assertion
            }
        }

        // --- Initialize Provider Manager ---
        // ProviderManagerImpl likely needs configuration for *all* potential providers.
        // The current AgentFactoryConfig only holds one reasoning config. This needs refactoring
        // for a true multi-provider setup where the manager knows all potential credentials/configs.
        // For now, instantiate it simply to fix the type error. Runtime provider selection might fail
        // Pass the provider configuration from the main config
        this.providerManager = new ProviderManagerImpl(this.config.providers);
        Logger.info("ProviderManager initialized.");


        // --- Initialize Reasoning Components ---
        this.reasoningEngine = new ReasoningEngineImpl(this.providerManager!); // Pass ProviderManager
        this.promptManager = new PromptManagerImpl(); // Basic implementation for now
        this.outputParser = new OutputParserImpl(); // Basic implementation for now

        // --- Initialize Tool System ---
        // Inject ToolRegistry, StateManager, and ObservationManager into ToolSystem
        this.toolSystem = new ToolSystemImpl(this.toolRegistry!, this.stateManager!, this.observationManager!); // Added observationManager

        // --- Initialize Auth Manager ---
        if (this.config.authConfig?.enabled) {
            this.authManager = new AuthManager();
            // Register any pre-configured strategies
            if (this.config.authConfig.strategies) {
                for (const { id, strategy } of this.config.authConfig.strategies) {
                    this.authManager.registerStrategy(id, strategy);
                }
            }
            Logger.info("AuthManager initialized.");
        }

        // --- Initialize A2A Services ---
        if (this.config.a2aConfig) {
            this.agentDiscoveryService = new AgentDiscoveryService({
                discoveryEndpoint: this.config.a2aConfig.discoveryEndpoint,
            });
            this.taskDelegationService = new TaskDelegationService(
                this.a2aTaskRepository!,
                { callbackUrl: this.config.a2aConfig.callbackUrl }
            );
            Logger.info("A2A Services (Discovery, Delegation) initialized.");
        }

        // --- Initialize MCP Manager ---
        if (this.config.mcpConfig) {
            if (!this.toolRegistry || !this.stateManager) {
                throw new Error("MCP Manager requires ToolRegistry and StateManager to be initialized first.");
            }
            // McpManager now reads its own config from the file system and discovers from Zyntopia.
            this.mcpManager = new McpManager(
                this.toolRegistry,
                this.stateManager,
                this.authManager || undefined
            );
            // Initialize with both local config and Zyntopia discovery
            await this.mcpManager.initialize(this.config.mcpConfig);
            Logger.info("McpManager Hub initialized with local config and Zyntopia discovery.");
        }
    }

    /**
     * Creates an instance of the configured Agent Core (e.g., `PESAgent`) and injects
     * all necessary initialized dependencies (managers, systems, etc.).
     * Requires `initialize()` to have been successfully called beforehand.
     * @returns An instance implementing the `IAgentCore` interface.
     * @throws {Error} If `initialize()` was not called or if essential components failed to initialize.
     */
    createAgent(): IAgentCore {
        // Check for all required components after initialization
        if (!this.stateManager || !this.conversationManager || !this.toolRegistry ||
            !this.promptManager || !this.reasoningEngine || !this.outputParser ||
            !this.observationManager || !this.toolSystem || !this.providerManager ||
            !this.a2aTaskRepository) { // Check A2A task repository
            throw new Error("AgentFactory not fully initialized. Call initialize() before creating an agent.");
        }

        // Pass dependencies to the agent constructor
        // This object's structure should align with what the Agent Core implementation expects (e.g., PESAgentDependencies)
        const dependencies = {
            stateManager: this.stateManager,
            conversationManager: this.conversationManager,
            toolRegistry: this.toolRegistry,
            promptManager: this.promptManager,
            reasoningEngine: this.reasoningEngine,
            outputParser: this.outputParser,
            observationManager: this.observationManager,
            toolSystem: this.toolSystem,
            uiSystem: this.uiSystem!, // Include the UI System (non-null assertion)
            a2aTaskRepository: this.a2aTaskRepository, // Include A2A task repository
            authManager: this.authManager, // Include Auth Manager (may be null if not configured)
            mcpManager: this.mcpManager, // Include MCP Manager (may be null if not configured)
            agentDiscoveryService: this.agentDiscoveryService, // Include A2A Discovery Service
            taskDelegationService: this.taskDelegationService, // Include A2A Delegation Service
            instanceDefaultCustomSystemPrompt: this.config.defaultSystemPrompt, // Pass instance-level default system prompt from ArtInstanceConfig
            // Note: providerAdapter is used by reasoningEngine, not directly by agent core usually
        };

        // Instantiate the specified Agent Core or default to PESAgent
        const AgentCoreImplementation = this.config.agentCore || PESAgent;
        const agent = new AgentCoreImplementation(dependencies);
        return agent;
    }

    // --- Getters for initialized components (primarily for createArtInstance) ---
    /** Gets the initialized Storage Adapter instance. */
    getStorageAdapter(): StorageAdapter | null { return this.storageAdapter; }
    /** Gets the initialized UI System instance. */
    getUISystem(): UISystem | null { return this.uiSystem; }
    /** Gets the initialized Tool Registry instance. */
    getToolRegistry(): ToolRegistry | null { return this.toolRegistry; }
    /** Gets the initialized State Manager instance. */
    getStateManager(): StateManager | null { return this.stateManager; }
    /** Gets the initialized Conversation Manager instance. */
    getConversationManager(): ConversationManager | null { return this.conversationManager; }
    /** Gets the initialized Observation Manager instance. */
    getObservationManager(): ObservationManager | null { return this.observationManager; }
    /** Gets the initialized Auth Manager instance. */
    getAuthManager(): AuthManager | null { return this.authManager; }
    /** Gets the initialized MCP Manager instance. */
    getMcpManager(): McpManager | null { return this.mcpManager; }
    // Add getters for other components like reasoningEngine, toolSystem if needed
}

// --- Convenience Factory Function ---
import { ArtInstance } from './interfaces'; // Import the new interface

/**
 * High-level factory function to create and initialize a complete ART framework instance.
 * This simplifies the setup process by handling the instantiation and wiring of all
 * necessary components based on the provided configuration.
 * @param config - The configuration object specifying storage, reasoning, tools, etc.
 * @returns A promise that resolves to a ready-to-use `ArtInstance` object, providing access to the core `process` method and essential managers/systems.
 * @throws {Error} If initialization fails (e.g., invalid config, storage connection error).
 * @example
 * const art = await createArtInstance({
 *   storage: { type: 'indexedDB', dbName: 'myAgentDb' },
 *   reasoning: { provider: 'openai', apiKey: '...' },
 *   tools: [new CalculatorTool()]
 * });
 * const response = await art.process({ query: "Calculate 5*5", threadId: "thread1" });
 */
export async function createArtInstance(config: ArtInstanceConfig): Promise<ArtInstance> { // Changed to ArtInstanceConfig
    const factory = new AgentFactory(config);
    await factory.initialize();
    const agentCore = factory.createAgent();

    // Retrieve initialized components from the factory
    const uiSystem = factory.getUISystem();
    const stateManager = factory.getStateManager(); // Assuming getStateManager getter exists
    const conversationManager = factory.getConversationManager(); // Assuming getter exists
    const toolRegistry = factory.getToolRegistry(); // Assuming getter exists
    const observationManager = factory.getObservationManager(); // Assuming getter exists
    const authManager = factory.getAuthManager();

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
        authManager: authManager,
    };
}