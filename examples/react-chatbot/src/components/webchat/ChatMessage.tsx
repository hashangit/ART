import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { ZyntopiaMessage, ZyntopiaObservation } from '../../lib/types';
import { FindingCard } from './FindingCard';
import {
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  BarChartHorizontalBig,
} from 'lucide-react';

// Chat Message Component
export function ChatMessage({ message, onCopy, onRetry }: { 
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