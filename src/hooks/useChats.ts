import { useState, useEffect } from 'react';
import { Chat, ServerChat, User, ChatDataResponse, ChatFile } from '../types';
import config from '../config';

// Maximum number of chats to display
const MAX_CHATS = 10;

export function useChats(user: User | null) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState<Record<string, boolean>>({});
  // Add a new state to track which chats have data loaded by useMessages
  const [chatsWithDataLoaded, setChatsWithDataLoaded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchChats = async () => {
      if (!user?.token) return;

      try {
        const response = await fetch(`${config.apiBaseUrl}/chats`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch chats');
        }

        const serverChats = (await response.json())["chats"];
        let formattedChats: Chat[] = serverChats.map((server_chat: ServerChat) => ({
          id: server_chat.id,
          title: server_chat.name || 'New Chat',
          messages: [],
          files: [],
          createdAt: new Date(server_chat.created_at || Date.now())
        }));
        
        // Sort chats by creation date (newest first)
        formattedChats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        // Limit to MAX_CHATS
        if (formattedChats.length > MAX_CHATS) {
          formattedChats = formattedChats.slice(0, MAX_CHATS);
        }
        
        setChats(formattedChats);
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
    };

    fetchChats();
  }, [user]);

  // Modified useEffect to prevent invalid chatId calls and safely handle activeChat
  useEffect(() => {
    if (
      activeChat && 
      typeof activeChat === 'string' && 
      activeChat.trim() !== '' && 
      user?.token && 
      !loadingFiles[activeChat] && 
      !chatsWithDataLoaded.has(activeChat)
    ) {
      fetchChatFiles(activeChat);
    }
  }, [activeChat, user, loadingFiles, chatsWithDataLoaded]);
  
  const fetchChatFiles = async (chatId: string) => {
    if (!user?.token) {
      console.error('Cannot fetch chat files: No API key available');
      return;
    }
    
    if (!chatId || typeof chatId !== 'string' || chatId.trim() === '') {
      console.error('Invalid chatId:', chatId);
      return;
    }
  
    if (loadingFiles[chatId]) {
      console.log(`Files already being loaded for chat ${chatId}`);
      return;
    }
    
    setLoadingFiles(prev => ({ ...prev, [chatId]: true }));
    
    try {
      const response = await fetch(`${config.apiBaseUrl}/chat_data/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Accept': 'application/json'
        }
      });
  
      if (!response.ok) {
        const statusText = response.statusText;
        const status = response.status;
        throw new Error(`Server responded with status ${status} (${statusText})`);
      }
  
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON response but got ${contentType}`);
      }
  
      const data: ChatDataResponse = await response.json();
      const docFiles = data.docs?.files || [];
      const codeFiles = data.code || [];
      const keepOriginalFiles = data.docs?.keep_original_files || false;
      
      // Update chat with both doc_files and code_files and keep_original_files
      updateChatFiles(chatId, docFiles, codeFiles, keepOriginalFiles);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error loading files for chat ${chatId}:`, errorMessage);
      
      // Clear any existing files for this chat to prevent stale data
      updateChatFiles(chatId, [], [], false);
    } finally {
      setLoadingFiles(prev => ({ ...prev, [chatId]: false }));
    }
  };

  const createNewChat = async (): Promise<Chat | null> => {
    if (!user?.token || isCreatingChat) return null;

    setIsCreatingChat(true);

    try {
      const response = await fetch(`${config.apiBaseUrl}/new_chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create chat: ${errorData}`);
      }

      let serverChat: ServerChat;
      try {
        const responseData = await response.json();
        serverChat = responseData;
      } catch (parseError) {
        console.error('Error parsing server response:', parseError);
        throw new Error('Invalid server response format');
      }

      if (!serverChat || !serverChat.id) {
        throw new Error('Invalid chat data received from server');
      }

      const newChat: Chat = {
        id: serverChat.id,
        title: serverChat.name || 'New Chat',
        messages: [],
        createdAt: new Date()
      };

      setChats(prev => {
        // Add new chat to the beginning of the array
        const updatedChats = [newChat, ...prev];
        
        // Limit to MAX_CHATS
        if (updatedChats.length > MAX_CHATS) {
          // Remove the oldest chat
          return updatedChats.slice(0, MAX_CHATS);
        }
        
        return updatedChats;
      });
      return newChat;
    } catch (error) {
      console.error('Error creating new chat:', error);
      return null;
    } finally {
      setIsCreatingChat(false);
    }
  };

  const updateChatName = async (chatId: string, message: string): Promise<boolean> => {
    if (!user?.token) return false;

    try {
      const response = await fetch(`${config.apiBaseUrl}/update_chat_name`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
          message: message
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update chat name');
      }

      const data = await response.json();
      
      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, title: data.name || chat.title }
          : chat
      ));

      return true;
    } catch (error) {
      console.error('Error updating chat name:', error);
      return false;
    }
  };

  const updateChatFiles = (chatId: string, docFiles?: ChatFile[], codeFiles?: ChatFile[], keepOriginalFiles?: boolean) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const updatedChat = {
          ...chat,
          docFiles: docFiles || [],
          codeFiles: codeFiles || [],
          keepOriginalFiles: keepOriginalFiles || false
        };
        
        return updatedChat;
      }
      return chat;
    }));
  };

  const deleteChat = async (chatId: string): Promise<boolean> => {
    if (!user?.token) return false;

    try {
      const response = await fetch(`${config.apiBaseUrl}/delete_chat/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      setChats(prev => prev.filter(chat => chat.id !== chatId));
      if (activeChat === chatId) {
        setActiveChat(null);
      }

      return true;
    } catch (error) {
      console.error('Error deleting chat:', error);
      return false;
    }
  };

  const clearChats = () => {
    setChats([]);
    setActiveChat(null);
    setLoadingFiles({});
    setChatsWithDataLoaded(new Set());
  };

  // Add a function to be called by useMessages when chat data is loaded
  const handleChatDataLoaded = (
    chatId: string, 
    docFiles?: ChatFile[], 
    codeFiles?: ChatFile[],
    keepOriginalFiles?: boolean
  ) => {
    updateChatFiles(chatId, docFiles, codeFiles, keepOriginalFiles);
    setChatsWithDataLoaded(prev => {
      const updated = new Set(prev);
      updated.add(chatId);
      return updated;
    });
  };

  return {
    chats,
    activeChat,
    setActiveChat,
    createNewChat,
    updateChatName,
    updateChatFiles,
    deleteChat,
    clearChats,
    isCreatingChat,
    loadingFiles,
    handleChatDataLoaded
  };
}