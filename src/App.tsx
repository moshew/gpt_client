import React, { useState, useRef, createContext, useContext } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatArea } from './components/ChatArea';
import { ChatInput, ImageOptions, KnowledgeBaseOptions } from './components/ChatInput';
import { CodeEditor } from './components/CodeEditor';
import { useAuth } from './hooks/useAuth';
import { useChats } from './hooks/useChats';
import { useMessages } from './hooks/useMessages';
import { useCodeEditor } from './hooks/useCodeEditor';
import { copyToClipboard } from './utils/clipboard';
import { ChatFiles } from './components/ChatFiles';
import { Upload } from 'lucide-react';

import 'highlight.js/styles/vs.css';
import './code-highlight.css';

// Create a context for dropped files
export const DroppedFilesContext = createContext<{
  addDroppedFiles?: (files: File[]) => void
}>({});

function App() {
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});
  const [selectedModel, setSelectedModel] = useState('GPT-4.1');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSwitchingChat, setIsSwitchingChat] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<{addFiles: (files: File[]) => void} | null>(null);

  const { user, isAuthenticating, handleLogin, handleLogout } = useAuth();
  const { 
    chats, 
    activeChat, 
    setActiveChat, 
    createNewChat, 
    updateChatName, 
    updateChatFiles, 
    clearChats, 
    isCreatingChat,
    handleChatDataLoaded
  } = useChats(user);
    
  const {
    messages,
    messagesMap,
    isLoading,
    loadingChats,
    hasStartedResponse,
    isCodeAnalysisEnabled,
    setIsCodeAnalysisEnabled,
    isWebSearchEnabled,
    setIsWebSearchEnabled,
    isImageCreatorEnabled,
    setIsImageCreatorEnabled,
    isKnowledgeBasesEnabled,
    setIsKnowledgeBasesEnabled,
    handleSubmit,
    clearMessages,
    clearAllChats,
    stopQuery,
    uploadStatus,
    resetState,
    toolStatesMap
  } = useMessages({
    user,
    activeChat,
    createNewChat,
    updateChatName,
    updateChatFiles,
    setActiveChat,
    onLoadStart: () => setIsInitializing(true),
    onLoadComplete: () => {
      setIsInitializing(false);
      setIsSwitchingChat(false);
    },
    onChatDataLoaded: handleChatDataLoaded
  });

  const {
    editingCode,
    setEditingCode,
    isLeftPanelOpen,
    setIsLeftPanelOpen,
    handleEditCode,
    handleSidebarToggle
  } = useCodeEditor();
  
  const [editorTitle, setEditorTitle] = useState("Code Editor");
  const [isHtmlContent, setIsHtmlContent] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const currentInput = activeChat ? (chatInputs[activeChat] || '') : (chatInputs['new'] || '');
  
  // Get active chat files
  const activeFiles = activeChat 
    ? chats.find(chat => chat.id === activeChat)?.files || [] 
    : [];

  const handleInputChange = (value: string) => {
    if (activeChat) {
      setChatInputs(prev => ({
        ...prev,
        [activeChat]: value
      }));
    } else {
      setChatInputs(prev => ({
        ...prev,
        'new': value
      }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent, files?: File[], imageOptions?: ImageOptions, kbOptions?: KnowledgeBaseOptions) => {
    e.preventDefault();
    const input = activeChat ? chatInputs[activeChat] : chatInputs['new'];
    
    // For image creator, we must have input text even if no files
    if (
      (!input?.trim() && (!files || files.length === 0) && !isImageCreatorEnabled) ||
      (!input?.trim() && isImageCreatorEnabled) ||
      isLoading || 
      isCreatingChat
    ) return;
  
    setChatInputs(prev => ({
      ...prev,
      [activeChat || 'new']: ''
    }));
    
    // Pass the knowledge base options to handleSubmit if they exist
    await handleSubmit(input, files, imageOptions, kbOptions);
  };

  const handleStopQuery = () => {
    if (activeChat && isLoading) {
      stopQuery(activeChat);
    }
  };

  const handleLogoutClick = () => {
    handleLogout(() => {
      setIsLeftPanelOpen(false);
      clearChats();
      clearMessages();
      setChatInputs({});
    });
  };

  const handleNewChat = () => {
    setIsInitializing(false);
    setIsSwitchingChat(false);
    // Reset the hasStartedResponse state to properly show the centered UI
    resetState();
    setActiveChat(null);
    const previousNewChatInput = chatInputs['new'] || '';
    setChatInputs({ 'new': previousNewChatInput });
    
    // Force hide the header separator when creating new chat
    const separator = document.getElementById('header-separator');
    if (separator) {
      separator.style.opacity = '0';
    }
  };


  const handleSelectChat = (chatId: string) => {
    setIsInitializing(true);
    setIsSwitchingChat(true);
    
    const currentChatInput = activeChat ? currentInput : chatInputs['new'];
    if (currentChatInput) {
      setChatInputs(prev => ({
        ...prev,
        [activeChat || 'new']: currentChatInput
      }));
    }
    
    setActiveChat(chatId);
  };

  const handleToolsChange = (toolName: string, enabled: boolean) => {
    // Map tool name from Sidebar to state setters in useMessages hook
    if (toolName === 'webSearch') {
      setIsWebSearchEnabled(enabled);
    } else if (toolName === 'codeAnalysis') {
      setIsCodeAnalysisEnabled(enabled);
    } else if (toolName === 'imageCreator') {
      setIsImageCreatorEnabled(enabled);
    } else if (toolName === 'knowledgeBases') {
      setIsKnowledgeBasesEnabled(enabled);
    }
  };

  // Handle drag & drop events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set to false if the drag leaves the main container
    // Check if the related target is not within the dropzone
    const relatedTarget = e.relatedTarget as Node;
    if (!dropZoneRef.current?.contains(relatedTarget)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (isLoading) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && !isImageCreatorEnabled && !isKnowledgeBasesEnabled) {
      // Just add files to ChatInput without auto-submitting
      setDroppedFiles(files);
    }
  };

  const shouldShowEmptyState = messages.length === 0 && !isLoading && !hasStartedResponse && !isSwitchingChat;

  // Register a function to add dropped files to ChatInput
  const registerChatInputRef = (addFilesFunc: (files: File[]) => void) => {
    chatInputRef.current = { addFiles: addFilesFunc };
  };

  // Effect to handle dropped files
  React.useEffect(() => {
    if (droppedFiles.length > 0 && chatInputRef.current) {
      chatInputRef.current.addFiles(droppedFiles);
      setDroppedFiles([]);
    }
  }, [droppedFiles]);

  return (
    <div className="flex h-screen bg-white relative">
      {user && (
        <>
          {isLeftPanelOpen && editingCode !== null && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => {
                setIsLeftPanelOpen(false);
                document.body.style.overflow = 'auto';
              }}
            />
          )}

          <Sidebar
            isOpen={isLeftPanelOpen}
            chats={chats}
            activeChat={activeChat}
            loadingChats={loadingChats}
            onClose={() => {
              setIsLeftPanelOpen(false);
              document.body.style.overflow = 'auto';
            }}
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            onToolsChange={handleToolsChange}
            toolStatesMap={toolStatesMap}
          />
        </>
      )}

      <main 
        className={`
          flex-1 flex flex-col h-screen transition-all duration-300 ease-in-out
          ${isLeftPanelOpen && editingCode === null ? 'ml-72' : 'ml-0'}
          ${isLeftPanelOpen && editingCode !== null ? 'pointer-events-none' : ''}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="flex z-20 relative">
            <div className={`transition-all duration-300 ease-in-out ${editingCode !== null ? 'w-1/2' : 'w-full'}`}>
              <Header
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                isLeftPanelOpen={isLeftPanelOpen}
                onTogglePanel={handleSidebarToggle}
                onNewChat={handleNewChat}
                isCodeEditorOpen={editingCode !== null}
                showAvatar={!editingCode}
                user={user}
                onLogin={handleLogin}
                onLogout={handleLogoutClick}
                isAuthenticating={isAuthenticating}
              />
            </div>
            {editingCode !== null && (
              <div className="w-1/2 border-l border-gray-200">
                <Header
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  isLeftPanelOpen={isLeftPanelOpen}
                  onTogglePanel={handleSidebarToggle}
                  onNewChat={handleNewChat}
                  isCodeEditorOpen={true}
                  showControls={false}
                  title={editorTitle}
                  showAvatar={true}
                  onClose={() => setEditingCode(null)}
                  user={user}
                  onLogin={handleLogin}
                  onLogout={handleLogoutClick}
                  isAuthenticating={isAuthenticating}
                  isHTML={isHtmlContent}
                  isPreviewMode={isPreviewMode}
                  onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
                />
              </div>
            )}
          </div>

          <div className="flex-1 flex min-h-0 relative">
            <div className={`flex flex-col transition-all duration-300 ease-in-out ${editingCode !== null ? 'w-1/2 bg-gray-50' : 'w-full'}`}>
              <div 
                className="flex-1 relative"
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isDraggingOver && (
                  <div className="absolute inset-0 bg-white bg-opacity-95 flex flex-col items-center justify-center z-50 border-2 border-dashed border-blue-400">
                    <Upload className="w-16 h-16 text-blue-500 mb-4" />
                    <div className="text-2xl font-medium mb-3">Add anything</div>
                    <div className="text-gray-600 font-medium text-lg">Drop any file here to add it to the conversation</div>
                  </div>
                )}
                
                {shouldShowEmptyState ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full max-w-3xl mx-auto px-4 flex flex-col items-center -mt-40">
                      <h2 className="text-[1.7rem] font-normal text-gray-700 mb-8">Where should we begin?</h2>
                      <div className="w-full">
                        <ChatInput
                          input={currentInput}
                          isLoading={isLoading}
                          onChange={handleInputChange}
                          onSubmit={handleFormSubmit}
                          onStop={handleStopQuery}
                          messages={messages}
                          isInitializing={isInitializing || loadingChats}
                          uploadStatus={uploadStatus}
                          chatId={activeChat}
                          isImageCreatorEnabled={isImageCreatorEnabled}
                          isKnowledgeBasesEnabled={isKnowledgeBasesEnabled}
                          registerAddFiles={registerChatInputRef}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col">
                    <ChatArea
                      messages={messages}
                      isLoading={isLoading && !hasStartedResponse}
                      onCopyCode={copyToClipboard}
                      onEditCode={handleEditCode}
                      activeChat={activeChat}
                    />
                    <ChatInput
                      input={currentInput}
                      isLoading={isLoading}
                      onChange={handleInputChange}
                      onSubmit={handleFormSubmit}
                      onStop={handleStopQuery}
                      messages={messages}
                      isInitializing={isInitializing || loadingChats}
                      uploadStatus={uploadStatus}
                      chatId={activeChat}
                      isImageCreatorEnabled={isImageCreatorEnabled}
                      isKnowledgeBasesEnabled={isKnowledgeBasesEnabled}
                      registerAddFiles={registerChatInputRef}
                    />
                  </div>
                )}
              </div>
            </div>

            {editingCode !== null && (
              <div className="w-1/2 bg-white border-l border-gray-200">
                <div className="h-full">
                  <CodeEditor
                    code={editingCode}
                    onClose={() => setEditingCode(null)}
                    onChange={setEditingCode}
                    onTitleChange={setEditorTitle}
                    onHtmlDetected={setIsHtmlContent}
                    onPreviewModeChange={setIsPreviewMode}
                    isPreviewModeExternal={isPreviewMode}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;