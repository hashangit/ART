import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArtObservation } from '@/lib/types';
import { safeJsonParse, formatKeyValue, parseArtResponse } from '@/lib/utils.tsx';
import {
  Copy,
  Target,
  ListChecks,
  Terminal,
  CheckCircle,
  Combine,
  BrainCircuit,
  Info,
  ArrowRight,
  BarChartHorizontalBig,
  MessageSquare,
  AlertCircle,
 XCircle,
} from 'lucide-react';

// Finding Card Component
export function FindingCard({ finding, isInline = false }: { finding: ArtObservation; isInline?: boolean }) {
  if (!finding) return null;

  const { type, content } = finding;

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
  const DisplayIcon = typeConfig.icon;
  const cardColor = typeConfig.color;
  const cardTitleColor = typeConfig.titleColor;

  // --- Card Rendering Logic ---
  const parsedContent = safeJsonParse(content);
  let displayContent: any = content;

  if (type === 'Tool Call') {
    const callData = safeJsonParse(content);
    const displayToolName = callData?.tool_name || 'Unknown Tool';
    const title = `Calling ${displayToolName}`;
    displayContent = (typeof callData === 'object' && callData !== null) ? formatKeyValue(callData) : content;
    return (
      <Card className={`relative overflow-hidden ${isInline ? 'border-l-2' : 'mb-3 border-l-2'} ${cardColor} shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-800/30`}>
        <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isInline ? 'p-1.5 pl-2' : 'p-2 pl-3'}`}>
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <DisplayIcon className={`h-4 w-4 ${cardTitleColor} flex-shrink-0`} />
            <CardTitle className={`text-xs font-semibold truncate ${cardTitleColor}`}>{title}</CardTitle>
          </div>
          <div className="flex items-center flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className={`space-y-1 ${isInline ? 'p-1.5 pt-0 pl-2' : 'p-2 pt-0 pl-3'}`}>
          {displayContent}
        </CardContent>
      </Card>
    );
  }

  if (type === 'Tool Execution') {
    const executionData = safeJsonParse(content);
    const displayToolName = executionData?.tool_name || 'Unknown Tool';
    const isSuccess = executionData?.status?.toLowerCase() === 'success';
    const isError = executionData?.status?.toLowerCase() === 'error';
    const StatusIcon = isSuccess ? CheckCircle : isError ? XCircle : AlertCircle;
    const statusColorClass = isSuccess ? 'text-green-600 dark:text-green-400' : isError ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400';
    const statusBorderColor = isSuccess ? 'border-green-500' : isError ? 'border-red-500' : 'border-yellow-500';
    
    displayContent = (typeof executionData === 'object' && executionData !== null) ? formatKeyValue(executionData) : content;

    return (
      <Card className={`relative overflow-hidden ${isInline ? 'border-l-2' : 'mb-3 border-l-2'} ${statusBorderColor} shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-800/30`}>
        <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isInline ? 'p-1.5 pl-2' : 'p-2 pl-3'}`}>
           <div className="flex items-center gap-2 overflow-hidden mr-2">
            <DisplayIcon className={`h-4 w-4 ${cardTitleColor} flex-shrink-0`} />
            <CardTitle className={`text-xs font-semibold truncate ${cardTitleColor}`}>{displayToolName}</CardTitle>
            {executionData?.status && (
                <span className={`flex items-center text-xs font-medium ${statusColorClass} flex-shrink-0 ml-1`}>
                    <StatusIcon className="h-3.5 w-3.5 mr-1" />
                    {executionData.status}
                </span>
            )}
          </div>
          <div className="flex items-center flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className={` ${isInline ? 'p-1.5 pt-0 pl-2' : 'p-2 pt-0 pl-3'}`}>
           {displayContent}
        </CardContent>
      </Card>
    );
  }

  if (parsedContent && parsedContent.message) {
    displayContent = parsedContent.message;
  }
  
  if (parsedContent && parsedContent.phase) {
    displayContent = `Phase: ${parsedContent.phase}`;
  }
  
  const relevantTypes = ['Intent', 'Plan', 'Thought', 'INTENT', 'PLAN', 'THOUGHTS'];
  if (relevantTypes.includes(type) && typeof displayContent === 'string') {
    const furtherParsed = safeJsonParse(displayContent);
    if (furtherParsed) {
      const typeLower = type.toLowerCase().replace(/s$/, '');
      if (furtherParsed[typeLower]) {
        displayContent = furtherParsed[typeLower];
      }
    }
  }

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