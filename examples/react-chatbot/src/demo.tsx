import ReactDOM from 'react-dom/client';
import { ZyntopiaWebChat } from './ZyntopiaWebChat';
import { InMemoryStorageAdapter, GeminiAdapter } from 'art-framework';
import './styles/globals.css';

// Demo configuration for the ART Framework
const demoConfig = {
  // Core ART Framework configuration
  artConfig: {
    // Storage configuration
    storage: new InMemoryStorageAdapter(),
    
    // Provider configuration - using correct ProviderManagerConfig format
    providers: {
      availableProviders: [
        {
          name: 'gemini',
          adapter: GeminiAdapter,
          isLocal: false,
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
          id: 'local-mcp',
          name: 'Local MCP Server',
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
  title: 'Zyntopia WebChat Demo',
  subtitle: 'Powered by ART Framework with Gemini',
  
  // Event handlers
  onMessage: (message: any) => {
    console.log('New message:', message);
  },
  onError: (error: Error) => {
    console.error('Chatbot error:', error);
  },
};

function App() {
  return (
    <div className="h-screen w-screen bg-slate-100 dark:bg-slate-900 font-sans">
      <ZyntopiaWebChat {...demoConfig} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />); 