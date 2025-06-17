import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { createArtInstance, generateUUID } from 'art-framework';
import { ArtInstance } from '../../../../src/core/interfaces';
import { AvailableProviderEntry, MessageRole, ObservationType, ConversationMessage } from '../../../../src/types';
import { ZyntopiaMessage, ZyntopiaObservation, ZyntopiaWebChatConfig, ChatHistoryItem } from '../lib/types';
import { mapObservationToFinding, parseArtResponse, safeJsonParse } from '../lib/utils.tsx';

const CHAT_HISTORY_KEY = 'zyntopia_chat_history';
const CURRENT_THREAD_ID_KEY = 'zyntopia_current_thread_id';

export function useZyntopiaChat({ artConfig, defaultModel, onMessage, onError }: ZyntopiaWebChatConfig) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ZyntopiaMessage[]>([]);
  const [observations, setObservations] = useState<ZyntopiaObservation[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableProviderEntry[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel || '');
  const [lastResponseData, setLastResponseData] = useState<{ response: any; obsStartIndex: number } | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  
  const artInstanceRef = useRef<ArtInstance | null>(null);
  const observationSocketUnsubscribe = useRef<() => void | undefined>();

  const loadHistoryForThread = useCallback(async (instance: ArtInstance, tid: string) => {
    const [historicalMessages, historicalObservations] = await Promise.all([
      instance.conversationManager.getMessages(tid, { limit: 100 }),
      instance.observationManager.getObservations(tid, { limit: 500 }), // Fetch observations for the thread
    ]);
    
    if (historicalMessages && historicalMessages.length > 0) {
        const mappedMessages: ZyntopiaMessage[] = historicalMessages.map((m: ConversationMessage) => {
            if (m.role === MessageRole.USER) {
                return {
                    id: m.messageId,
                    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                    role: 'user',
                    timestamp: new Date(m.timestamp),
                };
            }

            // For assistant messages, parse thoughts and reconstruct metadata
            const { thoughts, response } = parseArtResponse(typeof m.content === 'string' ? m.content : '');
            
            let finalMetadata: Record<string, any> = {};
            const traceId = m.metadata?.traceId;

            if (traceId && historicalObservations) {
                const turnObservations = historicalObservations.filter(obs => obs.metadata?.traceId === traceId);
                const llmMetadataObservations = turnObservations.filter(
                    (obs: any) => obs.type === ObservationType.LLM_STREAM_METADATA
                );

                let totalInputTokens = 0;
                let totalOutputTokens = 0;
                let timeToFirstTokenMs: number | undefined;
                let lastStopReason: string | undefined;
                let totalDurationMs: number | undefined;
                let llmCalls = 0;
                let toolCalls = 0;

                if (llmMetadataObservations.length > 0) {
                    llmMetadataObservations.forEach((obs: any) => {
                        const meta = obs.payload || {};
                        totalInputTokens += meta.inputTokens || 0;
                        totalOutputTokens += meta.outputTokens || 0;
                        if (timeToFirstTokenMs === undefined && meta.timeToFirstTokenMs) {
                            timeToFirstTokenMs = meta.timeToFirstTokenMs;
                        }
                        if (meta.stopReason) {
                            lastStopReason = meta.stopReason;
                        }
                    });
                }
                
                const executionObs = turnObservations.find(obs => obs.type === ObservationType.EXECUTION);
                if (executionObs) {
                    const payload = executionObs.payload || {};
                    totalDurationMs = payload.totalDurationMs;
                    llmCalls = payload.llmCalls;
                    toolCalls = payload.toolCalls;
                }

                const meta = {
                    'Input Tokens': totalInputTokens,
                    'Output Tokens': totalOutputTokens,
                    'Total Tokens': totalInputTokens + totalOutputTokens,
                    'First Token MS': timeToFirstTokenMs,
                    'Total Time MS': totalDurationMs,
                    'Finish Reason': lastStopReason,
                    'LLM Calls': llmCalls,
                    'Tool Calls': toolCalls,
                };

                finalMetadata = Object.fromEntries(Object.entries(meta).filter(([_, v]) => v !== null && v !== undefined && v !== 0));
            }

            return {
                id: m.messageId,
                content: response,
                role: 'assistant',
                timestamp: new Date(m.timestamp),
                reactions: true,
                thoughts: thoughts,
                metadata: finalMetadata,
            };
        });
        setMessages(mappedMessages);
    } else {
        const welcomeMessage: ZyntopiaMessage = {
          id: Date.now().toString(),
          content: `Hello! I'm your personal AI Assistant Zee. How can I help you today?`,
          role: 'assistant',
          timestamp: new Date(),
          reactions: true,
        };
        setMessages([welcomeMessage]);
    }
  }, []);

  const switchThread = useCallback(async (newThreadId: string | null) => {
    if (!newThreadId || !artInstanceRef.current) return;
    
    setMessages([]);
    setObservations([]);
    localStorage.setItem(CURRENT_THREAD_ID_KEY, newThreadId);
    setThreadId(newThreadId);
    
    await loadHistoryForThread(artInstanceRef.current, newThreadId);

    // Unsubscribe from old thread observations and subscribe to new one
    if (observationSocketUnsubscribe.current) {
      observationSocketUnsubscribe.current();
    }
    const observationSocket = artInstanceRef.current.uiSystem.getObservationSocket();
    if (observationSocket) {
      observationSocketUnsubscribe.current = observationSocket.subscribe(
        (observation: any) => {
          const mappedObservation = mapObservationToFinding(observation);
          setObservations(prev => [...prev, mappedObservation]);
        },
        [ObservationType.INTENT, ObservationType.PLAN, ObservationType.THOUGHTS, ObservationType.TOOL_CALL, ObservationType.TOOL_EXECUTION, ObservationType.SYNTHESIS],
        { threadId: newThreadId }
      );
    }
  }, [loadHistoryForThread]);

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

        const savedThreadId = localStorage.getItem(CURRENT_THREAD_ID_KEY);
        const initialThreadId = savedThreadId || generateUUID();
        
        if (!savedThreadId) {
            const newHistory: ChatHistoryItem[] = safeJsonParse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]', []);
            newHistory.unshift({ threadId: initialThreadId, title: 'New Chat', timestamp: Date.now() });
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newHistory));
        }

        await switchThread(initialThreadId);
        
        toast.success('ART Framework initialized successfully!');
        
      } catch (err) {
        console.error('Failed to initialize ART Framework:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize ART Framework');
        onError?.(err instanceof Error ? err : new Error('Initialization failed'));
      } finally {
        setIsLoading(false);
      }
    };

    initializeART();
    
    return () => {
      if (observationSocketUnsubscribe.current) {
        observationSocketUnsubscribe.current();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artConfig, onError, defaultModel]);

  // This effect handles the response processing logic
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

  // This effect manages the model/provider configuration for the current thread
  useEffect(() => {
    const updateThreadConfig = async () => {
      if (!isInitialized || !artInstanceRef.current || !selectedModel || !threadId) return;

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
        
        await stateManager.setThreadConfig(threadId, {
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
        // We only show this toast if the user manually changes the model, not on initial load.
        // A check could be added here if needed.
        // toast(`Model switched to ${selectedModelEntry.name}`);
      }
    };

    updateThreadConfig();
  }, [selectedModel, isInitialized, availableModels, threadId]);

  const sendMessage = async (query: string, userMessageContent: string) => {
    if (!isInitialized || !artInstanceRef.current || isLoading || !threadId) {
      return;
    }

    // If this is the first message from the user in a new chat, update the chat history title
    if (messages.length <= 1) { // Welcome message is the first
        const history: ChatHistoryItem[] = safeJsonParse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]', []);
        const currentThreadHistory = history.find(h => h.threadId === threadId);
        if (currentThreadHistory) {
            currentThreadHistory.title = userMessageContent.substring(0, 50); // Use first 50 chars as title
            currentThreadHistory.timestamp = Date.now();
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
        }
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
        threadId,
      });
      setLastResponseData({ response, obsStartIndex });
    } catch (err) {
      console.error('Error processing message:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        content: `Error: ${errorMessage}`,
        role: 'assistant',
        timestamp: new Date(),
        error: true
      }]);
      setIsLoading(false);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  };

  const startNewConversation = useCallback(async () => {
    const newThreadId = generateUUID();
    const history: ChatHistoryItem[] = safeJsonParse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]', []);
    history.unshift({ threadId: newThreadId, title: 'New Chat', timestamp: Date.now() });
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
    await switchThread(newThreadId);
    toast.success('Started a new conversation.');
  }, [switchThread]);

  const listConversations = useCallback((): ChatHistoryItem[] => {
    return safeJsonParse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]', []);
  }, []);

  const handleRetryMessage = async (messageId: string) => {
    // Find the user message that came before the failed assistant response
    const failedMessageIndex = messages.findIndex(m => m.id === messageId);
    if (failedMessageIndex === -1) return;

    const userMessageIndex = messages.slice(0, failedMessageIndex).reverse().findIndex(m => m.role === 'user');
    if (userMessageIndex === -1) return;
    
    const originalUserMessage = messages[failedMessageIndex - 1 - userMessageIndex];

    // Remove the failed message and any subsequent messages
    setMessages(prev => prev.slice(0, failedMessageIndex));

    // Resend the original user message content
    // Note: This assumes the `content` is the full message. If file contexts were separate, this needs adjustment.
    await sendMessage(originalUserMessage.content, originalUserMessage.content);
  };

  const deleteConversation = useCallback(async (threadIdToDelete: string) => {
    // Remove from our local history list
    const history: ChatHistoryItem[] = safeJsonParse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]', []);
    const updatedHistory = history.filter(h => h.threadId !== threadIdToDelete);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedHistory));

    if (threadId === threadIdToDelete) {
        // If we deleted the current chat, switch to the most recent one or start a new one
        if (updatedHistory.length > 0) {
            await switchThread(updatedHistory[0].threadId);
        } else {
            await startNewConversation();
        }
    }
    
    toast.success('Conversation deleted.');
    // Note: We don't clear the actual messages from the DB, just hide it from the list.
    // A true deletion would require a framework method.
  }, [threadId, startNewConversation, switchThread]);

  const handleClearConversation = useCallback(async () => {
    if (!threadId) return;
    await deleteConversation(threadId);
  }, [threadId, deleteConversation]);

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
    startNewConversation,
    switchThread,
    listConversations,
    threadId,
    deleteConversation,
  };
} 