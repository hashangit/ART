import React, { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { ChatHistoryItem } from '../../lib/types';
import { MessageSquare, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../ui/sheet";

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (threadId: string) => void;
  onDeleteConversation: (threadId: string) => void;
  listConversations: () => ChatHistoryItem[];
  currentChatId?: string | null;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({ 
    isOpen, 
    onClose, 
    onSelectConversation, 
    listConversations,
    onDeleteConversation,
    currentChatId
}) => {
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setHistory(listConversations());
    }
  }, [isOpen, listConversations]);

  const handleSelect = (threadId: string) => {
    onSelectConversation(threadId);
    onClose();
  };
  
  const handleDelete = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    onDeleteConversation(threadId);
    setHistory(listConversations());
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Chat History</SheetTitle>
          <SheetDescription>
            Select a previous conversation to continue or review it.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-4">
            <div className="flex flex-col gap-2 py-4">
                {history.length > 0 ? history.map((chat) => (
                <div
                    key={chat.threadId}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        currentChatId === chat.threadId 
                        ? 'bg-blue-100 dark:bg-blue-900/50' 
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => handleSelect(chat.threadId)}
                >
                    <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-slate-500" />
                        <div className='flex-1'>
                            <p className="text-sm font-medium truncate max-w-[250px] sm:max-w-[350px]">
                                {chat.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {new Date(chat.timestamp).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => handleDelete(e, chat.threadId)}
                    >
                        <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" />
                    </Button>
                </div>
                )) : (
                    <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                        <p>No chat history found.</p>
                    </div>
                )}
            </div>
            </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}; 