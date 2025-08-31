import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

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
  PlusCircle
} from 'lucide-react';

// Local Types, Hooks, and Components
import { ArtWebChatConfig } from './lib/types';
import { useArtChat } from './hooks/useArtChat';
import { useFileUpload } from './hooks/useFileUpload';
import { ChatMessage } from './components/webchat/ChatMessage';
import { FindingCard } from './components/webchat/FindingCard';
import { ChatHistory } from './components/webchat/ChatHistory';
import ProviderSettings from './components/ProviderSettings';
import { Input } from './components/ui/input';
import DiscoverModal from './components/webchat/DiscoverModal';
import { ConfigManager } from 'art-framework';
import { upsertUserMcpConfiguration, mergeIntoLocalRawProtocolConfig, installRuntimeServerFromProtocolExtract, removeFromLocalRawProtocolConfig, deleteUserMcpConfiguration } from './lib/mcpConfigBridge';
// Using framework-level manager; import of package helpers not needed here
import { supabase } from './supabaseClient';

// Main ART WebChat Component
export const ArtWebChat: React.FC<ArtWebChatConfig> = (props) => {
  // Proactively preload permission manager packages to ensure the library's dynamic import resolves in dev/build
  // This mirrors the web extractor sample which imports the package in app code.
  void import(/* @vite-ignore */ 'art-mcp-permission-manager').catch(() => {});
  void import(/* @vite-ignore */ 'cors-unblock').catch(() => {});
  const [input, setInput] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);

  const {
    uploadedFiles,
    fileInputRef,
    handleFileUpload,
    handleAddDocuments,
    getFileContext,
    clearUploadedFiles,
  } = useFileUpload();
  
  const {
    isInitialized,
    isAuthenticated,
    handleLogin,
    handleLogout,
    loginWithEmailPassword,
    signUpWithEmailPassword,
    sendMagicLink,
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

  // Lightweight MCP helpers using runtime-exposed components
  const loadServers = async () => {
    try {
      // Use the same endpoint defined by user requirements
      const res = await fetch('http://localhost:3001/api/services', { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      const services = Array.isArray(data) ? data : (data.services || []);
      return services
        .filter((s: any) => s.service_type === 'MCP_SERVICE')
        .map((service: any) => {
          const tools = (service.spec?.tools || []).map((t: any) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
          // Prefer top-level install_config, else spec.installation.configurationExtract.mcpServers
          const installExtract = service.install_config || service.spec?.installation?.configurationExtract?.mcpServers || {};
          const firstKey = Object.keys(installExtract || {})[0];
          const url = firstKey ? installExtract[firstKey]?.url : undefined;
          const firstVal = firstKey ? installExtract[firstKey] : undefined;
          const oauth = firstVal?.oauth || service.connection?.oauth || service.spec?.oauth || service.spec?.installation?.oauth;
          const headers = firstVal?.headers || service.connection?.headers || service.spec?.headers;
          return {
            id: service.id,
            displayName: service.display_name || service.name,
            description: service.description,
            connection: { url, oauth, headers },
            enabled: service.registry_status !== 'inactive',
            tools,
            installExtract,
          } as any;
        });
    } catch (e) {
      console.error('Discover loadServers error', e);
      return [];
    }
  };

  const isInstalled = async (serverId: string) => {
    try {
      const cm = new ConfigManager();
      const cfg = cm.getConfig();
      const installedInApp = !!cfg.mcpServers[serverId];
      // Consider extension presence for the Installed badge to avoid confusion
      let extensionPresent = false;
      try {
        const mod: any = await import(/* @vite-ignore */ 'art-mcp-permission-manager');
        const api = mod?.default ?? mod;
        extensionPresent = !!api?.hasInstall?.();
      } catch {
        try {
          const mod: any = await import(/* @vite-ignore */ 'cors-unblock');
          const api = mod?.default ?? mod;
          extensionPresent = !!api?.hasInstall?.();
        } catch {
          extensionPresent = false;
        }
      }
      return installedInApp && extensionPresent;
    } catch {
      return false;
    }
  };

  const onUninstall = async (serverId: string) => {
    try {
      // Remove from raw protocol config (local) using the exact extract keys stored on install
      try {
        const cm = new ConfigManager();
        const cfg = cm.getConfig();
        const server = cfg.mcpServers[serverId];
        const extract = (server as any)?.installation?.configurationExtract?.mcpServers;
        if (extract && typeof extract === 'object') {
          removeFromLocalRawProtocolConfig(extract);
        }
      } catch (e) {
        console.warn('Local raw protocol cleanup skipped:', e);
      }

      // Remove from runtime config (disconnect + unregister + remove runtime entry)
      window.dispatchEvent(new CustomEvent('art-mcp-uninstall', { detail: { serverId } }));
      // Remove Supabase row for this user/service
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (userId) {
        await deleteUserMcpConfiguration({ userId, mcpServiceId: serverId });
      }
    } catch (e) {
      console.warn('Uninstall cleanup failed:', e);
    }
  };

  const onInstall = async (card: any) => {
    // 0) Fire a synchronous pre-auth event so PKCE can open a login tab within user gesture
    try {
      const oauth = card.connection?.oauth || card.oauth;
      if (oauth && oauth.type === 'pkce') {
        window.dispatchEvent(new CustomEvent('art-mcp-preauth', { detail: { card } }));
      }
    } catch {/* ignore */}

    // 1) Ensure extension present and host permission granted BEFORE mutating config/UI
    const url = (card.installExtract && Object.keys(card.installExtract || {}).length > 0)
      ? card.installExtract[Object.keys(card.installExtract)[0]]?.url
      : card.connection?.url;
    try {
      if (url) {
        // The functionality of CORSAccessManager is now handled by McpManager.
        // We can dispatch an event to trigger the same logic.
        window.dispatchEvent(new CustomEvent('art-mcp-ensure-cors', { detail: { url } }));
      }
    } catch (e) {
      const code = (e as any)?.code;
      const host = url ? new URL(url).hostname : 'the target host';
      if (code === 'CORS_EXTENSION_REQUIRED') {
        toast.error('Install the AMPM/CORS extension, then click Install again.');
      } else if (code === 'CORS_PERMISSION_REQUIRED') {
        toast('Please allow access for ' + host + ' in the extension, then click Install again.');
      } else {
        toast.error('Permission flow failed. Check the extension and try again.');
      }
      console.warn('MCP permission manager flow:', e);
      throw e; // Propagate so UI does not mark as installed
    }

    // 2) Save raw protocol extract to localStorage without altering structure
    const extract = card.installExtract || {};
    if (extract && Object.keys(extract).length > 0) {
      mergeIntoLocalRawProtocolConfig(extract);
    }

    // 3) Install minimal runtime server mapping for ART usage immediately
    installRuntimeServerFromProtocolExtract({
      serviceId: card.id,
      displayName: card.displayName,
      description: card.description,
      tools: card.tools || [],
      extract,
      oauth: card.connection?.oauth || card.oauth,
      headers: card.connection?.headers || card.headers,
    });

    // 4) Ask runtime to connect to the server, discover tools, and (if OAuth PKCE present) initiate login
    window.dispatchEvent(new CustomEvent('art-mcp-install', { detail: { card } }));

    // 5) Persist initial install extract to Supabase now (will be updated by hook after discovery)
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (userId && extract && Object.keys(extract).length > 0) {
        await upsertUserMcpConfiguration({
          userId,
          mcpServiceId: card.id,
          credentials: { mcpServers: extract },
        });
      }
    } catch (e) {
      console.warn('Supabase save skipped:', e);
    }
  };

  const onAddToChat = async (card: any, toolNames: string[]) => {
    // Ensure runtime server exists (using extract if available)
    if (card.installExtract && Object.keys(card.installExtract).length > 0) {
      installRuntimeServerFromProtocolExtract({
        serviceId: card.id,
        displayName: card.displayName,
        description: card.description,
        tools: card.tools || [],
        extract: card.installExtract,
      });
    } else {
      const cm = new ConfigManager();
      const normalized = {
        id: card.id,
        type: 'streamable-http' as const,
        enabled: card.enabled !== false,
        displayName: card.displayName || card.id,
        description: card.description,
        connection: card.connection,
        timeout: 15000,
        tools: card.tools || [],
        resources: [],
        resourceTemplates: [],
      };
      cm.setServerConfig(card.id, normalized as any);
    }
    const selected = (card.tools || []).filter((t: any) => toolNames.length === 0 || toolNames.includes(t.name));
    // Ask the hook (which holds art instance) to register and enable tools for current thread
    const cm = new ConfigManager();
    const cfg = cm.getConfig();
    const server = cfg.mcpServers[card.id];
    window.dispatchEvent(new CustomEvent('art-mcp-add-to-chat', { detail: { server, toolDefs: selected, threadId } }));
  };

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

  const isEmailFlow = (import.meta as any).env.VITE_AUTH_PROVIDER?.toLowerCase?.() === 'email';

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
          <div className="flex items-center gap-2 flex-shrink-0">
              {props.authRequired && (
                isAuthenticated ? (
                  <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
                ) : (
                  isEmailFlow ? null : <Button variant="default" size="sm" onClick={handleLogin}>Login</Button>
                )
              )}
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
          <TabsList className="grid w-full grid-cols-3 rounded-none border-b shrink-0">
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
            <TabsTrigger value="settings" className="text-xs py-2 data-[state=active]:shadow-none">
              Settings
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
                        {props.authRequired && !isAuthenticated && isEmailFlow && (
                          <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
                            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => loginWithEmailPassword(email, password)} disabled={!email || !password}>Sign In</Button>
                              <Button size="sm" variant="outline" onClick={() => signUpWithEmailPassword(email, password)} disabled={!email || !password}>Sign Up</Button>
                              <Button size="sm" variant="ghost" onClick={() => sendMagicLink(email)} disabled={!email}>Magic Link</Button>
                            </div>
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
                           <TooltipProvider key="tip-globe" delayDuration={100}>
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
                                   onClick={() => setIsDiscoverOpen(true)}
                                 >
                                   <Globe className="h-4 w-4" />
                                 </Button>
                               </TooltipTrigger>
                               <TooltipContent className="bg-black text-white"><p>Discover</p></TooltipContent>
                             </Tooltip>
                           </TooltipProvider>
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

          <TabsContent value="settings" className="flex-grow overflow-auto p-4 bg-slate-50 dark:bg-slate-900">
             <div className="max-w-2xl mx-auto">
               <ProviderSettings />
             </div>
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
      <DiscoverModal
        isOpen={isDiscoverOpen}
        onClose={() => setIsDiscoverOpen(false)}
        loadServers={loadServers}
        isInstalled={isInstalled}
        onInstall={onInstall}
        onUninstall={onUninstall}
        onAddToChat={onAddToChat}
      />
    </div>
  );
};

export default ArtWebChat;