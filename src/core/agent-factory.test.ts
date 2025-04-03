// src/core/agent-factory.test.ts
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { AgentFactory, AgentFactoryConfig, StorageConfig, ReasoningConfig } from './agent-factory';
import { IAgentCore, IToolExecutor, StorageAdapter, ProviderAdapter } from './interfaces';
import { PESAgent } from './agents/pes-agent';

// --- Mock Concrete Implementations ---
// Mock entire modules that the factory imports
vi.mock('../adapters/storage/in-memory', () => ({
    InMemoryStorageAdapter: vi.fn().mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        // Add other methods if needed by repositories during init
    }))
}));
vi.mock('../adapters/storage/indexedDB', () => ({
    IndexedDBStorageAdapter: vi.fn().mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
    }))
}));
vi.mock('../systems/context/conversation-repository', () => ({ ConversationRepository: vi.fn() }));
vi.mock('../systems/observation/observation-repository', () => ({ ObservationRepository: vi.fn() }));
vi.mock('../systems/context/state-repository', () => ({ StateRepository: vi.fn() }));
vi.mock('../systems/ui/typed-socket', () => ({ TypedSocket: vi.fn() }));
vi.mock('../systems/ui/ui-system', () => ({
    UISystemImpl: vi.fn().mockImplementation((obsSocket, convSocket) => ({
        getObservationSocket: vi.fn(() => obsSocket),
        getConversationSocket: vi.fn(() => convSocket),
    }))
}));
vi.mock('../systems/context/conversation-manager', () => ({ ConversationManagerImpl: vi.fn() }));
vi.mock('../systems/context/state-manager', () => ({ StateManagerImpl: vi.fn() }));
vi.mock('../systems/observation/observation-manager', () => ({ ObservationManager: vi.fn() })); // Correct mock export name
vi.mock('../systems/tool/tool-registry', () => ({
    ToolRegistryImpl: vi.fn().mockImplementation(() => ({
        registerTool: vi.fn().mockResolvedValue(undefined),
    }))
}));
vi.mock('../adapters/reasoning/openai', () => ({
    OpenAIAdapter: vi.fn().mockImplementation(() => ({ providerName: 'openai', call: vi.fn() }))
}));
// Mock other provider adapters if testing their selection
vi.mock('../systems/reasoning/reasoning-engine', () => ({ ReasoningEngineImpl: vi.fn() }));
vi.mock('../systems/reasoning/prompt-manager', () => ({ PromptManagerImpl: vi.fn() }));
vi.mock('../systems/reasoning/output-parser', () => ({ OutputParserImpl: vi.fn() }));
vi.mock('../systems/tool/tool-system', () => ({ ToolSystemImpl: vi.fn() }));
vi.mock('./agents/pes-agent', () => ({ PESAgent: vi.fn() })); // Mock the agent itself

// Import the mocked classes after mocking the modules
import { InMemoryStorageAdapter } from '../adapters/storage/in-memory';
import { IndexedDBStorageAdapter } from '../adapters/storage/indexedDB';
import { ConversationRepository } from '../systems/context/conversation-repository';
import { ObservationRepository } from '../systems/observation/observation-repository';
import { StateRepository } from '../systems/context/state-repository';
import { TypedSocket } from '../systems/ui/typed-socket';
import { UISystemImpl } from '../systems/ui/ui-system';
import { ConversationManagerImpl } from '../systems/context/conversation-manager';
import { StateManagerImpl } from '../systems/context/state-manager';
import { ObservationManager } from '../systems/observation/observation-manager'; // Correct import name
import { ToolRegistryImpl } from '../systems/tool/tool-registry';
import { OpenAIAdapter } from '../adapters/reasoning/openai';
import { ReasoningEngineImpl } from '../systems/reasoning/reasoning-engine';
import { PromptManagerImpl } from '../systems/reasoning/prompt-manager';
import { OutputParserImpl } from '../systems/reasoning/output-parser';
import { ToolSystemImpl } from '../systems/tool/tool-system';


