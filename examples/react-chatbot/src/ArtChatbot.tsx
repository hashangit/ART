import React, { useState, useRef, useEffect } from 'react';
import { createArtInstance } from 'art-framework';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Loader2, Copy, FileText, Paperclip, X, ThumbsUp, ThumbsDown, RefreshCw, 
  Target, ListChecks, BrainCircuit, Terminal, CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronUp, ArrowRight, Info, ExternalLink
} from 'lucide-react';

// UI Components
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { ScrollArea } from './components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Textarea } from './components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './components/ui/collapsible';

// Types
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
  observations?: ArtObservation[];
  attachments?: FileAttachment[];
  isEdited?: boolean;
  originalContent?: string;
  thoughts?: ThoughtItem[];
  reactions?: boolean;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  data?: string;
}

export interface ThoughtItem {
  id: string;
  type: 'Intent' | 'Plan' | 'Thought';
  icon: any;
  color: string;
  titleColor: string;
  content: string;
}

// Import the actual ART Framework types
import { ObservationType } from '../../../src/types';

export interface ArtObservation {
  id: string;
  type: ObservationType | string;
  title?: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  tool_name?: string;
  status?: string;
  call_id?: string;
  toolId?: string;
  icon?: any;
  color?: string;
  titleColor?: string;
}

export interface ArtChatbotConfig {
  // Core ART Framework configuration
  artConfig: any;
  
  // UI Configuration
  title?: string;
  placeholder?: string;
  theme?: 'light' | 'dark' | 'auto';
  
  // Features
  features?: {
    observations?: boolean;
    settings?: boolean;
  };
  
  // Layout
  height?: string;
  width?: string;
  
