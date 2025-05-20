import { useState, useRef, useEffect } from 'react';
import { Message, User, Chat, ChatDataResponse, ChatFile, ImageResult } from '../types';
import config from '../config';
import { ImageOptions, KnowledgeBaseOptions } from '../components/ChatInput';

// Define a type for tool states
export interface ToolState {
  isCodeAnalysisEnabled: boolean;
  isWebSearchEnabled: boolean;
  isImageCreatorEnabled: boolean;
  isKnowledgeBasesEnabled: boolean;
}

interface UseMessagesProps {
  user: User | null;
  activeChat: string | null;
  createNewChat: () => Promise<Chat | null>;
  updateChatName: (chatId: string, message: string) => Promise<boolean>;
  updateChatFiles: (chatId: string, docFiles?: ChatFile[], codeFiles?: ChatFile[]) => void;
  setActiveChat: (chatId: string | null) => void;
  onLoadStart?: () => void;
  onLoadComplete?: () => void;
  onChatDataLoaded?: (chatId: string, docFiles?: ChatFile[], codeFiles?: ChatFile[]) => void;
}

export function useMessages({ 
  user, 
  activeChat, 
  createNewChat, 
  updateChatName,
  updateChatFiles,
  setActiveChat,
  onLoadStart,
  onLoadComplete,
  onChatDataLoaded
}: UseMessagesProps) {
  // Default state for a new chat (all tools disabled)
  const defaultToolState: ToolState = {
    isCodeAnalysisEnabled: false,
    isWebSearchEnabled: false,
    isImageCreatorEnabled: false,
    isKnowledgeBasesEnabled: false
  };

  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [loadingChats, setLoadingChats] = useState<Record<string, boolean>>({});
  const [hasStartedResponse, setHasStartedResponse] = useState(false);
  
  // Store tool states per chat ID (with special 'new' ID for new chat state)
  const [toolStatesMap, setToolStatesMap] = useState<Record<string, ToolState>>({
    'new': { ...defaultToolState } // Initialize with default state for new chat
  });
  
  // Get the current tool state for the active chat or use the 'new' state for new chats
  const currentToolState = activeChat 
    ? (toolStatesMap[activeChat] || defaultToolState) 
    : (toolStatesMap['new'] || defaultToolState);
  
  // Extract individual tool states for easier access
  const isCodeAnalysisEnabled = currentToolState.isCodeAnalysisEnabled;
  const isWebSearchEnabled = currentToolState.isWebSearchEnabled;
  const isImageCreatorEnabled = currentToolState.isImageCreatorEnabled;
  const isKnowledgeBasesEnabled = currentToolState.isKnowledgeBasesEnabled;
  
  const [uploadStatusMap, setUploadStatusMap] = useState<Record<string, {
    isUploading: boolean;
    isIndexing: boolean;
    error?: string;
  }>>({});
  
  const eventSourcesRef = useRef<Record<string, EventSource>>({});
  const pendingMessagesRef = useRef<Record<string, string>>({});
  const [newChatIds, setNewChatIds] = useState<Set<string>>(new Set());
  const [chatsToLoad, setChatsToLoad] = useState<Set<string>>(new Set());

  const messages = activeChat ? (messagesMap[activeChat] || []) : [];
  const isLoading = activeChat ? !!loadingChats[activeChat] : false;
  const uploadStatus = activeChat ? (uploadStatusMap[activeChat] || { isUploading: false, isIndexing: false }) : { isUploading: false, isIndexing: false };

  // Add selectedModel to the component state
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    // Try to get the model from App component through localStorage or default to GPT-4.1
    return localStorage.getItem('selectedModel') || 'GPT-4.1';
  });
  
  // Update selectedModel when it changes in the App component
  useEffect(() => {
    // Handler for changes in other windows/tabs
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'selectedModel' && event.newValue) {
        setSelectedModel(event.newValue);
      }
    };
    
    // Check for changes in this window
    const checkLocalStorage = () => {
      const currentModel = localStorage.getItem('selectedModel');
      if (currentModel && currentModel !== selectedModel) {
        setSelectedModel(currentModel);
      }
    };

    // Run check periodically
    const intervalId = setInterval(checkLocalStorage, 1000);
    
    // Listen for changes in other windows
    window.addEventListener('storage', handleStorageEvent);
    
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [selectedModel]);

  // Reset state for a new chat
  const resetState = () => {
    setHasStartedResponse(false);
  };

  // Function to update a specific tool state for the current chat
  const updateToolState = (toolName: keyof ToolState, enabled: boolean) => {
    // Determine which key to update - use 'new' if no active chat
    const stateKey = activeChat || 'new';
    
    setToolStatesMap(prev => {
      const currentState = prev[stateKey] || {...defaultToolState};
      
      // If enabling this tool, disable all others
      if (enabled) {
        const newState = {
          isCodeAnalysisEnabled: false,
          isWebSearchEnabled: false,
          isImageCreatorEnabled: false,
          isKnowledgeBasesEnabled: false,
          [toolName]: true
        };
        return {
          ...prev,
          [stateKey]: newState
        };
      } else {
        // Just toggle the specific tool
        return {
          ...prev,
          [stateKey]: {
            ...currentState,
            [toolName]: enabled
          }
        };
      }
    });
  };
  
  // Helper functions to set individual tool states
  const setIsCodeAnalysisEnabled = (enabled: boolean) => updateToolState('isCodeAnalysisEnabled', enabled);
  const setIsWebSearchEnabled = (enabled: boolean) => updateToolState('isWebSearchEnabled', enabled);
  const setIsImageCreatorEnabled = (enabled: boolean) => updateToolState('isImageCreatorEnabled', enabled);
  const setIsKnowledgeBasesEnabled = (enabled: boolean) => updateToolState('isKnowledgeBasesEnabled', enabled);

  // Load chat data when active chat changes
  useEffect(() => {
    if (!activeChat || !user?.token) return;
    
    if (newChatIds.has(activeChat)) return;
    
    if (!messagesMap[activeChat]) {
      setChatsToLoad(prev => {
        const updated = new Set(prev);
        updated.add(activeChat);
        return updated;
      });
    }
  }, [activeChat, user, newChatIds, messagesMap]);

  // Process chats that need to be loaded
  useEffect(() => {
    if (!user?.token || chatsToLoad.size === 0) return;
    
    const loadNextChat = async () => {
      const chatId = Array.from(chatsToLoad)[0];
      
      setChatsToLoad(prev => {
        const updated = new Set(prev);
        updated.delete(chatId);
        return updated;
      });
      
      if (onLoadStart) {
        onLoadStart();
      }

      try {
        const response = await fetch(`${config.apiBaseUrl}/chat_data/${chatId}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
      
        if (!response.ok) {
          throw new Error('Failed to fetch chat data');
        }

        const data: ChatDataResponse = await response.json();

        const convertedMessages: Message[] = data.messages.map(msg => {
          // Check if the message is an image type by checking if content is an object
          if (msg.sender === 'assistant' && typeof msg.content === 'object' && msg.content?.type === 'image') {
            return {
              id: msg.id.toString(),
              role: msg.sender,
              content: '', // Empty content for image messages
              status: 'complete',
              imageResult: {
                url: msg.content.url,
                filename: msg.content.filename,
                timestamp: msg.content.created,
                isVariation: false
              }
            };
          } else {
            // Ensure content is properly handled as a string
            let messageContent = '';
            if (typeof msg.content === 'string') {
              messageContent = msg.content;
            } else if (msg.content) {
              try {
                messageContent = JSON.stringify(msg.content);
              } catch (e) {
                console.error('Error stringifying message content:', e);
                messageContent = String(msg.content);
              }
            }
            
            // Force consistent formatting for messages
            return {
              id: msg.id.toString(),
              role: msg.sender, // This should be either 'user' or 'assistant'
              content: messageContent,
              status: 'complete',
              imageResult: undefined
            };
          }
        });
      
        setMessagesMap(prev => ({
          ...prev,
          [chatId]: convertedMessages
        }));
      
        // Call the callback with file data if it exists
        if ((data.docs && data.docs.length > 0) || 
            (data.code && data.code.length > 0)) {
          if (onChatDataLoaded) {
            onChatDataLoaded(chatId, data.docs || [], data.code || []);
          }
        }
      
      } catch (error) {
        console.error(`Error loading chat messages for chat ${chatId}:`, error);
        setMessagesMap(prev => ({
          ...prev,
          [chatId]: []
        }));
      } finally {
        if (onLoadComplete) {
          onLoadComplete();
        }
      }
    };

    loadNextChat();
  }, [chatsToLoad, user, onLoadStart, onLoadComplete, onChatDataLoaded]);

  // Helper function to update a message in a specific chat
  const updateMessageInChat = (chatId: string, messageId: string, 
                             updates: Partial<Message> | ((prev: string) => string)) => {
    setMessagesMap(prev => {
      const chatMessages = prev[chatId] || [];
      const updatedMessages = chatMessages.map(msg => {
        if (msg.id !== messageId) return msg;
        
        if (typeof updates === 'function') {
          return { ...msg, content: updates(msg.content) };
        }
        return { ...msg, ...updates };
      });
      
      return {
        ...prev,
        [chatId]: updatedMessages
      };
    });
  };

  // Helper function to add a new message to a chat
  const addMessageToChat = (
    chatId: string, 
    role: Message['role'], 
    content: string, 
    status?: Message['status'],
    imageResult?: ImageResult
  ) => {
    // Generate UUID with fallback
    let id: string;
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      // Fallback UUID generation
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    const newMessage: Message = {
      id,
      role,
      content,
      status,
      imageResult
    };
    
    setMessagesMap(prev => {
      const chatMessages = prev[chatId] || [];
      return {
        ...prev,
        [chatId]: [...chatMessages, newMessage]
      };
    });
    
    return newMessage;
  };

  // File upload handling
  const handleFileUpload = async (files: File[], chatId: string): Promise<void> => {
    if (!user?.token) {
      throw new Error('User not authenticated');
    }
  
    setUploadStatusMap(prev => ({
      ...prev,
      [chatId]: { isUploading: true, isIndexing: false }
    }));
  
    try {
      // Get current tool state to determine file type
      const currentState = toolStatesMap[chatId] || toolStatesMap['new'] || defaultToolState;
      const fileType = currentState.isCodeAnalysisEnabled ? "code" : "doc";
  
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      formData.append('file_type', fileType);
  
      const uploadResponse = await fetch(`${config.apiBaseUrl}/upload_files/${chatId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: formData
      });
  
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload error response:', errorText);
        throw new Error(`Failed to upload documents: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }
      
      const uploadData = await uploadResponse.json();
      updateChatFiles(
        chatId, 
        uploadData.doc_files || [],
        uploadData.code_files || []
      );
  
      // Only index files if they are documents (not code)
      if (fileType === "doc") {
        setUploadStatusMap(prev => ({
          ...prev,
          [chatId]: { isUploading: false, isIndexing: true }
        }));

        const indexResponse = await fetch(`${config.apiBaseUrl}/index_files/${chatId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
        });
  
        if (!indexResponse.ok) {
          const errorText = await indexResponse.text();
          console.error('Indexing error response:', errorText);
          throw new Error(`Failed to index documents: ${indexResponse.status} ${indexResponse.statusText}`);
        }
      } 
    } catch (error) {
      console.error('Error handling files:', error);
      setUploadStatusMap(prev => ({
        ...prev,
        [chatId]: { isUploading: false, isIndexing: false, error: 'Failed to process documents' }
      }));
      throw error;
    } finally {
      setUploadStatusMap(prev => ({
        ...prev,
        [chatId]: { isUploading: false, isIndexing: false }
      }));
    }
  };

  // Upload files to chat and return uploaded filenames
  const uploadFilesToChat = async (chatId: string, files: File[]): Promise<{uploaded: boolean, filenames: ChatFile[]}> => {
    if (!user?.token) {
      throw new Error('User not authenticated');
    }
  
    setUploadStatusMap(prev => ({
      ...prev,
      [chatId]: { isUploading: true, isIndexing: false }
    }));
  
    try {
      // Get current tool state to determine file type
      const currentState = toolStatesMap[chatId] || toolStatesMap['new'] || defaultToolState;
      const fileType = currentState.isCodeAnalysisEnabled ? "code" : "doc";
  
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      formData.append('file_type', fileType);
  
      const uploadResponse = await fetch(`${config.apiBaseUrl}/upload_files/${chatId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: formData
      });
  
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload error response:', errorText);
        throw new Error(`Failed to upload documents: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }
      
      const uploadData = await uploadResponse.json();
      
      // Convert string filenames to ChatFile objects if necessary
      const docFiles = (uploadData.doc_files || []).map((filename: string) => ({ 
        id: filename, 
        file_name: filename,
        file_type: 'doc'
      }));
      
      const codeFiles = (uploadData.code_files || []).map((filename: string) => ({ 
        id: filename, 
        file_name: filename,
        file_type: 'code'
      }));
      
      const chatFiles: ChatFile[] = [...docFiles, ...codeFiles];
  
      // Only index files if they are documents (not code)
      if (fileType === "doc") {
        setUploadStatusMap(prev => ({
          ...prev,
          [chatId]: { isUploading: false, isIndexing: true }
        }));

        const indexResponse = await fetch(`${config.apiBaseUrl}/index_files/${chatId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
        });
  
        if (!indexResponse.ok) {
          const errorText = await indexResponse.text();
          console.error('Indexing error response:', errorText);
          throw new Error(`Failed to index documents: ${indexResponse.status} ${indexResponse.statusText}`);
        }
      }
      
      return { uploaded: true, filenames: chatFiles };
    } catch (error) {
      console.error('Error handling files:', error);
      setUploadStatusMap(prev => ({
        ...prev,
        [chatId]: { isUploading: false, isIndexing: false, error: 'Failed to process documents' }
      }));
      throw error;
    } finally {
      setUploadStatusMap(prev => ({
        ...prev,
        [chatId]: { isUploading: false, isIndexing: false }
      }));
    }
  };

  // Unified function to handle all query requests (with or without images)
  const createQueryRequest = async (
    userMessage: string, 
    assistantMessageId: string, 
    chatId: string, 
    imageFiles: File[] = [], 
    kbName?: string
  ) => {
    if (eventSourcesRef.current[chatId]) {
      eventSourcesRef.current[chatId].close();
      delete eventSourcesRef.current[chatId];
    }
  
    try {
      // Get the effective tool state
      const effectiveToolState = toolStatesMap[chatId] || defaultToolState;
      
      // Determine the API endpoint
      let baseUrl = `${config.apiBaseUrl}/query`;
      if (effectiveToolState.isCodeAnalysisEnabled) {
        baseUrl = `${config.apiBaseUrl}/query_code`;
      }
      
      // Determine if we need to create a session first:
      // - Either the message is long (>1000 characters)
      // - Or we have image files to upload
      const isLongMessage = userMessage.length > 1000;
      const hasImages = imageFiles.length > 0;
      let sessionId: string | null = null;
      
      // Create a session if needed
      if (isLongMessage || hasImages) {
        const formData = new FormData();
        formData.append('query', userMessage);
        
        // Add images if available
        if (hasImages) {
          imageFiles.forEach(file => {
            formData.append('images', file);
          });
        }
        
        const sessionResponse = await fetch(`${config.apiBaseUrl}/start_query_session/${chatId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user?.token}`
          },
          body: formData
        });
        
        if (!sessionResponse.ok) {
          throw new Error('Failed to create query session');
        }
        
        const sessionData = await sessionResponse.json();
        sessionId = sessionData.session_id;
        
        if (!sessionId) {
          throw new Error('No session ID returned from server');
        }
      }
      
      // Build the query URL with all necessary parameters
      const url = new URL(baseUrl);
      url.searchParams.append('chat_id', chatId);
      url.searchParams.append('token', user?.token || '');
      
      // Always send the deployment_name
      url.searchParams.append('deployment_name', selectedModel);
      
      // Add session ID if available, otherwise add the query directly
      if (sessionId) {
        url.searchParams.append('session_id', sessionId);
      } else {
        url.searchParams.append('query', userMessage);
      }
      
      // Add optional parameters based on tool state
      if (effectiveToolState.isWebSearchEnabled) {
        url.searchParams.append('web_search', 'true');
      }
      
      if (effectiveToolState.isKnowledgeBasesEnabled && kbName) {
        url.searchParams.append('kb_name', kbName);
      }
      
      // Create and setup the EventSource
      const newEventSource = new EventSource(url.toString());
      eventSourcesRef.current[chatId] = newEventSource;
      setupEventSourceHandlers(newEventSource, chatId, assistantMessageId);
      
    } catch (error) {
      console.error('Error setting up query request:', error);
      
      setLoadingChats(prev => ({
        ...prev,
        [chatId]: false
      }));
      
      updateMessageInChat(chatId, assistantMessageId, {
        content: 'Sorry, I encountered an error while processing your request.',
        status: 'complete'
      });
      
      delete pendingMessagesRef.current[chatId];
    }
  };

  // Main submit handler for user input
  const handleSubmit = async (input: string, files?: File[], imageOptions?: ImageOptions, kbOptions?: KnowledgeBaseOptions) => {
    if (!user) return;
    if (!input?.trim() && (!files || files.length === 0)) return;
    if (activeChat && (loadingChats[activeChat] || pendingMessagesRef.current[activeChat])) return;
  
    setHasStartedResponse(false);
  
    const userMessage = input.trim();
    let targetChatId: string;
    
    try {
      // Identify which tool state to use - for new chats, use the 'new' state
      // This needs to happen before we create a new chat to ensure we correctly identify image creation mode
      const currentToolState = activeChat 
        ? (toolStatesMap[activeChat] || defaultToolState) 
        : (toolStatesMap['new'] || defaultToolState);
      
      // Check if we're in image creator mode BEFORE we create the chat
      const isInImageCreatorMode = currentToolState.isImageCreatorEnabled && imageOptions && input.trim();
    
      if (activeChat === null) {
        const newChat = await createNewChat();
        if (!newChat) {
          console.error('Failed to create new chat');
          return;
        }
        
        targetChatId = newChat.id;
        setActiveChat(targetChatId);
        
        // Add the chat ID to the new chat IDs set to track it
        setNewChatIds(prev => {
          const updated = new Set(prev);
          updated.add(targetChatId);
          return updated;
        });
        
        const newChatToolState = toolStatesMap['new'] || {...defaultToolState};
        setToolStatesMap(prev => ({
          ...prev,
          [targetChatId]: {...newChatToolState}
        }));
        
        updateChatName(targetChatId, userMessage).catch(error => {
          console.error('Error updating chat name:', error);
        });
      } else {
        targetChatId = activeChat;
      }
      
      // IMPORTANT: Set hasStartedResponse to true after creating a chat, so the UI shows the chat immediately
      // This ensures the messages don't disappear while waiting for the response
      setHasStartedResponse(true);

      // Separate image files from other files
      const imageFiles = files?.filter(file => file.type.startsWith('image/')) || [];
      const nonImageFiles = files?.filter(file => !file.type.startsWith('image/')) || [];

      // Create separate user messages for image files (displayed as base64)
      const imageMessages: Message[] = [];
      if (imageFiles.length > 0) {
        for (const imageFile of imageFiles) {
          const imageMessage = await createImageMessageFromFile(imageFile, targetChatId);
          if (imageMessage) {
            imageMessages.push(imageMessage);
          }
        }
      }

      // Add user message if there's text or non-image files
      if (userMessage || nonImageFiles.length > 0) {
        // Add the text message to the chat
        const actualUserMessage = addMessageToChat(
          targetChatId,
          'user',
          userMessage,
          'complete'
        );
        
        // Upload non-image files if any
        if (nonImageFiles.length > 0) {
          try {
            setLoadingChats(prev => ({
              ...prev,
              [targetChatId]: true
            }));
            
            // Add chat_files flag to indicate file upload is in progress
            updateMessageInChat(targetChatId, actualUserMessage.id, {
              isUploadMessage: true
            });
            
            const uploadResult = await uploadFilesToChat(targetChatId, nonImageFiles);
            
            if (uploadResult.uploaded) {
              updateChatFiles(targetChatId, uploadResult.filenames);
            }
            
          } catch (error) {
            console.error('Error uploading files:', error);
          } finally {
            // We don't set loading to false here because we're going to start processing
          }
        }
      }
      
      // Always add an assistant message, even for empty/file messages
      const assistantMessageObj = addMessageToChat(
        targetChatId,
        'assistant',
        '',
        'streaming'
      );
      
      // Track pending message
      pendingMessagesRef.current[targetChatId] = assistantMessageObj.id;
      
      setLoadingChats(prev => ({
        ...prev,
        [targetChatId]: true
      }));
      
      // We already determined if we're in image creator mode above, so we use that value directly
      if (isInImageCreatorMode) {
        updateMessageInChat(targetChatId, assistantMessageObj.id, { 
          isImageGeneration: true 
        });
        generateImage(input, imageOptions!, targetChatId, assistantMessageObj.id);
      } 
      else if (userMessage.trim()) {
        // Get the final tool state from the map now that we've created the chat
        const effectiveToolState = toolStatesMap[targetChatId] || defaultToolState;
        
        // Get knowledge base name if needed
        const kbName = effectiveToolState.isKnowledgeBasesEnabled && kbOptions ? kbOptions.kbName : undefined;
        
        // Use the unified function for all query requests
        await createQueryRequest(userMessage, assistantMessageObj.id, targetChatId, imageFiles, kbName);
      }
  
    } catch (error) {
      console.error('Error in submit handler:', error);
      setLoadingChats(prev => ({
        ...prev,
        [activeChat || '']: false
      }));
    }
  };

  // Helper to set up event source handlers
  const setupEventSourceHandlers = (eventSource: EventSource, chatId: string, messageId: string) => {
    eventSource.onmessage = (event) => {
      const data = event.data;
      
      if (activeChat === chatId && !hasStartedResponse) {
        setHasStartedResponse(true);
      }
      
      if (data === '[DONE]') {
        eventSource.close();
        delete eventSourcesRef.current[chatId];
        
        setLoadingChats(prev => ({
          ...prev,
          [chatId]: false
        }));
        
        updateMessageInChat(chatId, messageId, { status: 'complete' });
        delete pendingMessagesRef.current[chatId];
        
        if (newChatIds.has(chatId)) {
          setNewChatIds(prev => {
            const updated = new Set(prev);
            updated.delete(chatId);
            return updated;
          });
        }
        
        return;
      }

      try {
        const content = typeof data === 'string' ? data : '';
        updateMessageInChat(chatId, messageId, prev => prev + content.replace(/\[NEWLINE\]/g, '\n'));
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.warn('EventSource encountered an error:', error);
      
      // Always clean up resources when an error occurs
      eventSource.close();
      delete eventSourcesRef.current[chatId];
      
      setLoadingChats(prev => ({
        ...prev,
        [chatId]: false
      }));
      
      // Only update the message if it hasn't already been completed
      if (pendingMessagesRef.current[chatId] === messageId) {
        // Get current message content
        const currentMessage = messagesMap[chatId]?.find(msg => msg.id === messageId);
        const currentContent = currentMessage?.content || '';
        
        // Add appropriate error message based on content
        const errorMessage = currentContent.trim() 
          ? `${currentContent}\n\n(The connection was interrupted. The response may be incomplete.)`
          : 'Sorry, I encountered an error while processing your request.';
          
        updateMessageInChat(chatId, messageId, {
          content: errorMessage,
          status: 'complete'
        });
        
        delete pendingMessagesRef.current[chatId];
      }
      
      if (newChatIds.has(chatId)) {
        setNewChatIds(prev => {
          const updated = new Set(prev);
          updated.delete(chatId);
          return updated;
        });
      }
    };
    
    // Add an 'open' handler to confirm the connection was established
    eventSource.onopen = () => {
      console.log('EventSource connection established for chat', chatId);
    };
  };

  // Create a user message for an image file with base64 content
  const createImageMessageFromFile = async (file: File, chatId: string): Promise<Message | null> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Content = e.target?.result?.toString() || '';
        if (base64Content) {
          // Extract the base64 data without the prefix
          let imageData = base64Content;
          let imageFormat = 'png';
          
          // Extract format from the data URL
          const formatMatch = base64Content.match(/^data:image\/([a-zA-Z0-9]+);base64,/);
          if (formatMatch && formatMatch[1]) {
            imageFormat = formatMatch[1];
          }
          
          // Remove the prefix to get just the base64 data
          const dataMatch = base64Content.match(/^data:image\/[a-zA-Z0-9]+;base64,(.+)$/);
          if (dataMatch && dataMatch[1]) {
            imageData = dataMatch[1];
          }
          
          // Create image in JSON format
          const imageJson = JSON.stringify({
            type: 'image',
            data: imageData,
            format: imageFormat,
            alt: file.name || 'Uploaded image'
          });
          
          const imageMessage = addMessageToChat(
            chatId,
            'user',
            imageJson, // Store as JSON string
            'complete'
          );
          resolve(imageMessage);
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  // Stop an active query/response
  const stopQuery = async (chatId: string) => {
    if (!user?.token) return;

    try {
      const response = await fetch(`${config.apiBaseUrl}/stop_query/${chatId}?token=${encodeURIComponent(user.token)}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to stop query');
      }

      if (eventSourcesRef.current[chatId]) {
        eventSourcesRef.current[chatId].close();
        delete eventSourcesRef.current[chatId];
      }

      const lastMessage = messagesMap[chatId]?.slice(-1)[0];
      if (lastMessage && lastMessage.status === 'streaming') {
        updateMessageInChat(chatId, lastMessage.id, { status: 'complete' });
      }

      delete pendingMessagesRef.current[chatId];
      
      setLoadingChats(prev => ({
        ...prev,
        [chatId]: false
      }));

      setHasStartedResponse(false);

    } catch (error) {
      console.error('Error stopping query:', error);
      delete pendingMessagesRef.current[chatId];
      setLoadingChats(prev => ({
        ...prev,
        [chatId]: false
      }));
    }
  };

  // Clear messages in the current chat
  const clearMessages = () => {
    if (!activeChat) return;
    
    setMessagesMap(prev => ({
      ...prev,
      [activeChat]: []
    }));
    
    if (eventSourcesRef.current[activeChat]) {
      eventSourcesRef.current[activeChat].close();
      delete eventSourcesRef.current[activeChat];
    }
    
    setLoadingChats(prev => ({
      ...prev,
      [activeChat]: false
    }));
    
    setHasStartedResponse(false);
    
    delete pendingMessagesRef.current[activeChat];
  };

  // Clear all chats data
  const clearAllChats = () => {
    Object.values(eventSourcesRef.current).forEach(es => es.close());
    eventSourcesRef.current = {};
    
    setMessagesMap({});
    setLoadingChats({});
    setHasStartedResponse(false);
    pendingMessagesRef.current = {};
    setNewChatIds(new Set());
    setChatsToLoad(new Set());
    setUploadStatusMap({});
    const newToolState = toolStatesMap['new'] || {...defaultToolState};
    setToolStatesMap({ 'new': newToolState });
  };

  // Cleanup event sources on unmount
  useEffect(() => {
    return () => {
      Object.values(eventSourcesRef.current).forEach(es => es.close());
    };
  }, []);

  // Image generation function
  const generateImage = async (prompt: string, options: ImageOptions, chatId: string, messageId: string) => {
    if (!user?.token) return;

    try {
      setLoadingChats(prev => ({
        ...prev,
        [chatId]: true
      }));

      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('size', options.size);
      formData.append('quality', options.quality);
      formData.append('style', options.style);
      formData.append('token', user.token);
      formData.append('deployment_name', selectedModel);
      
      if (options.image) {
        formData.append('image', options.image);
      }

      const response = await fetch(`${config.apiBaseUrl}/query_image/${chatId}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const result = await response.json();

      if (result.url) {
        updateMessageInChat(chatId, messageId, {
          content: '',
          status: 'complete',
          imageResult: {
            url: result.url,
            filename: result.filename,
            timestamp: result.created,
            isVariation: options.image !== undefined
          }
        });
      } else {
        updateMessageInChat(chatId, messageId, {
          content: result.error,
          status: 'complete'
        });
      }
    } catch (error) {
      console.error('Error generating image:', error);
      updateMessageInChat(chatId, messageId, {
        content: 'Sorry, there was an error generating the image.',
        status: 'complete'
      });
    } finally {
      setLoadingChats(prev => ({
        ...prev,
        [chatId]: false
      }));
      
      delete pendingMessagesRef.current[chatId];
      
      if (newChatIds.has(chatId)) {
        setNewChatIds(prev => {
          const updated = new Set(prev);
          updated.delete(chatId);
          return updated;
        });
      }
    }
  };

  return {
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
  };
}