import React from 'react';
import { SidebarToggle } from './icons/SidebarToggle';
import { NewChatIcon } from './icons/NewChatIcon';
import { Tools } from './Tools';
import { ChatFiles } from './ChatFiles';
import { Chat } from '../types';
import { ToolState } from '../hooks/useMessages';

interface SidebarProps {
  isOpen: boolean;
  chats: Chat[];
  activeChat: string | null;
  loadingChats: Record<string, boolean>;
  onClose: () => void;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onToolsChange: (toolName: string, enabled: boolean) => void;
  toolStatesMap: Record<string, ToolState>;
  useOriginalFilesMap: Record<string, boolean>;
  onUseOriginalFilesChange: (chatId: string, checked: boolean) => void;
}

export function Sidebar({ 
  isOpen, 
  chats, 
  activeChat, 
  loadingChats,
  onClose, 
  onNewChat, 
  onSelectChat, 
  onToolsChange,
  toolStatesMap,
  useOriginalFilesMap,
  onUseOriginalFilesChange
}: SidebarProps) {
  // Default state for tools (all disabled)
  const defaultToolState = {
    webSearch: false,
    codeAnalysis: false,
    imageCreator: false,
    knowledgeBases: false
  };
  
  // Get the tool state for the active chat or 'new' chat state when no active chat
  const toolState = activeChat 
    ? (toolStatesMap[activeChat] || { isWebSearchEnabled: false, isCodeAnalysisEnabled: false, isImageCreatorEnabled: false, isKnowledgeBasesEnabled: false })
    : (toolStatesMap['new'] || { isWebSearchEnabled: false, isCodeAnalysisEnabled: false, isImageCreatorEnabled: false, isKnowledgeBasesEnabled: false });
  
  // Map the tool state to the format expected by the Tools component
  const tools = {
    webSearch: toolState.isWebSearchEnabled,
    codeAnalysis: toolState.isCodeAnalysisEnabled, 
    imageCreator: toolState.isImageCreatorEnabled,
    knowledgeBases: toolState.isKnowledgeBasesEnabled
  };
  
  // Create a stable reference for placeholder IDs
  const placeholderIdsRef = React.useRef<string[]>([]);

  const handleToolToggle = (tool: string | number | symbol) => {
    onToolsChange(tool as string, !tools[tool as keyof typeof tools]);
  };

  // Initialize placeholder IDs if they haven't been created yet
  if (placeholderIdsRef.current.length === 0) {
    placeholderIdsRef.current = Array.from(
      { length: 10 },
      (_, index) => `placeholder-${index}-${Math.random().toString(36).substr(2, 9)}`
    );
  }

  // Create placeholder chats to fill up to 10 slots
  const placeholderCount = Math.max(0, 10 - chats.length);
  const placeholderChats = Array.from({ length: placeholderCount }, (_, index) => ({
    id: placeholderIdsRef.current[index],
    title: 'New Chat',
    messages: [],
    createdAt: new Date(),
    isPlaceholder: true
  }));

  const allChats = [...chats, ...placeholderChats];
  
  // Get the currently selected chat for displaying its files
  const selectedChat = chats.find(chat => chat.id === activeChat);

  return (
    <div 
      className={`
        fixed top-0 left-0 h-screen bg-gray-50 w-72 z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        sidebar shadow-lg flex flex-col
      `}
    >
      <div className="flex items-center p-2">
        <div className="flex-1 flex justify-between items-center">
          <div className="tooltip-wrapper">
            <button
              onClick={onClose}
              className="p-2 hover-button sidebar-toggle"
            >
              <SidebarToggle className="w-6 h-6 text-gray-600" />
            </button>
            <div className="tooltip">Close sidebar</div>
          </div>
          <div className="tooltip-wrapper">
            <button
              onClick={onNewChat}
              className="p-2 hover-button"
            >
              <NewChatIcon className="w-6 h-6 text-gray-600" />
            </button>
            <div className="tooltip">New chat</div>
          </div>
        </div>
      </div>

      <Tools tools={tools} onToggle={handleToolToggle} />

      <div className="px-5 py-1 text-base font-medium text-gray-700">
        Last 10 Chats
      </div>

      <div className="flex-1 overflow-y-auto">
        {allChats.map(chat => (
          <div key={chat.id} className="tooltip-wrapper w-full">
            <div
              className={`
                w-full px-5 py-1.5 transition-colors text-base
                ${chat.isPlaceholder 
                  ? 'opacity-50 cursor-default text-gray-500' 
                  : 'hover:bg-gray-200 text-gray-700 cursor-pointer ' + (activeChat === chat.id ? 'bg-gray-200' : '')
                }
                flex items-center
              `}
              onClick={() => !chat.isPlaceholder && onSelectChat(chat.id)}
            >
              <div className="truncate flex-1">{chat.title}</div>
            </div>
            {!chat.isPlaceholder && chat.title.length > 25 && (
              <div className="tooltip whitespace-normal max-w-xs">{chat.title}</div>
            )}
          </div>
        ))}
      </div>

      {/* Display files for the active chat */}
      {selectedChat && (
        <ChatFiles 
          docFiles={selectedChat.docFiles}
          codeFiles={selectedChat.codeFiles}
          isCodeAnalysisEnabled={tools.codeAnalysis}
          useOriginalFiles={useOriginalFilesMap[selectedChat.id] || false}
          onUseOriginalFilesChange={(checked: boolean) => {
            onUseOriginalFilesChange(selectedChat.id, checked);
          }}
        />
      )}
    </div>
  );
}