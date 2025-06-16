# ART Framework React Chatbot Component

A powerful, embeddable React chatbot component built with the ART (Agent Runtime) Framework. This component showcases all the advanced capabilities of the ART Framework while providing an easy-to-use interface for building AI-powered chat applications.

## Features

- 🤖 **Full ART Framework Integration**: Leverage all ART capabilities including reasoning, tool usage, and agent communication
- 🔧 **Toggleable Features**: Enable/disable A2A, MCP, Auth, Tools, and Observation systems on demand
- 🎨 **Modern UI**: Beautiful, responsive design with light/dark theme support
- 📱 **Mobile Friendly**: Fully responsive interface that works on all devices
- 🔌 **Easy Embedding**: Drop into any React application with minimal configuration
- 📊 **Rich Metadata**: View reasoning, tool usage, and execution details for each message
- ⚙️ **Configurable**: Extensive configuration options for customization

## Quick Start

### Installation

```bash
npm install @art-framework/react-chatbot
```

### Basic Usage

```jsx
import React from 'react';
import { ArtChatbot } from '@art-framework/react-chatbot';
import { InMemoryStorageAdapter, OpenAIAdapter } from 'art-framework';

const chatbotConfig = {
  artConfig: {
    storage: new InMemoryStorageAdapter(),
    providers: [
      {
        name: 'openai',
        adapter: new OpenAIAdapter({
          apiKey: process.env.REACT_APP_OPENAI_API_KEY,
          model: 'gpt-3.5-turbo',
        }),
      },
    ],
    defaultProvider: 'openai',
  },
  title: 'My AI Assistant',
  features: {
    toolsEnabled: true,
    a2aEnabled: false,
    mcpEnabled: false,
  },
};

function App() {
  return (
    <div style={{ height: '500px', width: '400px' }}>
      <ArtChatbot config={chatbotConfig} />
    </div>
  );
}
```

## Configuration

### ArtChatbotConfig

The main configuration object for the chatbot component:

```typescript
interface ArtChatbotConfig {
  // Core ART Framework configuration
  artConfig: ArtInstanceConfig;
  
  // UI Configuration
  title?: string;
  placeholder?: string;
  theme?: 'light' | 'dark' | 'auto';
  
  // Feature toggles
  features?: {
    a2aEnabled?: boolean;     // Agent-to-Agent communication
    mcpEnabled?: boolean;     // Model Context Protocol
    authEnabled?: boolean;    // Authentication system
    toolsEnabled?: boolean;   // Built-in tools
    observationEnabled?: boolean; // Observation system
  };
  
  // Layout
  height?: string;
  width?: string;
  position?: 'fixed' | 'relative';
  
  // Event handlers
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
  onFeatureToggle?: (feature: string, enabled: boolean) => void;
}
```

### ART Framework Features

#### A2A (Agent-to-Agent)
Enable sophisticated task delegation between multiple AI agents for complex workflows.

```jsx
features: {
  a2aEnabled: true,
}
```

#### MCP (Model Context Protocol)
Integrate external tools and services seamlessly into the conversation.

```jsx
features: {
  mcpEnabled: true,
}
```

#### Authentication
Secure operations with multiple authentication strategies.

```jsx
features: {
  authEnabled: true,
}
```

#### Built-in Tools
Access to calculator, utilities, and extensible tool system.

```jsx
features: {
  toolsEnabled: true,
}
```

#### Observation System
Real-time monitoring and analytics for agent behavior.

```jsx
features: {
  observationEnabled: true,
}
```

## Advanced Usage

### Custom Styling

```jsx
import { ArtChatbot } from '@art-framework/react-chatbot';
// Import styles separately if needed
import '@art-framework/react-chatbot/styles/ArtChatbot.css';

<ArtChatbot
  config={config}
  className="my-custom-chatbot"
  style={{
    height: '600px',
    border: '2px solid #007bff',
    borderRadius: '16px',
  }}
/>
```

### Event Handling

```jsx
const handleMessage = (message) => {
  console.log('New message:', message);
  // Send to analytics, save to database, etc.
};

const handleError = (error) => {
  console.error('Chatbot error:', error);
  // Show user-friendly error message
};

const handleFeatureToggle = (feature, enabled) => {
  console.log(`Feature ${feature} is now ${enabled ? 'on' : 'off'}`);
  // Update user preferences, analytics, etc.
};

<ArtChatbot
  config={{
    ...config,
    onMessage: handleMessage,
    onError: handleError,
    onFeatureToggle: handleFeatureToggle,
  }}
/>
```

### Multiple Providers

```jsx
const config = {
  artConfig: {
    storage: new InMemoryStorageAdapter(),
    providers: [
      {
        name: 'openai',
        adapter: new OpenAIAdapter({
          apiKey: process.env.REACT_APP_OPENAI_API_KEY,
          model: 'gpt-4',
        }),
      },
      {
        name: 'gemini',
        adapter: new GeminiAdapter({
          apiKey: process.env.REACT_APP_GEMINI_API_KEY,
          model: 'gemini-pro',
        }),
      },
      {
        name: 'anthropic',
        adapter: new AnthropicAdapter({
          apiKey: process.env.REACT_APP_ANTHROPIC_API_KEY,
          model: 'claude-3-sonnet',
        }),
      },
    ],
    defaultProvider: 'openai',
  },
  // ... other config
};
```

## Development

### Running the Demo

```bash
cd examples/react-chatbot
npm install
npm run dev
```

The demo will be available at `http://localhost:3001`.

### Building

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

## API Reference

### Components

- `ArtChatbot` - Main chatbot component
- `ChatInterface` - Core chat interface
- `MessageDisplay` - Individual message component
- `ChatInput` - Input area component
- `SettingsPanel` - Feature toggle panel
- `LoadingIndicator` - Loading state component
- `ErrorDisplay` - Error state component

### Types

- `ArtChatbotConfig` - Main configuration interface
- `ChatMessage` - Message data structure
- `ArtFeatures` - Feature toggle configuration
- `ChatbotContextType` - Context type for providers

### Hooks

- `useArtChatbot` - Access chatbot context and state

## Examples

### Basic Chatbot

```jsx
<ArtChatbot
  config={{
    artConfig: basicArtConfig,
    title: 'Support Assistant',
    features: { toolsEnabled: true },
  }}
/>
```

### Full-Featured Chatbot

```jsx
<ArtChatbot
  config={{
    artConfig: advancedArtConfig,
    title: 'AI Assistant',
    theme: 'dark',
    features: {
      a2aEnabled: true,
      mcpEnabled: true,
      authEnabled: true,
      toolsEnabled: true,
      observationEnabled: true,
    },
    onMessage: (msg) => console.log(msg),
    onFeatureToggle: (feature, enabled) => {
      console.log(`${feature}: ${enabled}`);
    },
  }}
/>
```

### Embedded in Modal

```jsx
const [showChat, setShowChat] = useState(false);

return (
  <>
    <button onClick={() => setShowChat(true)}>
      Open Chat
    </button>
    
    {showChat && (
      <div className="modal-overlay">
        <div className="modal-content">
          <ArtChatbot
            config={config}
            style={{ height: '70vh', width: '80vw' }}
          />
          <button onClick={() => setShowChat(false)}>
            Close
          </button>
        </div>
      </div>
    )}
  </>
);
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - see the [LICENSE](../../LICENSE) file for details.

## Contributing

Contributions are welcome! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## Support

For questions and support:
- Create an issue on [GitHub](https://github.com/your-repo/art-framework)
- Check the [Documentation](../../README.md)
- Join our [Discord Community](https://discord.gg/your-discord) 