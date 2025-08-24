import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { 
  createArtInstance, 
  generateUUID, 
  ArtInstance, 
  AvailableProviderEntry, 
  MessageRole, 
  ObservationType, 
  ConversationMessage,
  AuthManager
} from 'art-framework';
import { ArtMessage, ArtObservation, ArtWebChatConfig, ChatHistoryItem } from '../lib/types';
import { mapObservationToFinding, parseArtResponse, safeJsonParse } from '@/lib/utils.tsx';
import { loadProviderKey } from '../lib/credentials';
import { supabase } from '../supabaseClient';

const CHAT_HISTORY_KEY = 'art_chat_history';
const CURRENT_THREAD_ID_KEY = 'art_current_thread_id';

export function useArtChat(props: ArtWebChatConfig) {
 const { artConfig, defaultModel, onMessage, onError } = props;
 const [isInitialized, setIsInitialized] = useState(false);
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [isAuthenticated, setIsAuthenticated] = useState(false);
 const [messages, setMessages] = useState<ArtMessage[]>([]);
 const [observations, setObservations] = useState<ArtObservation[]>([]);
 const [availableModels, setAvailableModels] = useState<AvailableProviderEntry[]>([]);
 const [selectedModel, setSelectedModel] = useState<string>(defaultModel || '');
 const [lastResponseData, setLastResponseData] = useState<{ response: any; obsStartIndex: number } | null>(null);
 const [threadId, setThreadId] = useState<string | null>(null);
 const [currentThreadTitle, setCurrentThreadTitle] = useState<string>('AI Assistant Conversation');
 
 const artInstanceRef = useRef<ArtInstance | null>(null);
 const authManagerRef = useRef<AuthManager | null>(null);
 const observationSocketUnsubscribe = useRef<() => void | undefined>();

 // Track Supabase auth state
 useEffect(() => {
   let mounted = true;
   (async () => {
     const { data } = await supabase.auth.getSession();
     if (mounted) setIsAuthenticated(!!data.session);
   })();
   const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
     setIsAuthenticated(!!session);
   });
   return () => {
     mounted = false;
     sub.subscription.unsubscribe();
   };
 }, []);

 const loginWithEmailPassword = async (email: string, password: string) => {
   const { error } = await supabase.auth.signInWithPassword({ email, password });
   if (error) {
     toast.error(error.message);
     return false;
   }
   toast.success('Signed in');
   return true;
 };

 const signUpWithEmailPassword = async (email: string, password: string) => {
   const { error } = await supabase.auth.signUp({ email, password });
   if (error) {
     toast.error(error.message);
     return false;
   }
   toast.success('Sign up successful. Check your email to confirm.');
   return true;
 };

 const sendMagicLink = async (email: string) => {
   const redirectTo = (import.meta as any).env.VITE_SUPABASE_REDIRECT_URL as string | undefined;
   const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
   if (error) {
     toast.error(error.message);
     return false;
   }
   toast.success('Magic link sent. Check your email.');
   return true;
 };

 const loadHistoryForThread = useCallback(async (instance: ArtInstance, tid: string) => {
   const historicalMessages = await instance.conversationManager.getMessages(tid, { limit: 100 });
   
   if (historicalMessages && historicalMessages.length > 0) {
       const mappedMessages: ArtMessage[] = historicalMessages.map((m: ConversationMessage) => {
           if (m.role === MessageRole.USER) {
               return {
                   id: m.messageId,
                   content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
                   role: 'user',
                   timestamp: new Date(m.timestamp),
               };
           }

           const { thoughts, response } = parseArtResponse(typeof m.content === 'string' ? m.content : '');
           
           const savedMeta = m.metadata || {};
           const llmMeta = savedMeta.llmMetadata || {};

           const meta = {
               'Input Tokens': llmMeta.inputTokens,
               'Output Tokens': llmMeta.outputTokens,
               'Total Tokens': (llmMeta.inputTokens || 0) + (llmMeta.outputTokens || 0),
               'First Token MS': llmMeta.timeToFirstTokenMs,
               'Total Time MS': savedMeta.totalDurationMs,
               'Finish Reason': llmMeta.stopReason,
               'LLM Calls': savedMeta.llmCalls,
               'Tool Calls': savedMeta.toolCalls,
           };

           const finalMetadata = Object.fromEntries(Object.entries(meta).filter(([_, v]) => v !== null && v !== undefined && v !== 0 && v !== ''));

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
       const welcomeMessage: ArtMessage = {
         id: Date.now().toString(),
         content: `Hello! I'm your personal AI Assistant. How can I help you today?`,
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
   
   const history: ChatHistoryItem[] = safeJsonParse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]', []);
   const currentThreadHistory = history.find(h => h.threadId === newThreadId);
   setCurrentThreadTitle(currentThreadHistory?.title || 'New Chat');

   await loadHistoryForThread(artInstanceRef.current, newThreadId);

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

       const artInstance = await createArtInstance(artConfig);
       artInstanceRef.current = artInstance;

       // AuthManager remains for MCP/A2A PKCE flows, but user auth is via Supabase
       authManagerRef.current = artInstance.authManager || null;
       
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
       
       setIsInitialized(true);
       setError(null);

       const savedThreadId = localStorage.getItem(CURRENT_THREAD_ID_KEY);
       const initialThreadId = savedThreadId || generateUUID();
       
       if (!savedThreadId) {
           const newHistory: ChatHistoryItem[] = safeJsonParse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]', []);
           newHistory.unshift({ threadId: initialThreadId, title: 'New Chat', timestamp: Date.now() });
           localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newHistory));
       }

       // Only load history when not requiring auth or when authenticated
       if (!props.authRequired || isAuthenticated) {
         await switchThread(initialThreadId);
       } else {
         setThreadId(initialThreadId);
       }
       
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
 }, [artConfig, onError, defaultModel, switchThread, isAuthenticated, props.authRequired]);

 // After login, load current thread history if needed
 useEffect(() => {
   if (!isInitialized || !props.authRequired || !isAuthenticated || !threadId || !artInstanceRef.current) return;
   switchThread(threadId);
 }, [isAuthenticated, isInitialized, props.authRequired, threadId, switchThread]);

 useEffect(() => {
   if (!lastResponseData) return;

   const { response, obsStartIndex } = lastResponseData;
   const art = artInstanceRef.current;
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
   
   if (art && threadId) {
     const messageToSave = response.response;
     if (!messageToSave.metadata) {
       messageToSave.metadata = {};
     }
     Object.assign(messageToSave.metadata, response.metadata);

     art.conversationManager.addMessages(threadId, [messageToSave]);

     const { thoughts: messageThoughts, response: finalResponse, title: chatTitle } = parseArtResponse(responseContent);

     if (chatTitle) {
         const history: ChatHistoryItem[] = safeJsonParse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]', []);
         const currentThreadHistory = history.find(h => h.threadId === threadId);
         if (currentThreadHistory) {
             currentThreadHistory.title = chatTitle;
             currentThreadHistory.timestamp = Date.now();
             localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
             setCurrentThreadTitle(chatTitle);
         }
     }

      const assistantMessage: ArtMessage = {
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
   }

 }, [lastResponseData, observations, onMessage, threadId]);

 useEffect(() => {
   const updateThreadConfig = async () => {
     if (!isInitialized || !artInstanceRef.current || !selectedModel || !threadId) return;
     if (props.authRequired && !isAuthenticated) return;

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
       
       await stateManager.setThreadConfig(threadId, {
         providerConfig: {
           providerName: selectedModel,
           modelId: modelId,
           adapterOptions: {},
         },
         enabledTools: [],
         historyLimit: 200,
         systemPrompt: `You are a helpful AI assistant powered by the ART Framework.

Your entire output MUST strictly follow the format below, using XML-style tags. Do not include any other text, headers, or explanations outside of this structure.

<Title>
[A concise, 5-6 word title for this conversation based on the full conversation history and the latest user request.]
</Title>

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
     }
   };

   updateThreadConfig();
 }, [selectedModel, isInitialized, availableModels, threadId, props.authRequired, isAuthenticated]);

 const sendMessage = async (query: string, userMessageContent: string) => {
   if (!isInitialized || !artInstanceRef.current || isLoading || !threadId) {
     return;
   }

   if (props.authRequired && !isAuthenticated) {
     toast.error("Please log in to send a message.");
     return;
   }

   if (messages.length <= 1) {
       const history: ChatHistoryItem[] = safeJsonParse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]', []);
       const currentThreadHistory = history.find(h => h.threadId === threadId);
       if (currentThreadHistory) {
           currentThreadHistory.title = userMessageContent.substring(0, 50);
           currentThreadHistory.timestamp = Date.now();
           localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
       }
   }

   const userMessage: ArtMessage = {
     id: Date.now().toString(),
     content: userMessageContent,
     role: 'user',
     timestamp: new Date(),
   };

   setMessages(prev => [...prev, userMessage]);
   setIsLoading(true);

   const obsStartIndex = observations.length;
   try {
    // Persist the user message so it appears in history upon reload
    await artInstanceRef.current.conversationManager.addMessages(threadId, [{
      messageId: userMessage.id,
      threadId,
      role: MessageRole.USER,
      content: userMessageContent,
      timestamp: Date.now(),
      metadata: {}
    }]);

     const selectedModelEntry = availableModels.find(m => m.name === selectedModel);
     const modelId = selectedModelEntry?.baseOptions?.modelId;
     const providerName = selectedModelEntry?.baseOptions?.provider as string | undefined;
     const adapterOptions: any = {};
     if (providerName) {
       const key = await loadProviderKey(providerName);
       if (!key) {
         toast.error(`Missing API key for provider '${providerName}'. Please add it in Settings.`);
         setIsLoading(false);
         return;
       }
       adapterOptions.apiKey = key;
     }

     const response = await artInstanceRef.current.process({
       query,
       threadId,
       options: {
         providerConfig: {
           providerName: selectedModel!,
           modelId: modelId!,
           adapterOptions,
         },
       },
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
   const failedMessageIndex = messages.findIndex(m => m.id === messageId);
   if (failedMessageIndex === -1) return;

   const userMessageIndex = messages.slice(0, failedMessageIndex).reverse().findIndex(m => m.role === 'user');
   if (userMessageIndex === -1) return;
   
   const originalUserMessage = messages[failedMessageIndex - 1 - userMessageIndex];

   setMessages(prev => prev.slice(0, failedMessageIndex));

   await sendMessage(originalUserMessage.content, originalUserMessage.content);
 };

 const deleteConversation = useCallback(async (threadIdToDelete: string) => {
   const history: ChatHistoryItem[] = safeJsonParse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]', []);
   const updatedHistory = history.filter(h => h.threadId !== threadIdToDelete);
   localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedHistory));

   if (threadId === threadIdToDelete) {
       if (updatedHistory.length > 0) {
           await switchThread(updatedHistory[0].threadId);
       } else {
           await startNewConversation();
       }
   }
   
   toast.success('Conversation deleted.');
 }, [threadId, startNewConversation, switchThread]);

 const handleClearConversation = useCallback(async () => {
   if (!threadId) return;
   await deleteConversation(threadId);
 }, [threadId, deleteConversation]);

 const handleLogin = async () => {
   const provider = (import.meta as any).env.VITE_AUTH_PROVIDER as string | undefined;
   const redirectTo = (import.meta as any).env.VITE_SUPABASE_REDIRECT_URL as string | undefined;
   if (!provider || provider.toLowerCase() === 'email') {
     toast('Use the email login form.');
     return;
   }
   if (!redirectTo) {
     toast.error('Redirect URL not configured.');
     return;
   }
   const { error } = await supabase.auth.signInWithOAuth({ provider: provider as any, options: { redirectTo } });
   if (error) {
     toast.error(error.message);
   }
 };

 const handleLogout = async () => {
   const { error } = await supabase.auth.signOut();
   if (error) {
     toast.error(error.message);
   } else {
     setIsAuthenticated(false);
   }
 };

 const delegateTask = async (_task: string) => {
   // if (!artInstanceRef.current || !artInstanceRef.current.systems.a2a) {
   //   toast.error("A2A delegation is not available.");
   //   return;
   // }
   // try {
   //   const result = await artInstanceRef.current.systems.a2a.delegateTask(task);
   //   toast.success("Task delegated successfully!");
   //   console.log("Delegation result:", result);
   // } catch (err) {
   //   console.error("Delegation error:", err);
   //   toast.error(err instanceof Error ? err.message : "Failed to delegate task.");
   // }
 };

 return {
   isInitialized,
   isAuthenticated,
   handleLogin,
   handleLogout,
   loginWithEmailPassword,
   signUpWithEmailPassword,
   sendMagicLink,
   delegateTask,
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
   currentThreadTitle,
 };
}