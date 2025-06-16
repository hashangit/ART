// src/core/agent-factory.test.ts
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { AgentFactory, StorageConfig } from './agent-factory'; // Import only AgentFactory here
import type { AgentFactoryConfig } from './agent-factory'; // Import type separately
import type { IToolExecutor } from './interfaces'; // Use type-only import for unused types
import type { ProviderManagerConfig } from '../types/providers'; // Use type-only import
import { PESAgent } from './agents/pes-agent'; // Revert to relative
import type { JsonSchema } from '../types'; // Use type-only import

// --- Mock Concrete Implementations ---
// Mock entire modules that the factory imports using relative paths
vi.mock('../adapters/storage/inMemory', () => ({ // Correct casing: inMemory
    InMemoryStorageAdapter: vi.fn().mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
    }))
}));
vi.mock('../adapters/storage/indexedDB', () => ({ // Relative path
    IndexedDBStorageAdapter: vi.fn().mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
    }))
}));
vi.mock('../systems/context/repositories/ConversationRepository', () => ({ ConversationRepository: vi.fn() })); // Relative path
vi.mock('../systems/context/repositories/ObservationRepository', () => ({ ObservationRepository: vi.fn() })); // Relative path
vi.mock('../systems/context/repositories/StateRepository', () => ({ StateRepository: vi.fn() })); // Relative path
vi.mock('../systems/context/repositories/TaskStatusRepository', () => ({ TaskStatusRepository: vi.fn() })); // A2A task repository
vi.mock('../systems/ui/typed-socket', () => ({ TypedSocket: vi.fn() })); // Relative path
vi.mock('../systems/ui/ui-system', () => ({ // Relative path
    UISystem: vi.fn().mockImplementation(() => ({
        getObservationSocket: vi.fn(() => ({ notify: vi.fn() })),
        getConversationSocket: vi.fn(() => ({ notify: vi.fn() })),
        getLLMStreamSocket: vi.fn(() => ({ notify: vi.fn() })),
    }))
}));
vi.mock('../systems/context/managers/ConversationManager', () => ({ ConversationManager: vi.fn() })); // Relative path
vi.mock('../systems/context/managers/StateManager', () => ({ StateManager: vi.fn() })); // Relative path
vi.mock('../systems/observation/observation-manager', () => ({ ObservationManager: vi.fn() })); // Relative path
vi.mock('../systems/tool/ToolRegistry', () => ({ // Relative path
    ToolRegistry: vi.fn().mockImplementation(() => ({
        registerTool: vi.fn().mockResolvedValue(undefined),
        getAvailableTools: vi.fn().mockResolvedValue([]),
    }))
}));
// Mock ProviderManagerImpl
vi.mock('../providers/ProviderManagerImpl', () => ({ // Relative path
    ProviderManagerImpl: vi.fn().mockImplementation(() => ({
        getAdapter: vi.fn(),
    }))
}));
vi.mock('../systems/reasoning/ReasoningEngine', () => ({ ReasoningEngine: vi.fn() })); // Relative path
vi.mock('../systems/reasoning/PromptManager', () => ({ PromptManager: vi.fn() })); // Relative path
vi.mock('../systems/reasoning/OutputParser', () => ({ OutputParser: vi.fn() })); // Relative path
vi.mock('../systems/tool/ToolSystem', () => ({ ToolSystem: vi.fn() })); // Relative path
vi.mock('./agents/pes-agent', () => ({ PESAgent: vi.fn() })); // Relative path

