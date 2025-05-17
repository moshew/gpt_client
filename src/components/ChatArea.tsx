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
  const [lastAssistantMinHeight, setLastAssistantMinHeight] = useState(0);

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
      // Reset scroll position when chat changes
      if (activeChat !== previousActiveChatRef.current || messages.length === 0) {
        chatElement.scrollTop = 0;
        hideHeaderSeparator();
      }
      
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

  // Use useLayoutEffect only for chat switching - use immediate scrolling
  useLayoutEffect(() => {
    // Reset separator when active chat changes
    if (activeChat !== previousActiveChatRef.current) {
      hideHeaderSeparator();
      if (chatRef.current) {
        chatRef.current.scrollTop = 0;
      }
      //scrollToBottom(true);
      previousActiveChatRef.current = activeChat;
      previousMessagesLengthRef.current = messages.length;
    } 
    // For message length changes in the same chat, just update the ref
    else if (messages.length !== previousMessagesLengthRef.current) {
      previousMessagesLengthRef.current = messages.length;
    }
  }, [messages, activeChat]);

  // Handle auto-scrolling based on new messages - with smooth animation
  useEffect(() => {
    if (!isUserScrollingRef.current && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const shouldAutoScroll = 
        lastMessage?.role === 'user' || 
        (lastMessage?.status === 'streaming' && lastMessage.content === '') ||
        isLoading;
      
      if (shouldAutoScroll) {
        setTimeout(() => {
          scrollToBottom(false);
        }, 0);
      }
    }
    
    return () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages, isLoading]);

  useEffect(() => {
    const calculateMinHeight = () => {
      if (!chatRef.current || messages.length === 0 || !isLoading) return;
      
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
  
  // Don't render anything if there are no messages to allow ChatInput to center
  if (messages.length === 0 && !isLoading) {
    // Important: Make sure separator is hidden for empty chat
    hideHeaderSeparator();
    return <div ref={chatRef} className="flex-1 overflow-y-auto min-h-0"></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0" ref={chatRef}>
      <div className="max-w-3xl mx-auto w-full px-4">
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