  // Event handlers
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

// Helper functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// URL detection and rendering
const urlRegex = /(https?:\/\/[^\s]+)/g;
function renderTextWithLinks(text: string) {
  if (typeof text !== 'string') return text ?? '';
  return text.split(urlRegex).map((part, index) => {
    if (part.match(urlRegex)) {
      let url = part;
      let punctuation = '';
      const trailingChars = ['.', ',', '!', '?', ':', ';'];
      if (trailingChars.includes(url.slice(-1))) {
        punctuation = url.slice(-1);
        url = url.slice(0, -1);
      }
      return (
        <React.Fragment key={`link-${index}`}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 break-all"
          >
            {url}
          </a>
          {punctuation}
        </React.Fragment>
      );
    }
    return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
  });
}



// Finding Card Component (for observations panel)
function FindingCard({ finding }: { finding: ArtObservation }) {
  if (!finding) return null;

  const { type, content, tool_name, status, call_id, toolId } = finding;

  // Determine Icon and colors based on type to match screenshot
  const getTypeConfig = (type: string, status?: string) => {
    
    if (type === 'Tool Execution') {
        const isSuccess = status?.toLowerCase() === 'success';
        const isError = status?.toLowerCase() === 'error';
        const toolTheme = isSuccess ? 'green' : isError ? 'red' : 'yellow';

        const themes: any = {
          green: { icon: CheckCircle, color: 'green' },
          red: { icon: XCircle, color: 'red' },
          yellow: { icon: AlertCircle, color: 'yellow' },
        };

        return {
          icon: themes[toolTheme].icon,
          borderColor: `border-${themes[toolTheme].color}-200 dark:border-${themes[toolTheme].color}-700`,
          bgColor: `bg-${themes[toolTheme].color}-50 dark:bg-${themes[toolTheme].color}-950/50`,
          headerBg: `bg-${themes[toolTheme].color}-100 dark:bg-${themes[toolTheme].color}-900/50`,
          textColor: `text-${themes[toolTheme].color}-900 dark:text-${themes[toolTheme].color}-100`,
          iconColor: `text-${themes[toolTheme].color}-600 dark:text-${themes[toolTheme].color}-400`
        };
    }
    
    const typeMapping: any = {
      'Intent': { icon: Target, color: 'blue' },
      'Plan': { icon: ListChecks, color: 'purple' },
      'Tool Call': { icon: Terminal, color: 'orange' },
      'Synthesis': { icon: BrainCircuit, color: 'cyan' },
    };

    const theme = typeMapping[type] || { icon: Info, color: 'slate' };

    return {
        icon: theme.icon,
        borderColor: `border-${theme.color}-200 dark:border-${theme.color}-700`,
        bgColor: `bg-${theme.color}-50 dark:bg-${theme.color}-950/50`,
        headerBg: `bg-${theme.color}-100 dark:bg-${theme.color}-900/50`,
        textColor: `text-${theme.color}-900 dark:text-${theme.color}-100`,
        iconColor: `text-${theme.color}-600 dark:text-${theme.color}-400`
    };
  };

  const config = getTypeConfig(type, status);
  const displayTitle = type === 'Tool Call' ? `Calling ${tool_name}` : 
                      type === 'Tool Execution' ? tool_name : 
                      type;
                      
  const renderContent = (content: any) => {
    if (Array.isArray(content) && content.every(item => typeof item === 'object' && item !== null && 'source' in item && 'content' in item)) {
      return (
        <ul className="space-y-3">
          {content.map((item, index) => (
            <li key={index}>
              <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-500 transition-colors"
              >
                <div className="flex-shrink-0">
                  <ExternalLink className="h-3.5 w-3.5" />
                </div>
                <div className="font-medium text-sm">{item.source}</div>
              </a>
              <p className={`mt-1 pl-[22px] text-sm ${config.textColor}`}>{item.content}</p>
            </li>
          ))}
        </ul>
      );
    }

    if (typeof content === 'string') {
        return <div className="whitespace-pre-wrap text-sm">{renderTextWithLinks(content)}</div>;
    }
    
    return <pre className="text-xs bg-slate-100 dark:bg-slate-900/50 p-2 rounded-md whitespace-pre-wrap"><code>{JSON.stringify(content, null, 2)}</code></pre>;
  };

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden mb-3 shadow-sm`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${config.headerBg} px-4 py-2 border-b ${config.borderColor}`}>
        <div className="flex items-center gap-3">
          <config.icon className={`h-4 w-4 ${config.iconColor}`} />
          <span className={`font-medium text-sm ${config.textColor}`}>
            {displayTitle}
          </span>
          {status && type === 'Tool Execution' && (
            <span className={`text-xs font-semibold ${config.textColor} ${status === 'Success' ? 'bg-green-200 dark:bg-green-800/50' : 'bg-red-200 dark:bg-red-800/50'} px-2 py-0.5 rounded-full`}>
              {status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(toolId || call_id) && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              ID: {toolId || call_id}
            </span>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 p-0 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
            onClick={() => {
              const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
              navigator.clipboard.writeText(contentStr);
              toast.success('Copied to clipboard');
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {renderContent(content)}
      </div>
    </div>
  );
}

// Chat Message Component
function ChatMessage({ message, onCopy, onRetry }: { 
  message: ChatMessage; 
  onCopy?: (content: string) => void;
  onRetry?: (messageId: string) => void;
}) {
  const isUser = message.role === 'user';
  const [isThoughtsOpen, setIsThoughtsOpen] = useState(false);

  const allowedThoughtTypes = ['Intent', 'Plan', 'Thought'];
  const inlineThoughts = (message.thoughts ?? []).filter(t => allowedThoughtTypes.includes(t.type));

  return (
    <div className={`flex gap-3 my-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <Avatar className="h-8 w-8 border flex-shrink-0 mt-1">
          <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">AI</AvatarFallback>
        </Avatar>
      )}
      <div className={`rounded-lg p-3 max-w-xl shadow-sm ${isUser ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50'}`}>
        
        {/* Collapsible Thoughts Section */}
        {inlineThoughts.length > 0 && (
          <Collapsible open={isThoughtsOpen} onOpenChange={setIsThoughtsOpen} className="mb-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-blue-500 dark:text-blue-400 p-0 h-auto hover:bg-transparent flex items-center gap-1">
                <BrainCircuit className="h-3 w-3" />
                <span>{isThoughtsOpen ? 'Hide' : 'Show'} AI's Thoughts</span>
                {isThoughtsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-in slide-in-from-top-2 duration-300 mt-2">
              <div className="space-y-2">
                {inlineThoughts.map((thought) => (
                  <div key={thought.id} className="text-xs p-2 bg-green-50 dark:bg-green-900/20 rounded border-l-2 border-green-500">
                    <div className="flex items-center gap-1 mb-1">
                      <BrainCircuit className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-green-600 dark:text-green-400">{thought.type}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{thought.content}</p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Main Message Text with Markdown */}
        <div className="text-sm whitespace-pre-wrap">
          <ReactMarkdown
            components={{
              code({ className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;
                return isInline ? (
                  <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-xs" {...props}>
                    {children}
                  </code>
                ) : (
                  <SyntaxHighlighter
                    style={oneDark as any}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-md text-xs"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                );
              },
              a({ href, children }: any) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {children}
                  </a>
                );
              },
            }}
          >
            {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
          </ReactMarkdown>
        </div>

        {/* File Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
                <FileText className="h-3 w-3" />
                <span className="truncate">{attachment.name}</span>
                <span className="text-muted-foreground">({formatFileSize(attachment.size)})</span>
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && !isUser && (
          <div className="mt-2 flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
                    onClick={() => onCopy?.(message.content)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Copy</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Good response</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Poor response</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
                    onClick={() => onRetry?.(message.id)}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Regenerate</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 border flex-shrink-0 mt-1">
          <AvatarImage src="https://placehold.co/40x40/7c3aed/ffffff?text=U" alt="User" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

// Main ART Chatbot Component
export const ArtChatbot: React.FC<ArtChatbotConfig> = ({
  artConfig,
  height = '100vh',
  width = '100%',
  onMessage,
  onError,
}) => {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [observations, setObservations] = useState<ArtObservation[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  
  // Refs
  const artInstanceRef = useRef<any>(null);
  const threadId = useRef<string>(`thread_${Date.now()}_${Math.random().toString(36).substring(2)}`);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize ART Framework
  useEffect(() => {
    const initializeART = async () => {
      try {
        setIsLoading(true);
        
        const artInstance = await createArtInstance(artConfig);
        artInstanceRef.current = artInstance;
        setIsInitialized(true);
        setError(null);
        
        // Initialize thread configuration
        const stateManager = artInstance.stateManager;
        if (stateManager) {
          await stateManager.setThreadConfig(threadId.current, {
            providerConfig: {
              providerName: 'gemini',
              modelId: 'gemini-2.5-flash-preview-05-20',
              adapterOptions: {
                apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'your-gemini-api-key',
              },
            },
            enabledTools: [],
            historyLimit: 10,
            systemPrompt: 'You are a helpful AI assistant powered by the ART Framework. Provide clear, concise, and helpful responses.',
          });
        }

        // Add welcome message
        const welcomeMessage: ChatMessage = {
          id: Date.now().toString(),
          content: `Hello! I'm your AI assistant powered by the ART Framework. I can help you with various tasks, answer questions, and provide insights. How can I assist you today?`,
          role: 'assistant',
          timestamp: new Date(),
          reactions: true,
        };
        setMessages([welcomeMessage]);
        
        toast.success('ART Framework initialized successfully!');

        // Set up observation listener
        const observationSocket = artInstance.uiSystem.getObservationSocket();
        if (observationSocket) {
          const unsubscribe = observationSocket.subscribe(
            (observation: any) => {
              const artObservation: ArtObservation = {
                id: observation.id || Date.now().toString(),
                type: observation.type,
                title: observation.title,
                content: typeof observation.content === 'string' ? observation.content : JSON.stringify(observation.content),
                timestamp: new Date(observation.timestamp || Date.now()),
                metadata: observation.metadata,
              };
              setObservations(prev => [...prev, artObservation]);
            },
            undefined,
            { threadId: threadId.current }
          );
          
          return () => {
            unsubscribe();
          };
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
  }, [artConfig, onError]);

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!isInitialized || !artInstanceRef.current || isLoading || !input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await artInstanceRef.current.process({
        query: userMessage.content,
        threadId: threadId.current,
      });

      // Extract the response content properly
      let responseContent = '';
      if (typeof response === 'string') {
        responseContent = response;
      } else if (response && typeof response === 'object') {
        responseContent = response.response || response.content || response.message || JSON.stringify(response);
      } else {
        responseContent = 'I apologize, but I encountered an issue processing your request.';
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        role: 'assistant',
        timestamp: new Date(),
        reactions: true,
      };

      setMessages(prev => [...prev, assistantMessage]);
      onMessage?.(assistantMessage);

    } catch (err) {
      console.error('Error processing message:', err);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        reactions: true,
      };
      setMessages(prev => [...prev, errorMessage]);
      onError?.(err instanceof Error ? err : new Error('Processing failed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // File handling
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  // Message actions
  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Message copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const handleRetryMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;
    
    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;
    
    // Remove the failed assistant message and retry
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    setInput(userMessage.content);
    setTimeout(() => handleSendMessage(), 100);
  };

  // File processing
  const processFileAttachment = async (file: File): Promise<FileAttachment> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          id: Date.now().toString() + Math.random().toString(36).substring(2),
          name: file.name,
          size: file.size,
          type: file.type,
          data: reader.result as string,
        });
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Conversation management
  const handleClearConversation = () => {
    setMessages([]);
    setObservations([]);
    toast.success('Conversation cleared');
  };

  const handleExportConversation = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      threadId: threadId.current,
      messages: messages,
      observations: observations,
      metadata: {
        artFrameworkVersion: '1.0.0',
        exportedBy: 'ART Framework React Chatbot'
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `art-conversation-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Conversation exported');
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 dark:bg-red-900/20">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg overflow-hidden" style={{ height, width }}>
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 flex-shrink-0 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-900 dark:text-slate-100">AI Assistant</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Powered by ART Framework</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">{messages.length} messages</span>
          <Button variant="outline" size="sm" onClick={handleExportConversation}>
            <Copy className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearConversation}>
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="chat" className="flex flex-col flex-1 h-full">
        <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-slate-200 dark:border-slate-800 bg-transparent h-12">
          <TabsTrigger 
            value="chat" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none h-full"
          >
            <BrainCircuit className="mr-2 h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger 
            value="observations" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none h-full"
          >
            <Terminal className="mr-2 h-4 w-4" />
            Observations
            {observations.length > 0 && (
              <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                {observations.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex flex-col flex-1 h-full m-0 p-0">
          {/* Chat Messages Area */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {messages.map((msg) => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg} 
                  onCopy={handleCopyMessage}
                  onRetry={handleRetryMessage}
                />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 border flex-shrink-0 mt-1">
                    <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">AI</AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg p-3 max-w-xl shadow-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area - Natural Bottom Position */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex-shrink-0">
            <div className="p-4"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const files = Array.from(e.dataTransfer.files);
                for (const file of files) {
                  try {
                    const attachment = await processFileAttachment(file);
                    setAttachments(prev => [...prev, attachment]);
                    toast.success(`File "${file.name}" attached`);
                  } catch (error) {
                    toast.error(`Failed to attach "${file.name}"`);
                  }
                }
              }}
            >
              
              {/* File Attachments Display */}
              {attachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-3 py-1.5 rounded-full text-sm">
                      <FileText className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{attachment.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full"
                        onClick={() => handleRemoveAttachment(attachment.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Text Input Form */}
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative">
                <div className="relative">
                  <Textarea
                    placeholder="Type your message here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="min-h-[60px] max-h-[150px] resize-none w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-4 pl-4 pr-16 text-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 shadow-sm"
                    rows={2}
                    onKeyDown={handleKeyPress}
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                      onClick={handleFileSelect}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      type="submit"
                      size="icon"
                      className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:bg-slate-300 dark:disabled:bg-slate-700"
                      disabled={!input.trim() || isLoading}
                      aria-label="Send message"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </form>

              {/* Model Selection */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Model:</span>
                  <Select defaultValue="gemini">
                    <SelectTrigger className="w-auto h-7 text-xs focus:ring-0 focus:ring-offset-0 rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">Gemini 2.5 Flash</SelectItem>
                      <SelectItem value="gpt4">GPT-4</SelectItem>
                      <SelectItem value="claude3">Claude 3 Opus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  Press Enter to send
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Observations Tab */}
        <TabsContent value="observations" className="flex flex-col flex-1 h-full m-0 p-0">
          <ScrollArea className="flex-1 p-6">
            {observations.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No observations yet</h3>
                <p className="text-sm">Start a conversation to see the AI's thinking process and observations</p>
              </div>
                         ) : (
               <div className="space-y-4">
                 {[...observations].reverse().map(observation => (
                   <FindingCard key={observation.id} finding={observation} />
                 ))}
               </div>
             )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          for (const file of files) {
            try {
              const attachment = await processFileAttachment(file);
              setAttachments(prev => [...prev, attachment]);
              toast.success(`File "${file.name}" attached`);
            } catch (error) {
              toast.error(`Failed to attach "${file.name}"`);
            }
          }
          // Reset the input
          if (e.target) {
            e.target.value = '';
          }
        }}
      />
    </div>
  );
};

export default ArtChatbot; 