New UI from Gemini
```
import React, { useState } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"; // Assuming shadcn setup
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Ensure you have installed react-resizable-panels: npm install react-resizable-panels
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

// Ensure lucide-react is installed: npm install lucide-react
import {
  Search,
  Plus,
  Home,
  Store,
  Bot,
  Cpu,
  Wrench,
  FileText,
  Users,
  MessageSquare,
  Share2,
  Paperclip,
  Settings,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ClipboardList,
  Pencil,
  ExternalLink, // Used for links in search results
  Target,
  ListChecks,
  Terminal, // Keep for generic tool call icon
  CheckCircle, // For success status
  XCircle, // For error status (Example)
  Combine,
  BrainCircuit, // Used for Thoughts trigger and ZOI Findings tab
  PenTool,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  PanelLeftClose,
  PanelRightClose,
  Globe, // Generic web source icon
  ListFilter,
  FlaskConical,
  BarChartBig,
  Presentation,
  CircleUserRound,
  Clock,
  ArrowRight,
  GripVertical,
  Coffee, // Added for Support button
  Calculator, // Specific tool icon
  FileSearch, // Specific tool icon (e.g., for Tavily)
  Info, // Generic icon
  AlertCircle, // For warnings or errors
  Book // Icon for forum/docs source
} from 'lucide-react';

// --- Helper Functions ---

// Basic URL detection and rendering
const urlRegex = /(https?:\/\/[^\s]+)/g;
function renderTextWithLinks(text) {
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

// Helper to safely parse JSON content
function safeJsonParse(jsonString, defaultValue = null) {
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
function formatKeyValue(data) {
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

// --- Mock Data ---
const topics = [ { id: 't1', name: "ZenBook", icon: MessageSquare, children: [ { id: 't1c1', name: "Zenbook S 16 Laggy Gesture" }, { id: 't1c2', name: "CPU Updates Discussion" } ] }, { id: 't2', name: "Hackern Film server", icon: MessageSquare, children: [ { id: 't2c1', name: "Raspberry Pi Setup" }, ] }, { id: 't3', name: "React Components", icon: MessageSquare, children: [] }, { id: 't4', name: "Next.js 18", icon: MessageSquare, children: [ { id: 't4c1', name: "Donem Issue" }, { id: 't4c2', name: "Routing changes" }, { id: 't4c3', name: "Server Actions", children: [ { id: 't4c3s1', name: "Basic Usage"}, { id: 't4c3s2', name: "Error Handling"} ]} ] }, ];

const messages = [
    { id: 1, sender: 'ai', text: "Hello! I'm your personal AI Assistant ZOI" },
    { id: 2, sender: 'user', text: "Zenbook 1 window swapping gesture is very laggy can you see if others have experienced the same issue? Also, what is 4 * 6?" },
    {
        id: 3,
        sender: 'ai',
        text: "Okay, I've looked into the Zenbook gesture issue and performed the calculation.\n\nRegarding the Zenbook S 16 lag, some users reported similar issues related to graphics drivers, specifically version XYZ. Updating to the latest driver or rolling back might help. Check the ASUS support site for driver updates specific to your model.\n\nThe result of 4 * 6 is 24.",
        thoughts: [
            { type: 'Intent', icon: Target, color: 'border-blue-500', titleColor: 'text-blue-600 dark:text-blue-400', content: 'Analyze user query about Zenbook lag and perform calculation.', id: 'thought_intent_1' },
            { type: 'Plan', icon: ListChecks, color: 'border-purple-500', titleColor: 'text-purple-600 dark:text-purple-400', content: '1. Search internal KB for Zenbook issue.\n2. Search public forums.\n3. Use Calculator tool for 4 * 6.\n4. Synthesize findings.', id: 'thought_plan_1' },
            { type: 'Thought', icon: BrainCircuit, color: 'border-green-500', titleColor: 'text-green-600 dark:text-green-400', content: 'Initial search indicates potential driver conflicts for Zenbook.', id: 'thought_1' },
            { type: 'Thought', icon: BrainCircuit, color: 'border-green-500', titleColor: 'text-green-600 dark:text-green-400', content: 'Found multiple confirmations related to driver version XYZ.', id: 'thought_2' },
            { type: 'Thought', icon: BrainCircuit, color: 'border-green-500', titleColor: 'text-green-600 dark:text-green-400', content: 'Preparing summary for the user including calculation result.', id: 'thought_3' }
        ],
        reactions: true
    },
];

// Findings for the Zoi's Findings Panel (Includes Tool details)
const findingsData = [
    { type: 'Intent', icon: Target, color: 'border-blue-500', titleColor: 'text-blue-600 dark:text-blue-400', content: 'Analyze user query about Zenbook lag and perform calculation.', id: 'obs_1' },
    { type: 'Plan', icon: ListChecks, color: 'border-purple-500', titleColor: 'text-purple-600 dark:text-purple-400', content: '1. Search internal KB for Zenbook issue.\n2. Search public forums.\n3. Use Calculator tool for 4 * 6.\n4. Synthesize findings.', id: 'obs_2' },
    // Tool Call Example 1: Calculator
    {
        type: 'Tool Call',
        icon: Calculator,
        color: 'border-orange-500',
        titleColor: 'text-orange-600 dark:text-orange-400',
        tool_name: 'Calculator',
        content: { expression: "4 * 6" },
        toolId: 'call_calc_1',
        id: 'obs_3'
    },
    // Tool Execution Example 1: Calculator Success
    {
        type: 'Tool Execution',
        icon: Calculator,
        color: 'border-green-500',
        titleColor: 'text-green-600 dark:text-green-400',
        tool_name: 'Calculator',
        status: 'Success',
        call_id: 'call_calc_1',
        content: { result: 24 },
        id: 'obs_4'
    },
     // Tool Call Example 2: Tavily Search
    {
        type: 'Tool Call',
        icon: FileSearch,
        color: 'border-orange-500',
        titleColor: 'text-orange-600 dark:text-orange-400',
        tool_name: 'Tavily Search',
        content: {
            query: "Zenbook S 16 laggy window switching gesture",
            max_results: 3
        },
        toolId: 'call_search_1',
        id: 'obs_5'
    },
    // Tool Execution Example 2: Tavily Search Success (Updated with URLs)
    {
        type: 'Tool Execution',
        icon: FileSearch,
        color: 'border-green-500',
        titleColor: 'text-green-600 dark:text-green-400',
        tool_name: 'Tavily Search',
        status: 'Success',
        call_id: 'call_search_1',
        content: {
            results: [
                { source: "Reddit - r/ASUS", url: "https://www.reddit.com/r/ASUS/comments/...", snippet: "Users reporting lag, suggest checking Intel Graphics Command Center settings or rolling back drivers..." },
                { source: "ASUS ZenTalk Forum", url: "https://zentalk.asus.com/en/discussion/...", snippet: "Official mod mentioned driver update v31.0.101.xxxx addresses gesture lag for S16 models. Link provided." },
                { source: "TechReviewSite", url: "https://www.techreviewsite.example/reviews/...", snippet: "Our long-term test of the Zenbook S 16 noted occasional trackpad gesture lag, possibly linked to background processes." },
            ]
        },
        id: 'obs_6'
    },
    // Tool Call Example 3: Some Tool (Error Scenario)
    {
        type: 'Tool Call',
        icon: Wrench,
        color: 'border-orange-500',
        titleColor: 'text-orange-600 dark:text-orange-400',
        tool_name: 'Internal KB',
        content: { search_term: "Zenbook S16", filter: "gestures" },
        toolId: 'call_kb_1',
        id: 'obs_7'
    },
    // Tool Execution Example 3: Error Scenario
    {
        type: 'Tool Execution',
        icon: Wrench,
        color: 'border-red-500',
        titleColor: 'text-red-600 dark:text-red-400',
        tool_name: 'Internal KB',
        status: 'Error',
        call_id: 'call_kb_1',
        content: { error_message: "Connection timeout to KB service." },
        id: 'obs_8'
    },
    { type: 'Synthesis', icon: Combine, color: 'border-teal-500', titleColor: 'text-teal-600 dark:text-teal-400', content: 'Synthesized information: Zenbook lag potentially driver related (check vXYZ), calculation result is 24.', id: 'obs_9' },
];


// --- Components ---

// Left Sidebar Navigation Item
function NavItem({ icon: Icon, label, isActive, isCollapsed }) {
  const content = (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className={`w-full justify-start text-sm font-normal ${isCollapsed ? 'px-2' : ''}`}
    >
      <Icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
      <span className={`${isCollapsed ? 'sr-only' : 'truncate'}`}>{label}</span>
    </Button>
  );

  return isCollapsed ? (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="bg-black text-white"><p>{label}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    content
  );
}

// Topic Item for Hierarchical List
function TopicItem({ topic, level = 0, activeTopicId, setActiveTopicId, isCollapsed }) {
  const [isOpen, setIsOpen] = useState(level < 1);
  const hasChildren = (topic?.children?.length ?? 0) > 0;
  const isActive = topic.id === activeTopicId;

  if (isCollapsed) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className={`flex items-center w-full pl-${level * 4}`}>
        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center mr-1">
          {hasChildren && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
        <Button
          variant={isActive ? "secondary" : "ghost"}
          className="flex-grow justify-start text-left text-sm font-normal h-auto py-1.5 px-2"
          onClick={() => setActiveTopicId(topic.id)}
        >
          {topic.icon && level === 0 && <topic.icon className="mr-2 h-4 w-4 flex-shrink-0" />}
          <span className="truncate">{topic.name}</span>
        </Button>
      </div>
      {hasChildren && (
        <CollapsibleContent className="w-full">
          <div className="space-y-1 mt-1 pl-1">
            {(topic.children ?? []).map((child) => (
              <TopicItem
                key={child.id}
                topic={child}
                level={level + 1}
                activeTopicId={activeTopicId}
                setActiveTopicId={setActiveTopicId}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}


// Left Sidebar
function LeftSidebar({ isCollapsed, setIsCollapsed }) {
  const [activeTopicId, setActiveTopicId] = useState('t1c1');

  return (
    <div className={`flex h-screen flex-col border-r bg-slate-50 dark:bg-slate-900 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 flex-shrink-0 ${isCollapsed ? 'justify-center' : ''}`}>
        {!isCollapsed && <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Zyntopia</h1>}
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className={isCollapsed ? 'mx-auto' : ''}>
          {isCollapsed ? <PanelRightClose className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>
      </div>

      {/* Search & New */}
      <div className={`flex items-center gap-2 p-2 flex-shrink-0 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className={`relative ${isCollapsed ? 'hidden' : 'flex-grow'}`}>
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search" className="pl-8" />
        </div>
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className={isCollapsed ? 'mx-auto' : ''}><Plus className="h-4 w-4" /></Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-black text-white"> New Chat </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-4 flex-shrink-0 space-y-1">
        <NavItem icon={Home} label="Home" isActive={true} isCollapsed={isCollapsed} />
        <NavItem icon={Store} label="Marketplace" isCollapsed={isCollapsed} />
        <NavItem icon={Bot} label="Agents" isCollapsed={isCollapsed} />
        <NavItem icon={Cpu} label="Models" isCollapsed={isCollapsed} />
        <NavItem icon={Wrench} label="Skills" isCollapsed={isCollapsed} />
        <NavItem icon={FileText} label="Documents" isCollapsed={isCollapsed} />
        <NavItem icon={Users} label="Personas" isCollapsed={isCollapsed} />
      </nav>

      {/* Topics */}
      <div className={`flex-grow flex flex-col min-h-0 px-2 pb-2 ${isCollapsed ? 'hidden' : ''}`}>
        <h2 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground flex-shrink-0">Topics</h2>
        <ScrollArea className="flex-grow pr-1">
          <div className="space-y-1">
            {topics.map((topic) => (
               <TopicItem
                    key={topic.id}
                    topic={topic}
                    activeTopicId={activeTopicId}
                    setActiveTopicId={setActiveTopicId}
                    isCollapsed={isCollapsed}
                />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className={`mt-auto border-t p-4 flex-shrink-0 ${isCollapsed ? 'flex flex-col items-center space-y-4' : ''}`}>
        {!isCollapsed && (
           <Button className="w-full justify-center text-sm font-medium bg-yellow-400 hover:bg-yellow-500 text-yellow-900 dark:bg-yellow-500 dark:hover:bg-yellow-600 dark:text-yellow-950 shadow-sm">
             <Coffee className="mr-2 h-4 w-4" />
             Support Zyntopia
           </Button>
        )}
        <div className={`flex items-center justify-between ${isCollapsed ? 'flex-col gap-2' : 'mt-4 w-full'}`}>
          <div className={`flex items-center gap-2 overflow-hidden ${isCollapsed ? 'flex-col' : ''}`}>
            <Avatar className="h-8 w-8"><AvatarImage src="https://placehold.co/40x40/7c3aed/ffffff?text=H" alt="@hashan" /><AvatarFallback>H</AvatarFallback></Avatar>
            <div className={`truncate ${isCollapsed ? 'hidden' : ''}`}>
              <p className="text-sm font-medium truncate">Hashan</p>
              <p className="text-xs text-muted-foreground truncate">hashanwickram.</p>
            </div>
          </div>
           <TooltipProvider delayDuration={0}>
               <Tooltip>
                   <TooltipTrigger asChild>
                       <Button variant="ghost" size="icon" className={isCollapsed ? 'mx-auto' : ''}><Settings className="h-5 w-5 text-muted-foreground" /></Button>
                   </TooltipTrigger>
                   <TooltipContent side="right" className="bg-black text-white"> Settings </TooltipContent>
               </Tooltip>
           </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

// Chat Message Component
function ChatMessage({ message }) {
  const isUser = message.sender === 'user';
  const isAI = message.sender === 'ai';
  const [isThoughtsOpen, setIsThoughtsOpen] = useState(false);

  const allowedThoughtTypes = ['Intent', 'Plan', 'Thought'];
  const inlineThoughts = (message.thoughts ?? []).filter(t => allowedThoughtTypes.includes(t.type));

  const intentThought = inlineThoughts.find(t => t.type === 'Intent');
  const planThought = inlineThoughts.find(t => t.type === 'Plan');
  const otherThoughts = inlineThoughts.filter(t => t.type === 'Thought');

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
                 <span>{isThoughtsOpen ? 'Hide' : 'Show'} Zoi's Thoughts</span>
                 {isThoughtsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
               </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-in slide-in-from-top-2 duration-300 mt-2">
              <div className="space-y-2">
                {intentThought && <FindingCard key={`inline-${intentThought.id}`} finding={intentThought} isInline={true} />}
                {planThought && <FindingCard key={`inline-${planThought.id}`} finding={planThought} isInline={true} />}
                {otherThoughts.length > 0 && (
                    otherThoughts.length > 1 ? (
                         <ScrollArea className="max-h-32 mt-2 pr-2">
                             <div className="space-y-2">
                                 {otherThoughts.map((thought) => (
                                     <FindingCard key={`inline-${thought.id}`} finding={thought} isInline={true} />
                                 ))}
                             </div>
                         </ScrollArea>
                    ) : (
                         <FindingCard key={`inline-${otherThoughts[0].id}`} finding={otherThoughts[0]} isInline={true} />
                    )
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Main Message Text */}
        <p className="text-sm whitespace-pre-wrap">
          {renderTextWithLinks(message.text)}
        </p>

        {/* Reactions */}
        {message.reactions && isAI && (
          <div className="mt-2 flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Button key="react-copy" variant="ghost" size="icon" className="h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><Copy className="h-3 w-3" /></Button>
            <Button key="react-thumbup" variant="ghost" size="icon" className="h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><ThumbsUp className="h-3 w-3" /></Button>
            <Button key="react-thumbdown" variant="ghost" size="icon" className="h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><ThumbsDown className="h-3 w-3" /></Button>
            <Button key="react-refresh" variant="ghost" size="icon" className="h-6 w-6 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><RefreshCw className="h-3 w-3" /></Button>
          </div>
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

// Dock Component for Input Actions
function ActionDock() {
    const actions = [
        { icon: MessageSquare, label: 'Chat with Zoi' },
        { icon: Search, label: 'Web Search' },
        { icon: FlaskConical, label: 'Deep Research' },
        { icon: BarChartBig, label: 'Data Analysis with Cindy' },
        { icon: Presentation, label: 'Whiteboard' },
        { icon: CircleUserRound, label: 'Talk to Personas' },
        { type: 'separator' },
        { icon: Clock, label: 'Recent-Chat-1' },
        { icon: Clock, label: 'Recent-Chat' },
    ];

    return (
        <div className="flex justify-center py-2">
            <div className="flex items-center gap-1 p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-full shadow-md border border-blue-200 dark:border-blue-800">
                {actions.map((action, index) =>
                    action.type === 'separator' ? (
                        <Separator key={`sep-${index}`} orientation="vertical" className="h-6 bg-blue-300 dark:bg-blue-700 mx-1" />
                    ) : (
                        <TooltipProvider key={`action-${index}`} delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-blue-700 dark:text-blue-300 rounded-full w-8 h-8 transition-transform duration-150 ease-in-out hover:scale-110 hover:bg-blue-200 dark:hover:bg-blue-800"
                                        aria-label={action.label}
                                    >
                                        <action.icon className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-black text-white">
                                    <p>{action.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )
                )}
            </div>
        </div>
    );
}

// Main Content Area
function MainContent() {
  const [message, setMessage] = useState('');
  const handleSendMessage = (e) => { e?.preventDefault(); if (!message.trim()) return; console.log("Sending:", message); setMessage(''); };

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-slate-950 h-full overflow-hidden">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-6 flex-shrink-0">
        <div className="text-sm text-muted-foreground"><span className="font-medium text-primary">ZenBook</span> / Zenbook S 16 Laggy Gesture</div>
        <div className="flex items-center gap-4"><span className="text-xs text-muted-foreground">22 hours ago</span><Button variant="outline" size="sm"> <Share2 className="mr-2 h-4 w-4" /> Share </Button></div>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </div>
      </ScrollArea>

      {/* Input Area & Dock Container */}
      <div className="border-t bg-slate-50 dark:bg-slate-900 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 pt-3 pb-1">
          {/* Text Input Form */}
          <form onSubmit={handleSendMessage} className="relative mb-2">
             <div className="relative">
                <Textarea
                    placeholder="Type your message....."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
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
                    disabled={!message.trim()}
                    aria-label="Send message"
                >
                    <ArrowRight className="h-5 w-5" />
                </Button>
             </div>
          </form>
          {/* Row for Icons & Selectors */}
          <div className="flex items-center gap-2 mb-2">
             {/* Icons */}
             <TooltipProvider key="tip-paperclip" delayDuration={100}> <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"> <Paperclip className="h-4 w-4" /> </Button></TooltipTrigger><TooltipContent className="bg-black text-white"><p>Attach File</p></TooltipContent></Tooltip> </TooltipProvider>
             <TooltipProvider key="tip-globe" delayDuration={100}> <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"> <Globe className="h-4 w-4" /> </Button></TooltipTrigger><TooltipContent className="bg-black text-white"><p>Web Search</p></TooltipContent></Tooltip> </TooltipProvider>
             <TooltipProvider key="tip-filter" delayDuration={100}> <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"> <ListFilter className="h-4 w-4" /> </Button></TooltipTrigger><TooltipContent className="bg-black text-white"><p>Filter/Settings</p></TooltipContent></Tooltip> </TooltipProvider>
             {/* Spacer */}
             <div className="flex-grow"></div>
             {/* Selectors */}
             <Select defaultValue="deepseek"><SelectTrigger className="w-auto h-8 text-xs focus:ring-0 focus:ring-offset-0 rounded-full border-none bg-slate-200 dark:bg-slate-700 px-3"><SelectValue placeholder="Select Model" /></SelectTrigger><SelectContent><SelectItem value="deepseek">DeepSeek-R1-8B-201...</SelectItem><SelectItem value="gpt4">GPT-4</SelectItem><SelectItem value="claude3">Claude 3 Opus</SelectItem></SelectContent></Select>
             <Select><SelectTrigger className="w-auto h-8 text-xs focus:ring-0 focus:ring-offset-0 rounded-full border-none bg-slate-200 dark:bg-slate-700 px-3"><SelectValue placeholder="Select Agents" /></SelectTrigger><SelectContent><SelectItem value="agent1">Agent 1</SelectItem><SelectItem value="agent2">Agent 2</SelectItem></SelectContent></Select>
          </div>
        </div>
        {/* Action Dock */}
        <ActionDock />
      </div>
    </div>
  );
}

// Finding Card Component (Updated with specific Tavily rendering)
function FindingCard({ finding, isInline = false }) {
  if (!finding) return null;

  const { type, icon, color, titleColor, content, tool_name, status, call_id, toolId } = finding;

  // Determine Icon
  const DefaultIcon = type === 'Intent' ? Target :
                      type === 'Plan' ? ListChecks :
                      type === 'Thought' ? BrainCircuit :
                      type === 'Synthesis' ? Combine :
                      type === 'Tool Call' ? Terminal :
                      type === 'Tool Execution' ? CheckCircle : // Default success
                      Info;
  const DisplayIcon = icon || DefaultIcon;
  const cardColor = color || 'border-gray-500';
  const cardTitleColor = titleColor || 'text-gray-700 dark:text-gray-300';

  // --- Card Rendering Logic ---

  // 1. Tool Call Card
  if (type === 'Tool Call') {
    const callData = safeJsonParse(content);
    const displayToolName = tool_name || 'Unknown Tool';
    const title = `Calling ${displayToolName}`;

    return (
      <Card className={`relative overflow-hidden ${isInline ? 'border-l-2' : 'mb-3 border-l-2'} ${cardColor} shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-800/30`}>
        <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isInline ? 'p-1.5 pl-2' : 'p-2 pl-3'}`}>
          <div className="flex items-center gap-2 overflow-hidden mr-2"> {/* Added overflow-hidden and margin */}
            <DisplayIcon className={`h-4 w-4 ${cardTitleColor} flex-shrink-0`} />
            <CardTitle className={`text-xs font-semibold truncate ${cardTitleColor}`}>{title}</CardTitle> {/* Added truncate */}
          </div>
          <div className="flex items-center flex-shrink-0"> {/* Container for ID and button */}
            {toolId && <span className="text-xs text-muted-foreground mr-2">ID: {toolId}</span>}
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className={`space-y-1 ${isInline ? 'p-1.5 pt-0 pl-2' : 'p-2 pt-0 pl-3'}`}>
          {typeof callData === 'object' && callData !== null ? (
             formatKeyValue(callData) // Use helper for non-specific display
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
    const statusIcon = isSuccess ? CheckCircle : isError ? XCircle : AlertCircle;
    const statusColorClass = isSuccess ? 'text-green-600 dark:text-green-400' : isError ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400';
    const statusBorderColor = isSuccess ? 'border-green-500' : isError ? 'border-red-500' : 'border-yellow-500';

    // Specific rendering for Tavily Search results
    const isTavilySearch = displayToolName === 'Tavily Search';
    const tavilyResults = isTavilySearch && Array.isArray(executionData?.results) ? executionData.results : null;

    return (
      <Card className={`relative overflow-hidden ${isInline ? 'border-l-2' : 'mb-3 border-l-2'} ${statusBorderColor} shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-800/30`}>
        <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isInline ? 'p-1.5 pl-2' : 'p-2 pl-3'}`}>
           <div className="flex items-center gap-2 overflow-hidden mr-2"> {/* Added overflow-hidden and margin */}
            <DisplayIcon className={`h-4 w-4 ${cardTitleColor} flex-shrink-0`} />
            <CardTitle className={`text-xs font-semibold truncate ${cardTitleColor}`}>{displayToolName}</CardTitle> {/* Added truncate */}
            {status && (
                <span className={`flex items-center text-xs font-medium ${statusColorClass} flex-shrink-0 ml-1`}> {/* Added flex-shrink-0 */}
                    <statusIcon className="h-3.5 w-3.5 mr-1" />
                    {status}
                </span>
            )}
          </div>
          <div className="flex items-center flex-shrink-0"> {/* Container for ID and button */}
            {call_id && <span className="text-xs text-muted-foreground mr-2">ID: {call_id}</span>}
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className={` ${isInline ? 'p-1.5 pt-0 pl-2' : 'p-2 pt-0 pl-3'}`}>
           {/* --- Tavily Search Specific Rendering --- */}
           {isTavilySearch && tavilyResults && tavilyResults.length > 0 && (
             <div className="space-y-2 mt-1">
               {tavilyResults.map((result, index) => {
                 // Simple check for source type icon
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

           {/* --- Fallback/Generic Rendering for other tools or non-array Tavily results --- */}
           {(!isTavilySearch || !tavilyResults || tavilyResults.length === 0) && (
               <div className="mt-1"> {/* Add margin top for consistency */}
                 {typeof executionData === 'object' && executionData !== null ? (
                     formatKeyValue(executionData) // Use helper, which now excludes 'results' key
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

  // 3. Generic Card (Intent, Plan, Thought, Synthesis, etc.)
  return (
    <Card className={`relative overflow-hidden ${isInline ? 'border-l-2' : 'mb-3 border-l-2'} ${cardColor} shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-800/30`}>
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isInline ? 'p-1.5 pl-2' : 'p-2 pl-3'}`}>
        <div className="flex items-center gap-2 overflow-hidden mr-2"> {/* Added overflow-hidden and margin */}
          <DisplayIcon className={`h-4 w-4 ${cardTitleColor} flex-shrink-0`} />
          <CardTitle className={`text-xs font-semibold truncate ${cardTitleColor}`}>{type || 'Info'}</CardTitle> {/* Added truncate */}
        </div>
        <div className="flex items-center flex-shrink-0"> {/* Container for ID and button */}
          {toolId && <span className="text-xs text-muted-foreground mr-2">ID: {toolId}</span>}
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700">
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className={isInline ? 'p-1.5 pt-0 pl-2' : 'p-2 pt-0 pl-3'}>
        {typeof content === 'string' ? (
           <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{content}</p>
        ) : ( // Render non-string content (like plan steps) as pre-wrap text too
           <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{JSON.stringify(content)}</p>
           /* <pre className="text-xs bg-slate-100 dark:bg-slate-700/50 p-2 rounded overflow-x-auto">
             <code>{JSON.stringify(content, null, 2)}</code>
           </pre> */
        )}
      </CardContent>
    </Card>
  );
}


// Right Sidebar
function RightSidebar() {
  const [tabs, setTabs] = useState([
    { id: 'findings', label: "ZOI's Findings", icon: BrainCircuit },
    { id: 'editor', label: "Text Editor", icon: Pencil },
    { id: 'whiteboard', label: "Whiteboard", icon: PenTool },
  ]);
  const [activeTab, setActiveTab] = useState('findings');

  return (
    <ResizablePanel defaultSize={25} minSize={20} maxSize={40} order={2} id="right-sidebar-panel" className="flex flex-col h-full min-w-[250px]">
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-grow h-full">
          <TabsList className="grid w-full grid-cols-3 rounded-none border-b shrink-0">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs py-2 data-[state=active]:shadow-none">
                <tab.icon className="mr-1 h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollArea className="flex-grow">
            <TabsContent value="findings" className="p-4">
              {findingsData.map(finding => (
                <FindingCard key={finding.id} finding={finding} isInline={false} />
              ))}
            </TabsContent>
            <TabsContent value="editor" className="p-0 h-full">
              <div className="p-4 h-full flex flex-col">
                <p className="text-sm text-muted-foreground mb-2">Text Editor (Notion/Novel.sh style)</p>
                <Textarea placeholder="Start writing..." className="flex-grow resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base p-2 bg-transparent dark:bg-transparent"/>
              </div>
            </TabsContent>
            <TabsContent value="whiteboard" className="p-4 h-full">
              <Card className="h-full flex items-center justify-center border-dashed">
                <CardContent className="text-center">
                  <PenTool className="h-12 w-12 mx-auto text-muted-foreground mb-2"/>
                  <p className="text-sm text-muted-foreground">Whiteboard Area</p>
                  <p className="text-xs text-muted-foreground">(Integration needed)</p>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </ResizablePanel>
  );
}


// Main App Component
export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-950">
      <LeftSidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      <Separator orientation="vertical" className="h-full w-[1px] bg-slate-200 dark:bg-slate-700" />
      <ResizablePanelGroup direction="horizontal" className="flex flex-1 h-full">
        <ResizablePanel defaultSize={75} minSize={40} order={1} id="main-content-panel">
          <MainContent />
        </ResizablePanel>
        <ResizableHandle withHandle className="bg-transparent w-2 hover:bg-blue-500/20 transition-colors duration-200 group border-l border-r border-slate-200 dark:border-slate-700">
          <div className="w-full h-full flex items-center justify-center">
            <GripVertical className="h-6 w-1.5 text-slate-400 dark:text-slate-600 group-hover:text-blue-500 transition-colors duration-200" />
          </div>
        </ResizableHandle>
        <RightSidebar />
      </ResizablePanelGroup>
    </div>
  );
}

// --- NOTES ---
// 1. Tavily Card Enhancement: FindingCard now includes specific rendering logic for 'Tool Execution' of 'Tavily Search'. It iterates through `content.results`, displaying each source and snippet clearly with icons and links.
// 2. Mock Data: Updated Tavily execution results in `findingsData` to include example `url`s.
// 3. Helper Function Update: `formatKeyValue` now excludes the `results` key when rendering generic tool execution data, as `results` gets custom handling for Tavily.
// 4. Styling: Added icons (Globe, Book, ExternalLink) and basic structure (borders, spacing) to the Tavily results display. Added `truncate` and layout adjustments to card headers to prevent overflow.
// 5. Fallback Handling: Ensures other tool executions and error states are still displayed using the previous formatting logic.
```