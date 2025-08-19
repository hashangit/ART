import ReactDOM from 'react-dom/client';
import ArtWebChat from './ArtWebChat';
import { IndexedDBStorageAdapter, GeminiAdapter, OpenAIAdapter } from 'art-framework';
import { ArtMessage } from './lib/types';
import './styles/globals.css';

// Demo configuration for the ART Framework with ART UI
const artConfig = {
// Core ART Framework configuration
artConfig: {
  // Storage configuration
  storage: new IndexedDBStorageAdapter({ objectStores: [] }),
  
  // Provider configuration - using correct ProviderManagerConfig format
  providers: {
    availableProviders: [
      {
        name: 'Gemini 2.5 Flash',
        adapter: GeminiAdapter,
        isLocal: false,
        baseOptions: { provider: 'gemini', modelId: 'gemini-2.5-flash-preview-05-20' }
      },
      {
        name: 'Gemini 2.5 Pro',
        adapter: GeminiAdapter,
        isLocal: false,
        baseOptions: { provider: 'gemini', modelId: 'gemini-2.5-pro-preview-06-05' }
      },
      {
          name: 'GPT-4o',
          adapter: OpenAIAdapter,
          isLocal: false,
          baseOptions: { provider: 'openai', modelId: 'gpt-4o' }
      },
      {
          name: 'GPT-4o Mini',
          adapter: OpenAIAdapter,
          isLocal: false,
          baseOptions: { provider: 'openai', modelId: 'gpt-4o-mini' }
      },
    ],
    maxParallelApiInstancesPerProvider: 5,
    apiInstanceIdleTimeoutSeconds: 300,
  },
    
    // Tool configurations
    tools: [
      // Built-in tools will be included by default
    ],
    
    // A2A Configuration - enable with localhost:4200
    a2a: {
      enabled: true,
      discoveryUrl: 'http://localhost:4200/api/services',
    },
    
    // MCP Configuration - enable with localhost:4200
    mcp: {
      servers: [
        {
          id: 'zyntopia-mcp',
          name: 'Zyntopia MCP Service',
          url: 'http://localhost:4200/api/mcp',
          enabled: true,
          timeout: 10000,
        }
      ],
      defaultTimeout: 10000,
      autoRetry: true,
      retryInterval: 1000,
      maxRetries: 3,
      autoRefresh: false,
      refreshInterval: 30000,
    },
  },
  
  // UI Configuration
  title: 'ART WebChat',
  subtitle: 'Powered by ART Framework',
  defaultModel: 'Gemini 2.5 Flash', // Match the 'name' from availableProviders
  
  // Event handlers
  onMessage: (message: ArtMessage) => {
    console.log('New message:', message);
  },
  onError: (error: Error) => {
    console.error('Chatbot error:', error);
  },
};

function App() {
  return (
    <div className="h-screen w-screen bg-slate-100 dark:bg-slate-900 font-sans">
      <ArtWebChat {...artConfig} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />); 