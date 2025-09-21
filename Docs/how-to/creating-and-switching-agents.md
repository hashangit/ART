# How to Create and Switch Between Agents in ART Framework

The ART framework provides a flexible agent system that allows developers to create custom agents or modify existing ones. This guide will show you how to create a modified version of the PES agent, create completely new agents, and dynamically switch between different agents.

## Prerequisites

Before you begin, ensure you have:
- A basic understanding of the ART framework architecture
- Familiarity with TypeScript/JavaScript
- An initialized ART instance

## 1. Creating a Modified Version of the PES Agent

The PES (Plan-Execute-Synthesize) agent is the default agent in ART. You can create a modified version by extending the existing PESAgent class.

### Extending the PESAgent Class

```typescript
import { PESAgent } from 'art-framework';
import type { AgentProps, AgentFinalResponse } from 'art-framework';

export class CustomPESAgent extends PESAgent {
  // Override specific methods to customize behavior
  async process(props: AgentProps): Promise<AgentFinalResponse> {
    // Add custom logic before calling the parent process method
    console.log('Custom logic before processing');
    
    // Call the parent process method
    const result = await super.process(props);
    
    // Add custom logic after processing
    console.log('Custom logic after processing');
    
    return result;
  }
}
```

## 2. Creating Completely New Agents

To create a completely new agent, you need to implement the `IAgentCore` interface. This gives you full control over the agent's workflow while ensuring compatibility with the ART framework.

### Step 1: Implement the IAgentCore Interface

```typescript
import { IAgentCore } from 'art-framework';
import type { 
  AgentProps, 
  AgentFinalResponse, 
  ConversationMessage, 
  MessageRole 
} from 'art-framework';
import { generateUUID } from 'art-framework';

export class SimpleAgent implements IAgentCore {
  constructor(private dependencies: {
    // Inject the dependencies your agent needs
    stateManager: any;
    conversationManager: any;
    toolRegistry: any;
    reasoningEngine: any;
    // Add other dependencies as needed
  }) {}

  async process(props: AgentProps): Promise<AgentFinalResponse> {
    const startTime = Date.now();
    const traceId = props.traceId ?? generateUUID();
    
    try {
      // Load thread context
      const threadContext = await this.dependencies.stateManager.loadThreadContext(
        props.threadId,
        props.userId
      );
      
      // Get conversation history
      const history = await this.dependencies.conversationManager.getMessages(
        props.threadId,
        { limit: threadContext.config.historyLimit }
      );
      
      // Get available tools
      const availableTools = await this.dependencies.toolRegistry.getAvailableTools({
        enabledForThreadId: props.threadId
      });
      
      // Simple agent logic - just call the LLM directly
      const prompt = this.constructPrompt(props.query, history, availableTools);
      
      const callOptions = {
        threadId: props.threadId,
        traceId: traceId,
        userId: props.userId,
        sessionId: props.sessionId,
        stream: props.options?.stream ?? false,
        providerConfig: threadContext.config.providerConfig,
        ...(props.options?.llmParams ?? {}),
      };
      
      const stream = await this.dependencies.reasoningEngine.call(prompt, callOptions);
      
      let responseText = '';
      for await (const event of stream) {
        if (event.type === 'TOKEN') {
          responseText += event.data;
        }
      }
      
      // Save the response
      const finalAiMessage: ConversationMessage = {
        messageId: generateUUID(),
        threadId: props.threadId,
        role: MessageRole.AI,
        content: responseText,
        timestamp: Date.now(),
        metadata: { traceId },
      };
      
      await this.dependencies.conversationManager.addMessages(props.threadId, [finalAiMessage]);
      
      const endTime = Date.now();
      
      return {
        response: finalAiMessage,
        metadata: {
          threadId: props.threadId,
          traceId: traceId,
          userId: props.userId,
          status: 'success',
          totalDurationMs: endTime - startTime,
          llmCalls: 1,
          toolCalls: 0,
        }
      };
    } catch (error: any) {
      throw error;
    }
  }
  
  private constructPrompt(
    query: string,
    history: ConversationMessage[],
    tools: any[]
  ): any {
    // Construct your prompt based on the query, history, and tools
    // This is a simplified example
    return [
      {
        role: 'system',
        content: 'You are a helpful AI assistant.'
      },
      ...history.map(msg => ({
        role: msg.role.toLowerCase(),
        content: msg.content
      })),
      {
        role: 'user',
        content: query
      }
    ];
  }
}
```

### Step 2: Required Dependencies for Custom Agents

When creating a custom agent, you'll typically need access to these core components through the ART framework's dependency injection system:

- `StateManager`: For loading thread configuration and state
- `ConversationManager`: For managing conversation history
- `ToolRegistry`: For accessing available tools
- `ReasoningEngine`: For calling LLMs
- `ObservationManager`: For recording observations
- `ToolSystem`: For executing tools
- `UISystem`: For UI communication
- `SystemPromptResolver`: For resolving system prompts

## 3. Dynamically Switching Between Agents

The ART framework allows you to dynamically switch between different agents at initialization time.

### Setting the Agent at Initialization

```typescript
import { createArtInstance } from 'art-framework';
import { CustomPESAgent } from './custom-pes-agent';
import { SimpleAgent } from './simple-agent';
import type { ArtInstanceConfig } from 'art-framework';

// Configuration for using the custom PES agent
const configWithCustomPES: ArtInstanceConfig = {
  storage: { type: 'memory' },
  providers: {
    // Your provider configuration
  },
  agentCore: CustomPESAgent, // Specify your custom agent class
  tools: [
    // Your tools
  ]
};

// Configuration for using the simple agent
const configWithSimpleAgent: ArtInstanceConfig = {
  storage: { type: 'memory' },
  providers: {
    // Your provider configuration
  },
  agentCore: SimpleAgent, // Specify your simple agent class
  tools: [
    // Your tools
  ]
};

// Create ART instance with custom PES agent
const artWithCustomPES = await createArtInstance(configWithCustomPES);

// Create ART instance with simple agent
const artWithSimpleAgent = await createArtInstance(configWithSimpleAgent);
```

## Best Practices

1. **Maintain Compatibility**: Ensure your custom agents implement the `IAgentCore` interface correctly to maintain compatibility with the ART framework.

2. **Error Handling**: Implement proper error handling in your custom agents.

3. **Observations**: Record meaningful observations during agent execution to enable debugging and monitoring.

4. **Resource Management**: Properly manage resources like LLM connections and clean up when needed.

5. **Testing**: Thoroughly test your custom agents to ensure they work correctly in different scenarios.

6. **Documentation**: Document your custom agents' behavior and configuration options.

## Conclusion

The ART framework provides a flexible system for creating and switching between different agents. You can modify existing agents like the PES agent or create completely new agents with custom workflows. Dynamic agent switching is supported at initialization.

By following the patterns described in this guide, you can create powerful, customized AI agents that fit your specific application needs while maintaining full compatibility with the ART framework.