// Import the mocked classes after mocking the modules (using relative paths)
import { InMemoryStorageAdapter } from '../adapters/storage/inMemory'; // Correct casing: inMemory
import { IndexedDBStorageAdapter } from '../adapters/storage/indexedDB';
import { ConversationRepository } from '../systems/context/repositories/ConversationRepository';
import { ObservationRepository } from '../systems/context/repositories/ObservationRepository';
import { StateRepository } from '../systems/context/repositories/StateRepository';
import { TaskStatusRepository } from '../systems/context/repositories/TaskStatusRepository';
// import { TypedSocket } from '../systems/ui/typed-socket'; // Removed unused import
import { UISystem as UISystemMock } from '../systems/ui/ui-system'; // Use relative path
import { ConversationManager } from '../systems/context/managers/ConversationManager';
import { StateManager } from '../systems/context/managers/StateManager';
import { ObservationManager } from '../systems/observation/observation-manager';
import { ToolRegistry } from '../systems/tool/ToolRegistry';
import { ProviderManagerImpl } from '../providers/ProviderManagerImpl';
import { ReasoningEngine } from '../systems/reasoning/ReasoningEngine';
import { PromptManager } from '../systems/reasoning/PromptManager';
import { OutputParser } from '../systems/reasoning/OutputParser';
import { ToolSystem } from '../systems/tool/ToolSystem';


// --- Test Data ---
const mockStorageConfigMemory: StorageConfig = { type: 'memory' };
const mockStorageConfigIndexedDB: StorageConfig = { type: 'indexedDB', dbName: 'TestDB' };
// Define a mock ProviderManagerConfig
const mockProviderManagerConfig: ProviderManagerConfig = {
    availableProviders: [{ name: 'mock-provider', adapter: vi.fn(), isLocal: true }], // Minimal config
    maxParallelApiInstancesPerProvider: 1,
    apiInstanceIdleTimeoutSeconds: 10,
};
// Fix mock tool schemas
const mockToolSchema: JsonSchema = { type: 'object', properties: {} };
const mockTool1: IToolExecutor = { schema: { name: 'tool1', description: '', inputSchema: mockToolSchema }, execute: vi.fn() };
const mockTool2: IToolExecutor = { schema: { name: 'tool2', description: '', inputSchema: mockToolSchema }, execute: vi.fn() };

const mockBaseConfig: AgentFactoryConfig = {
    storage: mockStorageConfigMemory,
    providers: mockProviderManagerConfig, // Use providers key
};

