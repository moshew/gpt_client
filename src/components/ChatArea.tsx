import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { Message } from '../types';
import { ChatMessageUser } from './ChatMessageUser';
import { ChatMessageAssistant } from './ChatMessageAssistant';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  onCopyCode: (code: string) => void;
  onEditCode: (code: string) => void;
  activeChat: string | null;
}

export function ChatArea({ 
  messages, 
  isLoading, 
  onCopyCode, 
  onEditCode, 
  activeChat
}: ChatAreaProps) {
  const chatRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const lastUserScrollRef = useRef<number>(0);
  const isUserScrollingRef = useRef(false);
  const previousMessagesLengthRef = useRef(messages.length);
  const previousActiveChatRef = useRef(activeChat);
  const previousMessagesLengthForScrollRef = useRef(messages.length);
  const previousActiveChatForScrollRef = useRef(activeChat);
  const [lastAssistantMinHeight, setLastAssistantMinHeight] = useState(0);
  const [isContentVisible, setIsContentVisible] = useState(false);

  // Function to hide header separator
  const hideHeaderSeparator = () => {
    const separator = document.getElementById('header-separator');
    if (separator) {
      separator.style.opacity = '0';
    }
  };

  // Reset header separator when messages are empty or chat changes
  useEffect(() => {
    if (messages.length === 0 || activeChat === null) {
      hideHeaderSeparator();
    }
  }, [messages.length, activeChat]);

  // Control content visibility to prevent flickering
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setIsContentVisible(true);
      }, 0);
      return () => clearTimeout(timer);
    } else {
      setIsContentVisible(false);
    }
  }, [messages.length, activeChat]);

  // Hide header separator for empty state
  useEffect(() => {
    if (messages.length === 0 && !isLoading) {
      hideHeaderSeparator();
    }
  }, [messages.length, isLoading]);

  // Handle scroll events and header separator opacity
  useEffect(() => {
    const handleScroll = () => {
      const separator = document.getElementById('header-separator');
      if (separator && chatRef.current) {
        // Only show separator if we have messages and scrolled down
        if (messages.length > 0 && chatRef.current.scrollTop > 0) {
          separator.style.opacity = '1';
        } else {
          separator.style.opacity = '0';
        }
      }

      if (chatRef.current) {
        lastUserScrollRef.current = chatRef.current.scrollTop;
        isUserScrollingRef.current = true;
        
        setTimeout(() => {
          isUserScrollingRef.current = false;
        }, 100);
      }
    };

    const chatElement = chatRef.current;
    if (chatElement) {
      chatElement.addEventListener('scroll', handleScroll);
      return () => chatElement.removeEventListener('scroll', handleScroll);
    }
  }, [messages.length, activeChat]);

  const scrollToBottom = (immediate = false) => {
    if (chatRef.current) {
      const endPosition = chatRef.current.scrollHeight - chatRef.current.clientHeight;
      
      chatRef.current.scrollTo({
        top: endPosition,
        behavior: immediate ? 'auto' : 'smooth'
      });
    }
  };

  // Track chat changes for reference updates only
  useEffect(() => {
    if (activeChat !== previousActiveChatRef.current) {
      hideHeaderSeparator();
      previousActiveChatRef.current = activeChat;
      previousMessagesLengthRef.current = messages.length;
    } 
    else if (messages.length !== previousMessagesLengthRef.current) {
      previousMessagesLengthRef.current = messages.length;
    }
  }, [messages, activeChat]);

  // Handle auto-scrolling only for new user messages and streaming responses
  useEffect(() => {
    if (!isUserScrollingRef.current && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const messagesLengthChanged = messages.length !== previousMessagesLengthForScrollRef.current;
      const activeChatChanged = activeChat !== previousActiveChatForScrollRef.current;
      const wasEmpty = previousMessagesLengthForScrollRef.current === 0;
      
      // Only auto-scroll for:
      // New assistant messages (when messages length changed and last message is assistant and chat didn't change and wasn't loading from empty)
      const shouldAutoScroll = 
        (messagesLengthChanged && !activeChatChanged && !wasEmpty && lastMessage?.role === 'assistant');
      
      if (shouldAutoScroll) {
        setTimeout(() => {
          scrollToBottom(false);
        }, 0);
      }
    }
    
    // עדכון ה-refs אחרי הבדיקה
    previousMessagesLengthForScrollRef.current = messages.length;
    previousActiveChatForScrollRef.current = activeChat;
    
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages, isLoading, activeChat]);

  useEffect(() => {
    const calculateMinHeight = () => {
      if (!chatRef.current || messages.length === 0) return;
      
      const headerElement = document.querySelector('header');
      const chatInputElement = document.querySelector('form');
      const userMessages = document.querySelectorAll('.user-message');
      const assistantMessages = document.querySelectorAll('.assistant-message');
      const lastUserMessage = userMessages[userMessages.length - 1];
      const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
      
      if (!headerElement || !chatInputElement) return;
      
      const headerHeight = headerElement.getBoundingClientRect().height;
      const chatInputHeight = 120;
      const lastUserMessageHeight = lastUserMessage ? lastUserMessage.getBoundingClientRect().height : 0;
      const lastAssistantMessageHeight = lastAssistantMessage ? lastAssistantMessage.getBoundingClientRect().height : 0;
      const padding = 70;

      const availableHeight = window.innerHeight - headerHeight - chatInputHeight - lastUserMessageHeight - padding;
      setLastAssistantMinHeight(Math.max(availableHeight, 0));
    };
    
    calculateMinHeight();
    
    window.addEventListener('resize', calculateMinHeight);
    
    return () => {
      window.removeEventListener('resize', calculateMinHeight);
    };
  }, [messages]);
  
  // Check if we should display loading dots in the last assistant message
  const shouldShowLoadingDots = isLoading && messages.length > 0 && !messages[messages.length - 1]?.content;
  
  // Always render the chat container to maintain consistent DOM structure
  return (
    <div 
      className="flex-1 min-h-0 chat-area-scroll" 
      ref={chatRef}
    >
      <div 
        className="max-w-3xl mx-auto w-full px-4 transition-opacity duration-10"
        style={{ 
          opacity: isContentVisible ? 1 : 0,
          minHeight: '100%'
        }}
      >
        {messages.map((message) => (
          message.role === 'user' ? (
            <ChatMessageUser
              key={message.id}
              message={message}
            />
          ) : (
            <ChatMessageAssistant
              key={message.id}
              message={message}
              onCopyCode={onCopyCode}
              onEditCode={onEditCode}
              showLoading={shouldShowLoadingDots && message === messages[messages.length - 1] && !message.content}
              minHeight={message === messages[messages.length - 1] ? lastAssistantMinHeight : undefined}
            />
          )
        ))}
      </div>
    </div>
  );
}