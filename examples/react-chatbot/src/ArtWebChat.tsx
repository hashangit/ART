import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';

// UI Components
import { Avatar, AvatarFallback } from "./components/ui/avatar";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";

// Icons
import {
  MessageSquare,
  Share2,
  Paperclip,
  BrainCircuit,
  Globe,
  Clock,
  ArrowRight,
  Trash2,
  X,
  PlusCircle
} from 'lucide-react';

// Local Types, Hooks, and Components
import { ArtWebChatConfig } from './lib/types';
import { useArtChat } from './hooks/useArtChat';
import { useFileUpload } from './hooks/useFileUpload';
import { ChatMessage } from './components/webchat/ChatMessage';
import { FindingCard } from './components/webchat/FindingCard';
import { ChatHistory } from './components/webchat/ChatHistory';

// Main ART WebChat Component
export const ArtWebChat: React.FC<ArtWebChatConfig> = (props) => {
  const [input, setInput] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const {
    uploadedFiles,
    fileInputRef,
    handleFileUpload,
    handleAddDocuments,
    removeUploadedFile,
    getFileContext,
    clearUploadedFiles,
  } = useFileUpload();
  
  const {
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
    currentThreadTitle,
  } = useArtChat(props);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const fileContext = getFileContext();
    const finalInput = input.trim();

    if (!isInitialized || isLoading || (!finalInput && !fileContext)) {
      return;
    }

    const fullQuery = fileContext ? `${fileContext}\n\n${finalInput}` : finalInput;
    const displayMessageContent = finalInput || `Processing ${uploadedFiles.length} uploaded file(s)...`;
    
    sendMessage(fullQuery, displayMessageContent);
    setInput('');
    clearUploadedFiles();
  };
  
  const onClearConversation = () => {
    handleClearConversation();
    clearUploadedFiles();
  }

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
        <div className="flex h-16 items-center justify-between border-b px-4 sm:px-6 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9 bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                  <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5" />
              </Avatar>
              <div className="overflow-hidden">
                  <div className="flex items-baseline gap-2">
                      <h1 className="text-base font-semibold truncate">{props.title || 'ART WebChat'}</h1>
                      <span className="text-xs text-muted-foreground hidden sm:inline-block flex-shrink-0">{props.subtitle || 'Powered by ART Framework'}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{currentThreadTitle}</p>
              </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => startNewConversation()}>
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>New Chat</p></TooltipContent>
                  </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(true)}>
                            <Clock className="h-4 w-4" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>History</p></TooltipContent>
                  </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={onClearConversation}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Delete Current Chat</p></TooltipContent>
                  </Tooltip>
              </TooltipProvider>
              <div className="hidden sm:block">
                <Button variant="outline" size="sm"> <Share2 className="mr-2 h-4 w-4" /> Share </Button>
              </div>
              <div className="sm:hidden">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Share2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Share</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
              </div>
          </div>
        </div>
        
        <Tabs defaultValue="chat" className="flex-grow flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b shrink-0">
            <TabsTrigger value="chat" className="text-xs py-2 data-[state=active]:shadow-none">
              <MessageSquare className="mr-1 h-3.5 w-3.5" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="findings" className="text-xs py-2 data-[state=active]:shadow-none">
              <BrainCircuit className="mr-1 h-3.5 w-3.5" />
              AI's Findings
              {observations.length > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                  {observations.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="flex-grow flex flex-col overflow-hidden">
              <div className="flex-grow flex flex-col h-full bg-white dark:bg-slate-950">
                  <ScrollArea className="flex-1 p-6">
                      <div className="max-w-4xl mx-auto">
                        {messages.map((msg) => (
                          <ChatMessage 
                            key={msg.id} 
                            message={msg} 
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
                                <span className="text-sm">AI is thinking...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                  </ScrollArea>
                  <div className="border-t bg-slate-50 dark:bg-slate-900 flex-shrink-0">
                      <div className="max-w-4xl mx-auto px-4 pt-3 pb-1">
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
          
          <TabsContent value="findings" className="flex-grow overflow-hidden bg-slate-50 dark:bg-slate-900">
             <ScrollArea className="h-full p-4">
                {observations.length === 0 ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                    <BrainCircuit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No observations yet</h3>
                    <p className="text-sm">Start a conversation to see the AI's thinking process and observations</p>
                  </div>
                ) : (
                  observations.map((finding, index) => (
                      <FindingCard key={index} finding={finding} isInline={false} />
                  ))
                )}
              </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      <ChatHistory 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectConversation={switchThread}
        onDeleteConversation={deleteConversation}
        listConversations={listConversations}
        currentChatId={threadId}
      />
    </div>
  );
};

export default ArtWebChat;