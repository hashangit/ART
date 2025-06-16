import React, { useState, useRef, useEffect } from 'react';
import { createArtInstance } from 'art-framework';
import toast, { Toaster } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// UI Components
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./components/ui/avatar";
import { Button } from "./components/ui/button";
import { ScrollArea } from "./components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Textarea } from "./components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";

// Icons
import {
  MessageSquare,
  Share2,
  Paperclip,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ExternalLink,
  Target,
  ListChecks,
  Terminal,
  CheckCircle,
  XCircle,
  Combine,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Globe,
  Clock,
  ArrowRight,
  Info,
  AlertCircle,
  Book,
  Trash2,
  BarChartHorizontalBig,
  X
} from 'lucide-react';

// Import the actual ART Framework types
import { 
  ObservationType, 
  AvailableProviderEntry
} from '../../../src/types';
import { ArtInstance } from '../../../src/core/interfaces';

// Types
export interface ZyntopiaMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
  observations?: ZyntopiaObservation[];
  thoughts?: ThoughtItem[];
  reactions?: boolean;
  metadata?: Record<string, any>;
  onError?: (error: Error) => void;
}

export interface ZyntopiaObservation {
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

export interface ThoughtItem {
  id: string;
  type: 'Intent' | 'Plan' | 'Thought';
  icon: any;
  color: string;
  titleColor: string;
  content: string;
}

export interface ZyntopiaWebChatConfig {
  // Core ART Framework configuration
  artConfig: any;
  
  // UI Configuration
  title?: string;
  subtitle?: string;
  defaultModel?: string; // e.g. 'gemini/gemini-1.5-flash-latest'
  
