import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { createArtInstance } from 'art-framework';
import { ArtInstance } from '../../../../src/core/interfaces';
import { AvailableProviderEntry, MessageRole, ObservationType } from '../../../../src/types';
import { ZyntopiaMessage, ZyntopiaObservation, ZyntopiaWebChatConfig } from '../lib/types';
import { mapObservationToFinding, parseArtResponse, safeJsonParse } from '../lib/utils.tsx';

export function useZyntopiaChat({ artConfig, defaultModel, onMessage, onError }: ZyntopiaWebChatConfig) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ZyntopiaMessage[]>([]);
  const [observations, setObservations] = useState<ZyntopiaObservation[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableProviderEntry[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel || '');
  const [lastResponseData, setLastResponseData] = useState<{ response: any; obsStartIndex: number } | null>(null);
  
  const artInstanceRef = useRef<ArtInstance | null>(null);
  const threadId = useRef<string>(`thread_${Date.now()}_${Math.random().toString(36).substring(2)}`);

  useEffect(() => {
    const initializeART = async () => {
      try {
        setIsLoading(true);
        
        if (artConfig?.providers?.availableProviders) {
            const models = artConfig.providers.availableProviders;
            setAvailableModels(models);
            if (models.length > 0) {
              const defaultModelExists = models.some((m: AvailableProviderEntry) => m.name === defaultModel);
              const initialModel = defaultModelExists ? defaultModel : models[0].name;
              setSelectedModel(initialModel!);
            }
        } else {
            console.warn('No available providers configured in artConfig.');
        }

        const artInstance = await createArtInstance(artConfig);
        artInstanceRef.current = artInstance;
        
        setIsInitialized(true);
        setError(null);

        const historicalMessages = await artInstance.conversationManager.getMessages(threadId.current, { limit: 100 });
        if (historicalMessages && historicalMessages.length > 0) {
            const mappedMessages: ZyntopiaMessage[] = historicalMessages.map(m => ({
                id: m.messageId,
                content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                role: m.role === MessageRole.USER ? 'user' : 'assistant',
                timestamp: new Date(m.timestamp),
                reactions: m.role !== MessageRole.USER
            }));
            setMessages(mappedMessages);
            toast.success(`Loaded ${mappedMessages.length} messages from history.`);
        } else {
            const welcomeMessage: ZyntopiaMessage = {
              id: Date.now().toString(),
              content: `Hello! I'm your personal AI Assistant Zee`,
              role: 'assistant',
              timestamp: new Date(),
              reactions: true,
            };
            setMessages([welcomeMessage]);
        }
        
        toast.success('ART Framework initialized successfully!');

        const observationSocket = artInstance.uiSystem.getObservationSocket();
        if (observationSocket) {
          const unsubscribe = observationSocket.subscribe(
            (observation: any) => {
              const mappedObservation = mapObservationToFinding(observation);
              setObservations(prev => [...prev, mappedObservation]);
            },
            [ObservationType.INTENT, ObservationType.PLAN, ObservationType.THOUGHTS, ObservationType.TOOL_CALL, ObservationType.TOOL_EXECUTION, ObservationType.SYNTHESIS],
            { threadId: threadId.current }
          );
          
          return () => unsubscribe();
        } else {
          console.warn('No observation socket available');
        }
        
      } catch (err) {
        console.error('Failed to initialize ART Framework:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize ART Framework');
        onError?.(err instanceof Error ? err : new Error('Initialization failed'));
      } finally {
        setIsLoading(false);
      }
    };

    initializeART();
  }, [artConfig, onError, defaultModel]);

  useEffect(() => {
    if (!lastResponseData) return;

    const { response, obsStartIndex } = lastResponseData;
    const turnObservations = observations.slice(obsStartIndex);

    const llmMetadataObservations = turnObservations.filter(
      (obs: any) => obs.type === 'LLM_STREAM_METADATA'
    );
    
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let timeToFirstTokenMs: number | undefined;
    let lastStopReason: string | undefined;

    if (llmMetadataObservations.length > 0) {
      llmMetadataObservations.forEach((obs: any) => {
        const meta = safeJsonParse(obs.content);
        if (meta) {
          totalInputTokens += meta.inputTokens || 0;
          totalOutputTokens += meta.outputTokens || 0;
          if (timeToFirstTokenMs === undefined && meta.timeToFirstTokenMs) {
            timeToFirstTokenMs = meta.timeToFirstTokenMs;
          }
          if (meta.stopReason) {
            lastStopReason = meta.stopReason;
          }
        }
      });
    } else if (response.metadata.llmMetadata) {
      const llmMeta = response.metadata.llmMetadata;
      totalInputTokens = llmMeta.inputTokens || 0;
      totalOutputTokens = llmMeta.outputTokens || 0;
      timeToFirstTokenMs = llmMeta.timeToFirstTokenMs;
      lastStopReason = llmMeta.stopReason;
    }

    const meta: Record<string, any> = {
      'Input Tokens': totalInputTokens,
      'Output Tokens': totalOutputTokens,
      'Total Tokens': totalInputTokens + totalOutputTokens,
      'First Token MS': timeToFirstTokenMs,
      'Total Time MS': response.metadata.totalDurationMs,
      'Finish Reason': lastStopReason || response.metadata.llmMetadata?.stopReason || 'stop',
      'LLM Calls': response.metadata.llmCalls,
      'Tool Calls': response.metadata.toolCalls,
    };

    const finalMetadata = Object.fromEntries(Object.entries(meta).filter(([_, v]) => v !== null && v !== undefined && v !== 0));

    let responseContent = '';
    const responseMessage = response.response;
    if (responseMessage && typeof responseMessage.content === 'string') {
      responseContent = responseMessage.content;
    } else if (responseMessage) {
      responseContent = JSON.stringify(responseMessage.content);
    } else {
      responseContent = 'I apologize, but I encountered an issue processing your request.';
    }
    
    const { thoughts: messageThoughts, response: finalResponse } = parseArtResponse(responseContent);

    const assistantMessage: ZyntopiaMessage = {
      id: (Date.now() + 1).toString(),
      content: finalResponse,
      role: 'assistant',
      timestamp: new Date(),
      reactions: true,
      thoughts: messageThoughts,
      metadata: finalMetadata
    };

    setMessages(prev => [...prev, assistantMessage]);
    onMessage?.(assistantMessage);
    setIsLoading(false);
    setLastResponseData(null);

  }, [lastResponseData, observations, onMessage, onError]);

  useEffect(() => {
    const updateThreadConfig = async () => {
      if (!isInitialized || !artInstanceRef.current || !selectedModel) return;

      const stateManager = artInstanceRef.current.stateManager;
      const selectedModelEntry = availableModels.find(m => m.name === selectedModel);

      if (stateManager && selectedModelEntry) {
        const provider = selectedModelEntry.baseOptions?.provider;
        const modelId = selectedModelEntry.baseOptions?.modelId;

        if (!provider || !modelId) {
            console.error('Selected model entry is missing baseOptions with provider and modelId', selectedModelEntry);
            toast.error('Selected model is misconfigured.');
            return;
        }
        
        const apiKey = provider === 'gemini' ? import.meta.env.VITE_GEMINI_API_KEY : 
                       provider === 'openai' ? import.meta.env.VITE_OPENAI_API_KEY : 
                       'your-api-key';
        
        await stateManager.setThreadConfig(threadId.current, {
          providerConfig: {
            providerName: selectedModelEntry.name,
            modelId: modelId,
            adapterOptions: { apiKey },
          },
          enabledTools: [],
          historyLimit: 10,
          systemPrompt: `You are Zee, a helpful AI assistant powered by the ART Framework.

Your entire output MUST strictly follow the format below, using XML-style tags. Do not include any other text, headers, or explanations outside of this structure.

<Intent>
[Your concise understanding of the user's primary goal.]
</Intent>

<Plan>
[A numbered list of the steps you will take to address the user's request.]
</Plan>

<Thought>
[Your reasoning or reflection on a step. You can have multiple thought blocks.]
</Thought>

<Response>
[The final, user-facing answer, formatted in clear and readable markdown.]
</Response>`,
        });
        toast(`Model switched to ${selectedModelEntry.name}`);
      }
    };

    updateThreadConfig();
  }, [selectedModel, isInitialized, availableModels]);

  const sendMessage = async (query: string, userMessageContent: string) => {
    if (!isInitialized || !artInstanceRef.current || isLoading) {
      return;
    }

    const userMessage: ZyntopiaMessage = {
      id: Date.now().toString(),
      content: userMessageContent,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const obsStartIndex = observations.length;
    try {
      const response = await artInstanceRef.current.process({
        query,
        threadId: threadId.current,
        options: {},
      });
      setLastResponseData({ response, obsStartIndex });
    } catch (err) {
      console.error('Error processing message:', err);
      const errorMessage: ZyntopiaMessage = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        reactions: true,
      };
      setMessages(prev => [...prev, errorMessage]);
      onError?.(err instanceof Error ? err : new Error('Processing failed'));
      setIsLoading(false);
    }
  };

  const handleRetryMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;
    
    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;
    
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    sendMessage(userMessage.content, userMessage.content);
  };
  
  const handleClearConversation = () => {
    setMessages([]);
    setObservations([]);
    toast.success('Conversation cleared');
  };

  return {
    isInitialized,
    isLoading,
    error,
    messages,
    observations,
    availableModels,
    selectedModel,
    setSelectedModel,
    sendMessage,
    handleRetryMessage,
    handleClearConversation,
  };
} 