// --- Test Data ---
const mockStorageConfigMemory: StorageConfig = { type: 'memory' };
const mockStorageConfigIndexedDB: StorageConfig = { type: 'indexedDB', dbName: 'TestDB' };
const mockReasoningConfigOpenAI: ReasoningConfig = { provider: 'openai', apiKey: 'test-key', model: 'gpt-test' };
const mockTool1: IToolExecutor = { schema: { name: 'tool1', description: '', inputSchema: {} }, execute: vi.fn() };
const mockTool2: IToolExecutor = { schema: { name: 'tool2', description: '', inputSchema: {} }, execute: vi.fn() };

const mockBaseConfig: AgentFactoryConfig = {
    storage: mockStorageConfigMemory,
    reasoning: mockReasoningConfigOpenAI,
};

// --- Test Suite ---
describe('AgentFactory', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should throw error if storage config is missing', () => {
        expect(() => new AgentFactory({ reasoning: mockReasoningConfigOpenAI } as any))
            .toThrow("Storage configuration is required.");
    });

    it('should throw error if reasoning config is missing', () => {
        expect(() => new AgentFactory({ storage: mockStorageConfigMemory } as any))
            .toThrow("Reasoning configuration is required.");
    });

    describe('initialize', () => {
        it('should initialize InMemoryStorageAdapter correctly', async () => {
            const factory = new AgentFactory(mockBaseConfig);
            await factory.initialize();
            expect(InMemoryStorageAdapter).toHaveBeenCalledTimes(1);
            expect(IndexedDBStorageAdapter).not.toHaveBeenCalled();
            const adapterInstance = (InMemoryStorageAdapter as Mock).mock.results[0].value;
            expect(adapterInstance.init).toHaveBeenCalledTimes(1);
        });

        it('should initialize IndexedDBStorageAdapter correctly', async () => {
            const config = { ...mockBaseConfig, storage: mockStorageConfigIndexedDB };
            const factory = new AgentFactory(config);
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
            const factory = new AgentFactory(mockBaseConfig);
            await factory.initialize();
            const adapterInstance = (InMemoryStorageAdapter as Mock).mock.results[0].value;
            expect(ConversationRepository).toHaveBeenCalledWith(adapterInstance);
            expect(ObservationRepository).toHaveBeenCalledWith(adapterInstance);
            expect(StateRepository).toHaveBeenCalledWith(adapterInstance);
        });

        it('should initialize UI system and sockets', async () => {
            const factory = new AgentFactory(mockBaseConfig);
            await factory.initialize();
            expect(TypedSocket).toHaveBeenCalledTimes(2); // Once for Observation, once for Conversation
            const obsSocketInstance = (TypedSocket as Mock).mock.results[0].value;
            const convSocketInstance = (TypedSocket as Mock).mock.results[1].value;
            expect(UISystemImpl).toHaveBeenCalledWith(obsSocketInstance, convSocketInstance);
        });

        it('should initialize managers with repositories and sockets', async () => {
            const factory = new AgentFactory(mockBaseConfig);
            await factory.initialize();
            const repoConvInstance = (ConversationRepository as Mock).mock.results[0].value;
            const repoObsInstance = (ObservationRepository as Mock).mock.results[0].value;
            const repoStateInstance = (StateRepository as Mock).mock.results[0].value;
            const uiSystemInstance = (UISystemImpl as Mock).mock.results[0].value;
            const obsSocket = uiSystemInstance.getObservationSocket();
            const convSocket = uiSystemInstance.getConversationSocket();

            expect(ConversationManagerImpl).toHaveBeenCalledWith(repoConvInstance, convSocket);
            expect(StateManagerImpl).toHaveBeenCalledWith(repoStateInstance);
            expect(ObservationManager).toHaveBeenCalledWith(repoObsInstance, obsSocket); // Correct class name for assertion
        });

        it('should initialize ToolRegistry and register initial tools', async () => {
            const config = { ...mockBaseConfig, tools: [mockTool1, mockTool2] };
            const factory = new AgentFactory(config);
            await factory.initialize();
            expect(ToolRegistryImpl).toHaveBeenCalledTimes(1);
            const registryInstance = (ToolRegistryImpl as Mock).mock.results[0].value;
            expect(registryInstance.registerTool).toHaveBeenCalledTimes(2);
            expect(registryInstance.registerTool).toHaveBeenCalledWith(mockTool1);
            expect(registryInstance.registerTool).toHaveBeenCalledWith(mockTool2);
        });

         it('should initialize OpenAIAdapter correctly', async () => {
            const factory = new AgentFactory(mockBaseConfig);
            await factory.initialize();
            expect(OpenAIAdapter).toHaveBeenCalledTimes(1);
            expect(OpenAIAdapter).toHaveBeenCalledWith({
                apiKey: mockReasoningConfigOpenAI.apiKey,
                model: mockReasoningConfigOpenAI.model,
                // baseURL should not be passed based on previous fix
            });
        });

        // Add tests for other reasoning providers when implemented

        it('should throw error for unsupported reasoning provider', async () => {
             const config = { ...mockBaseConfig, reasoning: { provider: 'unsupported', apiKey: 'key' } as any };
             const factory = new AgentFactory(config);
             await expect(factory.initialize()).rejects.toThrow('Unsupported reasoning provider: unsupported');
        });


        it('should initialize reasoning components', async () => {
            const factory = new AgentFactory(mockBaseConfig);
            await factory.initialize();
            const providerInstance = (OpenAIAdapter as Mock).mock.results[0].value;
            expect(ReasoningEngineImpl).toHaveBeenCalledWith(providerInstance);
            expect(PromptManagerImpl).toHaveBeenCalledTimes(1);
            expect(OutputParserImpl).toHaveBeenCalledTimes(1);
        });

        it('should initialize ToolSystem', async () => {
            const factory = new AgentFactory(mockBaseConfig);
            await factory.initialize();
            const registryInstance = (ToolRegistryImpl as Mock).mock.results[0].value;
            const stateManagerInstance = (StateManagerImpl as Mock).mock.results[0].value;
            const obsManagerInstance = (ObservationManager as Mock).mock.results[0].value; // Correct class name for mock result
            expect(ToolSystemImpl).toHaveBeenCalledWith(registryInstance, stateManagerInstance, obsManagerInstance);
        });
    });

    describe('createAgent', () => {
        it('should throw error if initialize() has not been called', () => {
            const factory = new AgentFactory(mockBaseConfig);
            expect(() => factory.createAgent()).toThrow("AgentFactory not initialized.");
        });

        it('should create and return a PESAgent instance after initialization', async () => {
            const factory = new AgentFactory(mockBaseConfig);
            await factory.initialize();
            const agent = factory.createAgent();

            expect(agent).toBeDefined();
            expect(PESAgent).toHaveBeenCalledTimes(1);

            // Verify dependencies passed to PESAgent constructor
            const expectedDeps = {
                stateManager: (StateManagerImpl as Mock).mock.results[0].value,
                conversationManager: (ConversationManagerImpl as Mock).mock.results[0].value,
                toolRegistry: (ToolRegistryImpl as Mock).mock.results[0].value,
                promptManager: (PromptManagerImpl as Mock).mock.results[0].value,
                reasoningEngine: (ReasoningEngineImpl as Mock).mock.results[0].value,
                outputParser: (OutputParserImpl as Mock).mock.results[0].value,
                observationManager: (ObservationManager as Mock).mock.results[0].value, // Correct class name for mock result
                toolSystem: (ToolSystemImpl as Mock).mock.results[0].value,
            };
            expect(PESAgent).toHaveBeenCalledWith(expectedDeps);
        });
    });

     describe('Getters', () => {
        it('should return null for components before initialization', () => {
            const factory = new AgentFactory(mockBaseConfig);
            expect(factory.getStorageAdapter()).toBeNull();
            expect(factory.getUISystem()).toBeNull();
            expect(factory.getToolRegistry()).toBeNull();
        });

        it('should return initialized components after initialization', async () => {
            const factory = new AgentFactory(mockBaseConfig);
            await factory.initialize();
            expect(factory.getStorageAdapter()).toBe((InMemoryStorageAdapter as Mock).mock.results[0].value);
            expect(factory.getUISystem()).toBe((UISystemImpl as Mock).mock.results[0].value);
            expect(factory.getToolRegistry()).toBe((ToolRegistryImpl as Mock).mock.results[0].value);
        });
    });
});