  // Event handlers
  onMessage?: (message: ZyntopiaMessage) => void;
  onError?: (error: Error) => void;
}

// --- Helper Functions ---

// Helper to safely parse JSON content
function safeJsonParse(jsonString: any, defaultValue = null) {
    if (typeof jsonString === 'object' && jsonString !== null) {
        return jsonString;
    }
    if (typeof jsonString === 'string') {
        try {
            const jsonMatch = jsonString.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.warn("Failed to parse JSON:", error, "Original string:", jsonString);
            return defaultValue;
        }
    }
    return defaultValue;
}

// Helper to format key-value pairs nicely (used as fallback)
function formatKeyValue(data: any) {
    if (!data || typeof data !== 'object') return null;
    // Exclude 'results' key specifically for Tavily, as it gets custom rendering
    const filteredData = Object.entries(data).filter(([key]) => key !== 'results');

    if (filteredData.length === 0) return null; // Don't render if only 'results' existed

    return filteredData.map(([key, value]) => (
        <div key={key} className="flex text-xs mb-1">
            <span className="font-medium text-slate-600 dark:text-slate-400 mr-1.5 capitalize">{key}:</span>
            <span className="text-slate-800 dark:text-slate-200 break-all">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
        </div>
    ));
}

// Map ART Framework observations to display format
function mapObservationToFinding(observation: any): ZyntopiaObservation {
  const typeMapping: Record<string, { icon: any; color: string; titleColor: string }> = {
    'Intent': { icon: Target, color: 'border-blue-500', titleColor: 'text-blue-600 dark:text-blue-400' },
    'Plan': { icon: ListChecks, color: 'border-purple-500', titleColor: 'text-purple-600 dark:text-purple-400' },
    'Tool Call': { icon: Terminal, color: 'border-orange-500', titleColor: 'text-orange-600 dark:text-orange-400' },
    'Tool Execution': { icon: CheckCircle, color: 'border-green-500', titleColor: 'text-green-600 dark:text-green-400' },
    'Synthesis': { icon: Combine, color: 'border-teal-500', titleColor: 'text-teal-600 dark:text-teal-400' },
    'Thought': { icon: BrainCircuit, color: 'border-green-500', titleColor: 'text-green-600 dark:text-green-400' },
  };

  const config = typeMapping[observation.type] || { icon: Info, color: 'border-gray-500', titleColor: 'text-gray-600 dark:text-gray-400' };

  return {
    id: observation.id || Date.now().toString(),
    type: observation.type,
    title: observation.title,
    content: typeof observation.content === 'string' ? observation.content : JSON.stringify(observation.content),
    timestamp: new Date(observation.timestamp || Date.now()),
    metadata: observation.metadata,
    tool_name: observation.metadata?.tool_name,
    status: observation.metadata?.status,
    call_id: observation.metadata?.call_id,
    toolId: observation.metadata?.toolId,
    icon: config.icon,
    color: config.color,
    titleColor: config.titleColor,
  };
}

function parseArtResponse(responseText: string): { thoughts: ThoughtItem[], response: string } {
    const result: { thoughts: ThoughtItem[], response: string } = {
        thoughts: [],
        response: ''
    };

    const intentMatch = responseText.match(/<Intent>([\s\S]*?)<\/Intent>/);
    if (intentMatch && intentMatch[1].trim()) {
        result.thoughts.push({
            id: `thought_intent_${Date.now()}`, type: 'Intent', content: intentMatch[1].trim(),
            icon: Target, color: 'border-blue-500', titleColor: 'text-blue-600 dark:text-blue-400',
        });
    }

    const planMatch = responseText.match(/<Plan>([\s\S]*?)<\/Plan>/);
    if (planMatch && planMatch[1].trim()) {
        result.thoughts.push({
            id: `thought_plan_${Date.now()}`, type: 'Plan', content: planMatch[1].trim(),
            icon: ListChecks, color: 'border-purple-500', titleColor: 'text-purple-600 dark:text-purple-400',
        });
    }

    const thoughtMatches = [...responseText.matchAll(/<Thought>([\s\S]*?)<\/Thought>/g)];
    for (const thoughtMatch of thoughtMatches) {
        if (thoughtMatch[1].trim()) {
            result.thoughts.push({
                id: `thought_thought_${Date.now()}_${result.thoughts.length}`, type: 'Thought', content: thoughtMatch[1].trim(),
                icon: BrainCircuit, color: 'border-green-500', titleColor: 'text-green-600 dark:text-green-400',
            });
        }
    }

    const responseMatch = responseText.match(/<Response>([\s\S]*?)<\/Response>/);
    if (responseMatch) {
        result.response = responseMatch[1].trim();
    } else {
        // Fallback: if <Response> tag is missing, take everything after the last known tag.
        let lastIndex = 0;
        if (intentMatch) lastIndex = Math.max(lastIndex, intentMatch.index! + intentMatch[0].length);
        if (planMatch) lastIndex = Math.max(lastIndex, planMatch.index! + planMatch[0].length);
        if (thoughtMatches.length > 0) {
            const lastThought = thoughtMatches[thoughtMatches.length - 1];
            lastIndex = Math.max(lastIndex, lastThought.index! + lastThought[0].length);
        }

        const rest = responseText.substring(lastIndex).trim();
        if (rest) {
            result.response = rest;
        } else if (result.thoughts.length === 0) {
            // Final fallback: if no tags were found at all.
            result.response = responseText;
        }
    }

    return result;
}

// Finding Card Component
function FindingCard({ finding, isInline = false }: { finding: ZyntopiaObservation; isInline?: boolean }) {
  if (!finding) return null;

  const { type, icon, color, titleColor, content, tool_name, status, call_id, toolId } = finding;

  // --- Icon and Color Mapping ---
  const typeMapping: Record<string, { icon: any; color: string; titleColor: string }> = {
    'Intent': { icon: Target, color: 'border-blue-500', titleColor: 'text-blue-600 dark:text-blue-400' },
    'Plan': { icon: ListChecks, color: 'border-purple-500', titleColor: 'text-purple-600 dark:text-purple-400' },
    'Thought': { icon: BrainCircuit, color: 'border-green-500', titleColor: 'text-green-600 dark:text-green-400' },
    'Tool Call': { icon: Terminal, color: 'border-orange-500', titleColor: 'text-orange-600 dark:text-orange-400' },
    'Tool Execution': { icon: CheckCircle, color: 'border-green-500', titleColor: 'text-green-600 dark:text-green-400' },
    'Synthesis': { icon: Combine, color: 'border-teal-500', titleColor: 'text-teal-600 dark:text-teal-400' },
    'LLM_STREAM_START': { icon: ArrowRight, color: 'border-gray-400', titleColor: 'text-gray-500 dark:text-gray-400' },
    'LLM_STREAM_METADATA': { icon: BarChartHorizontalBig, color: 'border-gray-400', titleColor: 'text-gray-500 dark:text-gray-400' },
    'LLM_STREAM_END': { icon: CheckCircle, color: 'border-gray-400', titleColor: 'text-gray-500 dark:text-gray-400' },
    'FINAL_RESPONSE': { icon: MessageSquare, color: 'border-blue-500', titleColor: 'text-blue-600 dark:text-blue-400' },
    // Add default for any other types
    'default': { icon: Info, color: 'border-gray-500', titleColor: 'text-gray-600 dark:text-gray-400' },
  };
  
  const typeConfig = typeMapping[type] || typeMapping.default;
  const DisplayIcon = icon || typeConfig.icon;
  const cardColor = color || typeConfig.color;
  const cardTitleColor = titleColor || typeConfig.titleColor;

  // --- Card Rendering Logic ---

  // 1. Tool Call Card
  if (type === 'Tool Call') {
    const callData = safeJsonParse(content);
    const displayToolName = tool_name || 'Unknown Tool';
    const title = `Calling ${displayToolName}`;

    return (
      <Card className={`relative overflow-hidden ${isInline ? 'border-l-2' : 'mb-3 border-l-2'} ${cardColor} shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-800/30`}>
        <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isInline ? 'p-1.5 pl-2' : 'p-2 pl-3'}`}>
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <DisplayIcon className={`h-4 w-4 ${cardTitleColor} flex-shrink-0`} />
            <CardTitle className={`text-xs font-semibold truncate ${cardTitleColor}`}>{title}</CardTitle>
          </div>
          <div className="flex items-center flex-shrink-0">
            {toolId && <span className="text-xs text-muted-foreground mr-2">ID: {toolId}</span>}
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className={`space-y-1 ${isInline ? 'p-1.5 pt-0 pl-2' : 'p-2 pt-0 pl-3'}`}>
          {typeof callData === 'object' && callData !== null ? (
             formatKeyValue(callData)
          ) : typeof content === 'string' ? (
             <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{content}</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  // 2. Tool Execution Card
  if (type === 'Tool Execution') {
    const executionData = safeJsonParse(content);
    const displayToolName = tool_name || 'Unknown Tool';
    const isSuccess = status?.toLowerCase() === 'success';
    const isError = status?.toLowerCase() === 'error';
    const StatusIcon = isSuccess ? CheckCircle : isError ? XCircle : AlertCircle;
    const statusColorClass = isSuccess ? 'text-green-600 dark:text-green-400' : isError ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400';
    const statusBorderColor = isSuccess ? 'border-green-500' : isError ? 'border-red-500' : 'border-yellow-500';
    const isTavilySearch = displayToolName === 'Tavily Search';
    const tavilyResults = isTavilySearch && Array.isArray(executionData?.results) ? executionData.results : null;

    return (
      <Card className={`relative overflow-hidden ${isInline ? 'border-l-2' : 'mb-3 border-l-2'} ${statusBorderColor} shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-800/30`}>
        <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isInline ? 'p-1.5 pl-2' : 'p-2 pl-3'}`}>
           <div className="flex items-center gap-2 overflow-hidden mr-2">
            <DisplayIcon className={`h-4 w-4 ${cardTitleColor} flex-shrink-0`} />
            <CardTitle className={`text-xs font-semibold truncate ${cardTitleColor}`}>{displayToolName}</CardTitle>
            {status && (
                <span className={`flex items-center text-xs font-medium ${statusColorClass} flex-shrink-0 ml-1`}>
                    <StatusIcon className="h-3.5 w-3.5 mr-1" />
                    {status}
                </span>
            )}
          </div>
          <div className="flex items-center flex-shrink-0">
            {call_id && <span className="text-xs text-muted-foreground mr-2">ID: {call_id}</span>}
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className={` ${isInline ? 'p-1.5 pt-0 pl-2' : 'p-2 pt-0 pl-3'}`}>
           {isTavilySearch && tavilyResults && tavilyResults.length > 0 && (
             <div className="space-y-2 mt-1">
               {tavilyResults.map((result: any, index: number) => {
                 const SourceIcon = result.source?.toLowerCase().includes('forum') || result.source?.toLowerCase().includes('reddit') ? Book : Globe;
                 return (
                    <div key={index} className="text-xs border-t border-slate-200 dark:border-slate-700 pt-1.5">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="flex items-center font-medium text-slate-700 dark:text-slate-300">
                                <SourceIcon className="h-3.5 w-3.5 mr-1.5 text-slate-500 dark:text-slate-400"/>
                                {result.source || 'Source'}
                            </span>
                            {result.url && (
                                <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300">
                                    <ExternalLink className="h-3.5 w-3.5"/>
                                </a>
                            )}
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">{result.snippet || 'No snippet available.'}</p>
                    </div>
                 );
               })}
             </div>
           )}
           {(!isTavilySearch || !tavilyResults || tavilyResults.length === 0) && (
               <div className="mt-1">
                 {typeof executionData === 'object' && executionData !== null ? (
                     formatKeyValue(executionData)
                 ) : typeof content === 'string' ? (
                     <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{content}</p>
                 ) : (
                     <p className="text-xs text-slate-500 dark:text-slate-400 italic">No detailed execution data available.</p>
                 )}
               </div>
           )}
        </CardContent>
      </Card>
    );
  }

  // 3. Generic Card for most other types
  let displayContent = content;
  const parsedContent = safeJsonParse(content);
  
  // For types that are just simple messages inside a JSON object
  if (parsedContent && parsedContent.message) {
    displayContent = parsedContent.message;
  }
  
  // For LLM stream phases
  if (parsedContent && parsedContent.phase) {
    displayContent = `Phase: ${parsedContent.phase}`;
  }
  
  // Clean up Intent/Plan/Thought content if it's still JSON
  const relevantTypes = ['Intent', 'Plan', 'Thought', 'INTENT', 'PLAN', 'THOUGHTS'];
  if (relevantTypes.includes(type) && typeof displayContent === 'string') {
    const furtherParsed = safeJsonParse(displayContent);
    if (furtherParsed) {
      const typeLower = type.toLowerCase().replace(/s$/, ''); // intent, plan, thought
      if (furtherParsed[typeLower]) {
        displayContent = furtherParsed[typeLower];
      }
    }
  }

  // Handle FINAL_RESPONSE specifically
  if (type === 'FINAL_RESPONSE' && parsedContent) {
      if (parsedContent.message) {
          const innerMessage = safeJsonParse(parsedContent.message);
          if (innerMessage && innerMessage.content) {
              const { thoughts } = parseArtResponse(innerMessage.content);
              const responseText = innerMessage.content.split('**Response:**')[1]?.trim() || innerMessage.content;
              
              return (
                  <Card className={`relative overflow-hidden ${isInline ? 'border-l-2' : 'mb-3 border-l-2'} ${cardColor} shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-800/30`}>
                      <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isInline ? 'p-1.5 pl-2' : 'p-2 pl-3'}`}>
                          <div className="flex items-center gap-2 overflow-hidden mr-2">
                              <DisplayIcon className={`h-4 w-4 ${cardTitleColor} flex-shrink-0`} />
                              <CardTitle className={`text-xs font-semibold truncate ${cardTitleColor}`}>Final Response</CardTitle>
                          </div>
                      </CardHeader>
                      <CardContent className={isInline ? 'p-1.5 pt-0 pl-2' : 'p-2 pt-0 pl-3'}>
                          <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-2">{responseText}</p>
                          {thoughts.length > 0 && <p className="text-xs text-muted-foreground mt-1">({thoughts.length} thoughts generated)</p>}
                      </CardContent>
                  </Card>
              );
          }
      }
  }
  
  // Handle LLM_STREAM_METADATA specifically
  if (type === 'LLM_STREAM_METADATA' && parsedContent) {
      const stats = {
          "Stop Reason": parsedContent.stopReason,
          "Input Tokens": parsedContent.inputTokens,
          "Output Tokens": parsedContent.outputTokens,
          "Total Tokens": (parsedContent.inputTokens && parsedContent.outputTokens) ? (parsedContent.inputTokens + parsedContent.outputTokens) : undefined,
          "First Token MS": parsedContent.timeToFirstTokenMs,
          "Total Time MS": parsedContent.totalGenerationTimeMs,
      };
      return (
          <Card className={`relative overflow-hidden ${isInline ? 'border-l-2' : 'mb-3 border-l-2'} ${cardColor} shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-800/30`}>
              <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isInline ? 'p-1.5 pl-2' : 'p-2 pl-3'}`}>
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                      <DisplayIcon className={`h-4 w-4 ${cardTitleColor} flex-shrink-0`} />
                      <CardTitle className={`text-xs font-semibold truncate ${cardTitleColor}`}>LLM Stats</CardTitle>
                  </div>
              </CardHeader>
              <CardContent className={isInline ? 'p-1.5 pt-0 pl-2' : 'p-2 pt-0 pl-3'}>
                  {formatKeyValue(stats)}
              </CardContent>
          </Card>
      );
  }

  return (
    <Card className={`relative overflow-hidden ${isInline ? 'border-l-2' : 'mb-3 border-l-2'} ${cardColor} shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-800/30`}>
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isInline ? 'p-1.5 pl-2' : 'p-2 pl-3'}`}>
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <DisplayIcon className={`h-4 w-4 ${cardTitleColor} flex-shrink-0`} />
          <CardTitle className={`text-xs font-semibold truncate ${cardTitleColor}`}>{type || 'Info'}</CardTitle>
        </div>
        <div className="flex items-center flex-shrink-0">
          {toolId && <span className="text-xs text-muted-foreground mr-2">ID: {toolId}</span>}
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700">
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={isInline ? 'p-1.5 pt-0 pl-2' : 'p-2 pt-0 pl-3'}>
        {typeof displayContent === 'string' ? (
           <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{displayContent}</p>
        ) : (
           <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{JSON.stringify(displayContent)}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Chat Message Component
function ChatMessage({ message, onCopy, onRetry }: { 
  message: ZyntopiaMessage; 
  onCopy?: (content: string) => void;
  onRetry?: (messageId: string) => void;
}) {
  const isUser = message.role === 'user';
  const isAI = message.role === 'assistant';
  const [isThoughtsOpen, setIsThoughtsOpen] = useState(false);
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);

  const allowedThoughtTypes = ['Intent', 'Plan', 'Thought'];
  const inlineThoughts = (message.thoughts ?? []).filter(t => allowedThoughtTypes.includes(t.type));

  console.log('ChatMessage - Message thoughts:', message.thoughts);
  console.log('ChatMessage - Inline thoughts:', inlineThoughts);

  const intentThought = inlineThoughts.find(t => t.type === 'Intent');
  const planThought = inlineThoughts.find(t => t.type === 'Plan');
  const otherThoughts = inlineThoughts.filter(t => t.type === 'Thought');

  console.log('ChatMessage - Intent:', intentThought);
  console.log('ChatMessage - Plan:', planThought);
  console.log('ChatMessage - Other thoughts:', otherThoughts);

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
                 <span>{isThoughtsOpen ? 'Hide' : 'Show'} Zee's Thoughts</span>
                 {isThoughtsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
               </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-in slide-in-from-top-2 duration-300 mt-2">
              <div className="space-y-2">
                {intentThought && <FindingCard key={`inline-${intentThought.id}`} finding={{
                  ...intentThought,
                  timestamp: new Date(),
                  type: intentThought.type
                } as ZyntopiaObservation} isInline={true} />}
                {planThought && <FindingCard key={`inline-${planThought.id}`} finding={{
                  ...planThought,
                  timestamp: new Date(),
                  type: planThought.type
                } as ZyntopiaObservation} isInline={true} />}
                {otherThoughts.length > 0 && (
                    otherThoughts.length > 1 ? (
                         <ScrollArea className="max-h-32 mt-2 pr-2">
                             <div className="space-y-2">
                                 {otherThoughts.map((thought) => (
                                     <FindingCard key={`inline-${thought.id}`} finding={{
                                       ...thought,
                                       timestamp: new Date(),
                                       type: thought.type
                                     } as ZyntopiaObservation} isInline={true} />
                                 ))}
                             </div>
                         </ScrollArea>
                    ) : (
                         <FindingCard key={`inline-${otherThoughts[0].id}`} finding={{
                           ...otherThoughts[0],
                           timestamp: new Date(),
                           type: otherThoughts[0].type
                         } as ZyntopiaObservation} isInline={true} />
                    )
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Main Message Text */}
        <div className="text-sm whitespace-pre-wrap markdown-container">
           <ReactMarkdown remarkPlugins={[remarkGfm]}>
             {message.content}
           </ReactMarkdown>
        </div>

        {/* Reactions and Metadata */}
        {message.reactions && isAI && (
          <>
            <div className="mt-2 flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full" onClick={() => onCopy?.(message.content)}><Copy className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent><p>Copy</p></TooltipContent></Tooltip></TooltipProvider>
                <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><ThumbsUp className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent><p>Like</p></TooltipContent></Tooltip></TooltipProvider>
                <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><ThumbsDown className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent><p>Dislike</p></TooltipContent></Tooltip></TooltipProvider>
                <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full" onClick={() => onRetry?.(message.id)}><RefreshCw className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent><p>Regenerate</p></TooltipContent></Tooltip></TooltipProvider>
                {message.metadata && (
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full" onClick={() => setIsMetadataOpen(!isMetadataOpen)}><BarChartHorizontalBig className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent><p>Stats</p></TooltipContent></Tooltip></TooltipProvider>
                )}
            </div>
            {message.metadata && (
                <Collapsible open={isMetadataOpen} onOpenChange={setIsMetadataOpen}>
                    <CollapsibleContent className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 p-2 rounded-md">
                       {Object.entries(message.metadata).map(([key, value]) => (
                           <div key={key} className="flex justify-between">
                               <span className="font-medium">{key}:</span>
                               <span>{value}</span>
                           </div>
                       ))}
                    </CollapsibleContent>
                </Collapsible>
            )}
          </>
        )}
      </div>
      {isUser && (
         <Avatar className="h-8 w-8 border flex-shrink-0 mt-1">
           <AvatarImage src="https://placehold.co/40x40/7c3aed/ffffff?text=H" alt="User" /><AvatarFallback>U</AvatarFallback>
         </Avatar>
      )}
    </div>
  );
}

// Custom interface for our file state
interface UploadedFileState {
  file: File;
  content: string | null; // Will hold text content, or null for non-text files
}

// Main Zyntopia WebChat Component
export const ZyntopiaWebChat: React.FC<ZyntopiaWebChatConfig> = ({
  artConfig,
  title = 'Zyntopia WebChat',
  subtitle = 'Powered by ART Framework',
  defaultModel,
  onMessage,
  onError,
}) => {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ZyntopiaMessage[]>([]);
  const [observations, setObservations] = useState<ZyntopiaObservation[]>([]);
  const [input, setInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileState[]>([]);
  const [availableModels, setAvailableModels] = useState<AvailableProviderEntry[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel || '');
  
  // Refs
  const artInstanceRef = useRef<ArtInstance | null>(null);
  const threadId = useRef<string>(`thread_${Date.now()}_${Math.random().toString(36).substring(2)}`);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize ART Framework
  useEffect(() => {
    const initializeART = async () => {
      try {
        setIsLoading(true);
        
        // Fetch available models directly from the passed-in config
        if (artConfig?.providers?.availableProviders) {
            const models = artConfig.providers.availableProviders;
            setAvailableModels(models);
            if (models.length > 0) {
              const defaultModelExists = models.some((m: AvailableProviderEntry) => m.name === defaultModel);
              const initialModel = defaultModelExists ? defaultModel : models[0].name;
              setSelectedModel(initialModel!);
              console.log('Initial model set to:', initialModel);
            }
        } else {
            console.warn('No available providers configured in artConfig.');
        }

        const artInstance = await createArtInstance(artConfig);
        artInstanceRef.current = artInstance;
        
        setIsInitialized(true);
        setError(null);

        // Add welcome message
        const welcomeMessage: ZyntopiaMessage = {
          id: Date.now().toString(),
          content: `Hello! I'm your personal AI Assistant Zee`,
          role: 'assistant',
          timestamp: new Date(),
          reactions: true,
          thoughts: [
            { 
              id: 'test_intent_1', 
              type: 'Intent', 
              icon: Target, 
              color: 'border-blue-500', 
              titleColor: 'text-blue-600 dark:text-blue-400', 
              content: 'Welcome the user and establish my identity as Zee.' 
            },
            { 
              id: 'test_plan_1', 
              type: 'Plan', 
              icon: ListChecks, 
              color: 'border-purple-500', 
              titleColor: 'text-purple-600 dark:text-purple-400', 
              content: '1. Greet the user warmly\n2. Establish my capabilities\n3. Wait for user input' 
            },
            { 
              id: 'test_thought_1', 
              type: 'Thought', 
              icon: BrainCircuit, 
              color: 'border-green-500', 
              titleColor: 'text-green-600 dark:text-green-400', 
              content: 'This is the first interaction - I should be friendly and helpful.' 
            }
          ],
        };
        setMessages([welcomeMessage]);
        
        toast.success('ART Framework initialized successfully!');

        // Set up observation listener
        const observationSocket = artInstance.uiSystem.getObservationSocket();
        if (observationSocket) {
          const unsubscribe = observationSocket.subscribe(
            (observation: any) => {
              console.log('Received observation:', observation);
              const mappedObservation = mapObservationToFinding(observation);
              setObservations(prev => {
                const newObservations = [...prev, mappedObservation];
                console.log('Total observations:', newObservations.length);
                return newObservations;
              });
            },
            // Subscribe to specific observation types including thoughts
            [ObservationType.INTENT, ObservationType.PLAN, ObservationType.THOUGHTS, ObservationType.TOOL_CALL, ObservationType.TOOL_EXECUTION, ObservationType.SYNTHESIS],
            { 
              threadId: threadId.current
            }
          );
          
          return () => {
            unsubscribe();
          };
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

  // Effect to update thread config when selected model changes
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
        
        // This is a temporary way to get the API key.
        // In a real app, this should be handled securely.
        const apiKey = provider === 'gemini' ? import.meta.env.VITE_GEMINI_API_KEY : 
                       provider === 'openai' ? import.meta.env.VITE_OPENAI_API_KEY : 
                       'your-api-key';

        console.log(`Updating thread config for provider: ${selectedModelEntry.name}, model: ${modelId}`);
        
        await stateManager.setThreadConfig(threadId.current, {
          providerConfig: {
            providerName: selectedModelEntry.name, // Use the unique name from the config
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

  // Handle sending messages
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const fileContext = uploadedFiles
      .filter(f => f.content !== null)
      .map(f => `--- Start of File: ${f.file.name} ---\n${f.content}\n--- End of File: ${f.file.name} ---`)
      .join('\n\n');
      
    const finalInput = input.trim();

    if (!isInitialized || !artInstanceRef.current || isLoading || (!finalInput && !fileContext)) {
      return;
    }

    const fullQuery = fileContext ? `${fileContext}\n\n${finalInput}` : finalInput;

    const displayMessageContent = finalInput || `Processing ${uploadedFiles.length} uploaded file(s)...`;

    const userMessage: ZyntopiaMessage = {
      id: Date.now().toString(),
      content: displayMessageContent,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setUploadedFiles([]); // Clear files from state after including them in the message
    setIsLoading(true);

    try {
      const response = await artInstanceRef.current.process({
        query: fullQuery,
        threadId: threadId.current,
        options: {
          // Timeouts are configured on the provider or MCP level, not here.
        },
      });

      // Extract the response content properly from AgentFinalResponse
      let responseContent = '';
      const responseMessage = response.response; // This is a ConversationMessage

      if (responseMessage && typeof responseMessage.content === 'string') {
        responseContent = responseMessage.content;
      } else if (responseMessage) {
        // Handle non-string content if necessary (e.g., for complex tool results)
        // For now, we'll stringify it as a fallback.
        responseContent = JSON.stringify(responseMessage.content);
      } else {
        responseContent = 'I apologize, but I encountered an issue processing your request.';
      }
      
      console.log('ART Response:', response);
      console.log('Extracted content:', responseContent);

      const { thoughts: messageThoughts, response: finalResponse } = parseArtResponse(responseContent);

      // --- Aggregate LLM Metadata ---
      const intermediateSteps = (response as any).intermediateSteps || [];
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let timeToFirstTokenMs: number | undefined;
      let lastStopReason: string | undefined;

      if (intermediateSteps.length > 0) {
        intermediateSteps.forEach((step: any) => {
          const llmMeta = step.observation?.metadata?.llmMetadata;
          if (llmMeta) {
            totalInputTokens += llmMeta.inputTokens || 0;
            totalOutputTokens += llmMeta.outputTokens || 0;
            if (timeToFirstTokenMs === undefined && llmMeta.timeToFirstTokenMs) {
              timeToFirstTokenMs = llmMeta.timeToFirstTokenMs;
            }
            if (llmMeta.stopReason) {
              lastStopReason = llmMeta.stopReason;
            }
          }
        });
      }
      
      // Add the final LLM call's metadata if it exists
      if (response.metadata.llmMetadata) {
        const finalMeta = response.metadata.llmMetadata;
        // This check prevents double-counting if the final call is also in intermediateSteps
        if (!intermediateSteps.some((step:any) => step.observation?.metadata?.llmMetadata === finalMeta)) {
            totalInputTokens += finalMeta.inputTokens || 0;
            totalOutputTokens += finalMeta.outputTokens || 0;
            if (timeToFirstTokenMs === undefined && finalMeta.timeToFirstTokenMs) {
                timeToFirstTokenMs = finalMeta.timeToFirstTokenMs;
            }
            if (finalMeta.stopReason) {
                lastStopReason = finalMeta.stopReason;
            }
        }
      }

      const meta: Record<string, any> = {
          'Input Tokens': totalInputTokens || undefined,
          'Output Tokens': totalOutputTokens || undefined,
          'Total Tokens': (totalInputTokens + totalOutputTokens) || undefined,
          'First Token MS': timeToFirstTokenMs,
          'Total Time MS': response.metadata.totalDurationMs,
          'Finish Reason': lastStopReason || response.metadata.llmMetadata?.stopReason || 'stop',
          'LLM Calls': response.metadata.llmCalls,
          'Tool Calls': response.metadata.toolCalls,
      };

      const finalMetadata = Object.fromEntries(Object.entries(meta).filter(([_, v]) => v !== null && v !== undefined));

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
    } finally {
      setIsLoading(false);
    }
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

  // Conversation management
  const handleClearConversation = () => {
    setMessages([]);
    setObservations([]);
    setUploadedFiles([]);
    toast.success('Conversation cleared');
  };

  // File upload handling
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      // Check file size (max 10MB per file)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return false;
      }
      
      // Check file type - more flexible approach
      const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/json', 'text/html', 'application/x-yaml', 'text/xml', 'text/javascript', 'text/typescript', 'application/x-python-code'];
      const allowedExtensions = ['.txt', '.md', '.markdown', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.json', '.html', '.yaml', '.yml', '.xml', '.tsx', '.ts', '.jsx', '.js', '.py', '.rb', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.php', '.sh', '.zsh', '.ps1', '.doc', '.docx', '.odt', '.rtf'];
      
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
      
      if (!isValidType) {
        toast.error(`File "${file.name}" with type "${file.type}" and extension "${fileExtension}" is not supported. Allowed: ${allowedExtensions.join(', ')}`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      const fileReadPromises = validFiles.map(async (file): Promise<UploadedFileState> => {
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        const isTextFile = ![".jpg", ".jpeg", ".png", ".gif", ".pdf"].includes(fileExtension);

        if (isTextFile) {
          try {
            const text = await file.text();
            return { file, content: text };
          } catch (readError) {
            console.error(`Could not read file ${file.name}:`, readError);
            toast.error(`Could not read file ${file.name}`);
            return { file, content: null };
          }
        }
        return { file, content: null }; // For non-text or failed-to-read files
      });

      try {
        const newFilesWithContent = await Promise.all(fileReadPromises);
        setUploadedFiles(prev => [...prev, ...newFilesWithContent]);
        toast.success(`Successfully processed ${validFiles.length} file(s)`);
      } catch (error) {
        console.error('Error processing uploaded files:', error);
        toast.error('Error processing some files');
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddDocuments = () => {
    fileInputRef.current?.click();
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    toast.success('File removed');
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
    <div className="flex h-screen w-screen overflow-hidden text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-950">
      <Toaster position="top-right" />
      
      <div className="flex flex-1 flex-col bg-white dark:bg-slate-950 h-full overflow-hidden">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 bg-blue-600 text-white flex items-center justify-center">
                  <BrainCircuit className="h-5 w-5" />
              </Avatar>
              <div>
                  <div className="flex items-baseline gap-2">
                      <h1 className="text-base font-semibold">{title}</h1>
                      <span className="text-xs text-muted-foreground">{subtitle}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">AI Assistant Conversation</p>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Active now</span>
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={handleClearConversation}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Clear</p></TooltipContent>
                  </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon"><Clock className="h-4 w-4" /></Button>
                      </TooltipTrigger>
                      <TooltipContent><p>History</p></TooltipContent>
                  </Tooltip>
              </TooltipProvider>
              <Button variant="outline" size="sm"> <Share2 className="mr-2 h-4 w-4" /> Share </Button>
          </div>
        </div>
        
        {/* Tabs for Chat and Findings */}
        <Tabs defaultValue="chat" className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b shrink-0">
            <TabsTrigger value="chat" className="text-xs py-2 data-[state=active]:shadow-none">
              <MessageSquare className="mr-1 h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="findings" className="text-xs py-2 data-[state=active]:shadow-none">
              <BrainCircuit className="mr-1 h-3.5 w-3.5" />
              Zee's Findings
              {observations.length > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                  {observations.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* CHAT TAB PANEL */}
          <TabsContent value="chat" className="flex-grow flex flex-col overflow-hidden">
              <div className="flex-grow flex flex-col h-full bg-white dark:bg-slate-950">
                  <ScrollArea className="flex-1 p-6">
                      <div className="max-w-4xl mx-auto">
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
                                <BrainCircuit className="h-4 w-4 animate-pulse" />
                                <span className="text-sm">Zee is thinking...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                  </ScrollArea>
                  <div className="border-t bg-slate-50 dark:bg-slate-900 flex-shrink-0">
                      <div className="max-w-4xl mx-auto px-4 pt-3 pb-1">
                        {/* Uploaded files display */}
                        {uploadedFiles.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {uploadedFiles.map(({ file }, index) => (
                              <div key={index} className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">
                                <Paperclip className="h-3 w-3" />
                                <span className="truncate max-w-32">{file.name}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 p-0 hover:bg-blue-200 dark:hover:bg-blue-800"
                                  onClick={() => removeUploadedFile(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        <form onSubmit={handleSendMessage} className="relative mb-2">
                           <div className="relative">
                              <Textarea
                                  placeholder="Type your message....."
                                  value={input}
                                  onChange={(e) => setInput(e.target.value)}
                                  className="min-h-[50px] max-h-[150px] resize-none w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 pl-4 pr-14 text-sm focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0 shadow-sm"
                                  rows={1}
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          handleSendMessage();
                                      }
                                  }}
                              />
                              <Button
                                  type="submit"
                                  size="icon"
                                  className="absolute bottom-1.5 right-2 h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:bg-slate-300 dark:disabled:bg-slate-700"
                                  disabled={!input.trim() || isLoading}
                                  aria-label="Send message"
                              >
                                  <ArrowRight className="h-5 w-5" />
                              </Button>
                           </div>
                        </form>
                        <div className="flex items-center gap-2 mb-2">
                           {/* Hidden file input */}
                           <input
                             ref={fileInputRef}
                             type="file"
                             multiple
                             accept=".txt,.md,.pdf,.jpg,.jpeg,.png,.gif,.json,.html,.yaml,.yml,.xml,.tsx,.ts,.jsx,.js,.py,.rb,.java,.c,.cpp,.h,.hpp,.cs,.go,.php,.sh,.zsh,.ps1,.doc,.docx,.odt,.rtf"
                             onChange={handleFileUpload}
                             className="hidden"
                           />
                           <TooltipProvider key="tip-paperclip" delayDuration={100}> 
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                                   onClick={handleAddDocuments}
                                 > 
                                   <Paperclip className="h-4 w-4" /> 
                                 </Button>
                               </TooltipTrigger>
                               <TooltipContent className="bg-black text-white">
                                 <p>Add Documents</p>
                               </TooltipContent>
                             </Tooltip> 
                           </TooltipProvider>
                           <TooltipProvider key="tip-globe" delayDuration={100}> <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"> <Globe className="h-4 w-4" /> </Button></TooltipTrigger><TooltipContent className="bg-black text-white"><p>Discover</p></TooltipContent></Tooltip> </TooltipProvider>
                           <div className="flex-grow"></div>
                           <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Model:</span>
                              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={!isInitialized || availableModels.length === 0}>
                                <SelectTrigger className="w-auto h-8 text-xs focus:ring-0 focus:ring-offset-0 rounded-full border-none bg-slate-200 dark:bg-slate-700 px-3">
                                  <SelectValue placeholder="Select Model" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableModels.map(model => (
                                    <SelectItem key={model.name} value={model.name!}>
                                      {model.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                           </div>
                        </div>
                      </div>
                  </div>
              </div>
          </TabsContent>
          
          {/* FINDINGS TAB PANEL */}
          <TabsContent value="findings" className="flex-grow overflow-hidden bg-slate-50 dark:bg-slate-900">
             <ScrollArea className="h-full p-4">
                {observations.length === 0 ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                    <BrainCircuit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No observations yet</h3>
                    <p className="text-sm">Start a conversation to see Zee's thinking process and observations</p>
                  </div>
                ) : (
                  observations.map(finding => (
                      <FindingCard key={finding.id} finding={finding} isInline={false} />
                  ))
                )}
              </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ZyntopiaWebChat; 