// --- Test Suite ---
describe('AgentFactory', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should throw error if storage config is missing', () => {
        expect(() => new AgentFactory({ providers: mockProviderManagerConfig } as any)) // Check for providers
            .toThrow("ArtInstanceConfig requires 'storage' configuration.");
    });

    it('should throw error if providers config is missing', () => {
        expect(() => new AgentFactory({ storage: mockStorageConfigMemory } as any)) // Check for providers
            .toThrow("ArtInstanceConfig requires 'providers' configuration.");
    });

    describe('initialize', () => {
        it('should initialize InMemoryStorageAdapter correctly', async () => {
            // Re-add 'as any' assertion to bypass persistent type error
            const factory = new AgentFactory(mockBaseConfig as any);
            await factory.initialize();
            expect(InMemoryStorageAdapter).toHaveBeenCalledTimes(1);
            expect(IndexedDBStorageAdapter).not.toHaveBeenCalled();
            const adapterInstance = (InMemoryStorageAdapter as Mock).mock.results[0].value;
            expect(adapterInstance.init).toHaveBeenCalledTimes(1);
        });

        it('should initialize IndexedDBStorageAdapter correctly', async () => {
            const config = { ...mockBaseConfig, storage: mockStorageConfigIndexedDB };
            // Re-add 'as any' assertion
            const factory = new AgentFactory(config as any);
            await factory.initialize();
            expect(IndexedDBStorageAdapter).toHaveBeenCalledTimes(1);
            expect(IndexedDBStorageAdapter).toHaveBeenCalledWith({
                dbName: mockStorageConfigIndexedDB.dbName,
                objectStores: ['conversations', 'observations', 'state']
            });
            expect(InMemoryStorageAdapter).not.toHaveBeenCalled();
            const adapterInstance = (IndexedDBStorageAdapter as Mock).mock.results[0].value;
            expect(adapterInstance.init).toHaveBeenCalledTimes(1);
        });

        it('should initialize repositories with the storage adapter', async () => {
            // Re-add 'as any' assertion
            const factory = new AgentFactory(mockBaseConfig as any);
            await factory.initialize();
            const adapterInstance = (InMemoryStorageAdapter as Mock).mock.results[0].value;
            expect(ConversationRepository).toHaveBeenCalledWith(adapterInstance);
            expect(ObservationRepository).toHaveBeenCalledWith(adapterInstance);
            expect(StateRepository).toHaveBeenCalledWith(adapterInstance);
            expect(TaskStatusRepository).toHaveBeenCalledWith(adapterInstance);
        });

        it('should initialize UI system and sockets', async () => {
            // Re-add 'as any' assertion
            // const factory = new AgentFactory(mockBaseConfig as any); // Removed unused factory variable
            await new AgentFactory(mockBaseConfig as any).initialize(); // Initialize directly
            // This test might be less relevant now as TypedSocket is an internal detail of the mocked UISystem/Sockets
            // We primarily care that UISystem is initialized correctly.
            // expect(TypedSocket).toHaveBeenCalledTimes(2); // Commenting out as it's an internal detail

            // Check UISystem initialization
            const obsRepoInstance = (ObservationRepository as Mock).mock.results[0].value;
            const convRepoInstance = (ConversationRepository as Mock).mock.results[0].value;
            const a2aTaskRepoInstance = (TaskStatusRepository as Mock).mock.results[0].value;
            expect(UISystemMock).toHaveBeenCalledWith(obsRepoInstance, convRepoInstance, a2aTaskRepoInstance); // Check mock UISystem call - now includes TaskStatusRepository
        });

        it('should initialize managers with repositories and sockets', async () => {
            // Re-add 'as any' assertion
            const factory = new AgentFactory(mockBaseConfig as any);
            await factory.initialize();
            const repoConvInstance = (ConversationRepository as Mock).mock.results[0].value;
            const repoObsInstance = (ObservationRepository as Mock).mock.results[0].value;
            const repoStateInstance = (StateRepository as Mock).mock.results[0].value;
            const uiSystemInstance = (UISystemMock as Mock).mock.results[0].value; // Use aliased mock

            expect(ConversationManager).toHaveBeenCalledWith(repoConvInstance, expect.objectContaining({ notify: expect.any(Function) })); // Use updated name
            expect(StateManager).toHaveBeenCalledWith(repoStateInstance, 'explicit'); // Use updated name - includes strategy parameter
            expect(ObservationManager).toHaveBeenCalledWith(repoObsInstance, expect.objectContaining({ notify: expect.any(Function) }));
        });

        it('should initialize ToolRegistry and register initial tools', async () => {
            const config = { ...mockBaseConfig, tools: [mockTool1, mockTool2] };
            // Re-add 'as any' assertion
            // const factory = new AgentFactory(config as any); // Removed unused factory variable
            await new AgentFactory(config as any).initialize(); // Initialize directly for the test effects
            const stateManagerInstance = (StateManager as Mock).mock.results[0].value; // Get StateManager instance
            expect(ToolRegistry).toHaveBeenCalledWith(stateManagerInstance); // Check ToolRegistry dependency
            const registryInstance = (ToolRegistry as Mock).mock.results[0].value;
            expect(registryInstance.registerTool).toHaveBeenCalledTimes(2);
            expect(registryInstance.registerTool).toHaveBeenCalledWith(mockTool1);
            expect(registryInstance.registerTool).toHaveBeenCalledWith(mockTool2);
        });

        // Remove tests related to direct adapter initialization and old reasoning config
        // it('should initialize OpenAIAdapter correctly', async () => { ... });
        // it('should throw error for unsupported reasoning provider', async () => { ... });

        it('should initialize ProviderManager correctly', async () => {
            // Re-add 'as any' assertion
            const factory = new AgentFactory(mockBaseConfig as any);
            await factory.initialize();
            expect(ProviderManagerImpl).toHaveBeenCalledTimes(1);
            expect(ProviderManagerImpl).toHaveBeenCalledWith(mockBaseConfig.providers); // Check with correct config property
        });


        it('should initialize reasoning components', async () => {
            // Re-add 'as any' assertion
            const factory = new AgentFactory(mockBaseConfig as any);
            await factory.initialize();
            const providerManagerInstance = (ProviderManagerImpl as Mock).mock.results[0].value;
            expect(ReasoningEngine).toHaveBeenCalledWith(providerManagerInstance); // Use updated name
            expect(PromptManager).toHaveBeenCalledTimes(1); // Use updated name
            expect(OutputParser).toHaveBeenCalledTimes(1); // Use updated name
        });

        it('should initialize ToolSystem', async () => {
            // Re-add 'as any' assertion
            const factory = new AgentFactory(mockBaseConfig as any);
            await factory.initialize();
            const registryInstance = (ToolRegistry as Mock).mock.results[0].value; // Use updated name
            const stateManagerInstance = (StateManager as Mock).mock.results[0].value; // Use updated name
            const obsManagerInstance = (ObservationManager as Mock).mock.results[0].value;
            expect(ToolSystem).toHaveBeenCalledWith(registryInstance, stateManagerInstance, obsManagerInstance); // Use updated name
        });
    });

    describe('createAgent', () => {
        it('should throw error if initialize() has not been called', () => {
            // Re-add 'as any' assertion
            const factory = new AgentFactory(mockBaseConfig as any);
            expect(() => factory.createAgent()).toThrow("AgentFactory not fully initialized."); // Update error message check
        });

        it('should create and return a PESAgent instance after initialization', async () => {
            // Re-add 'as any' assertion
            const factory = new AgentFactory(mockBaseConfig as any);
            await factory.initialize();
            const agent = factory.createAgent();

            expect(agent).toBeDefined();
            expect(PESAgent).toHaveBeenCalledTimes(1);

            // Verify dependencies passed to PESAgent constructor (using updated names)
            const expectedDeps = {
                stateManager: (StateManager as Mock).mock.results[0].value,
                conversationManager: (ConversationManager as Mock).mock.results[0].value,
                toolRegistry: (ToolRegistry as Mock).mock.results[0].value,
                promptManager: (PromptManager as Mock).mock.results[0].value,
                reasoningEngine: (ReasoningEngine as Mock).mock.results[0].value,
                outputParser: (OutputParser as Mock).mock.results[0].value,
                observationManager: (ObservationManager as Mock).mock.results[0].value,
                toolSystem: (ToolSystem as Mock).mock.results[0].value,
                uiSystem: (UISystemMock as Mock).mock.results[0].value, // Use aliased mock
                a2aTaskRepository: (TaskStatusRepository as Mock).mock.results[0].value, // Add the new A2A task repository
                authManager: null, // Add auth manager (currently null)
                mcpManager: null, // Add MCP manager (currently null)
                instanceDefaultCustomSystemPrompt: undefined // Add default system prompt
            };
            expect(PESAgent).toHaveBeenCalledWith(expectedDeps);
        });
    });

     describe('Getters', () => {
        it('should return null for components before initialization', () => {
            // Re-add 'as any' assertion
            const factory = new AgentFactory(mockBaseConfig as any);
            expect(factory.getStorageAdapter()).toBeNull();
            expect(factory.getUISystem()).toBeNull();
            expect(factory.getToolRegistry()).toBeNull();
        });

        it('should return initialized components after initialization', async () => {
            // Re-add 'as any' assertion
            const factory = new AgentFactory(mockBaseConfig as any);
            await factory.initialize();
            expect(factory.getStorageAdapter()).toBe((InMemoryStorageAdapter as Mock).mock.results[0].value);
            expect(factory.getUISystem()).toBe((UISystemMock as Mock).mock.results[0].value); // Use aliased mock
            expect(factory.getToolRegistry()).toBe((ToolRegistry as Mock).mock.results[0].value); // Use updated name
        });
    });
});