import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/vs.css';
import { Loader2 } from 'lucide-react';
import { Message, containsHebrew } from '../types';
import { LoadingDots } from './LoadingDots';
import { ImageResult } from './ImageResult';

// Extend the Message type to include the image generation flag
// This should ideally be defined in the types file
declare module '../types' {
  interface Message {
    isImageGeneration?: boolean;
    isUploadMessage?: boolean; // Add this flag to identify upload messages
  }
}

interface ChatMessageAssistantProps {
  message: Message;
  onCopyCode: (code: string) => void;
  onEditCode: (code: string) => void;
  showLoading?: boolean;
  minHeight?: number;
}

export function ChatMessageAssistant({ 
  message, 
  onCopyCode, 
  onEditCode, 
  showLoading = false,
  minHeight
}: ChatMessageAssistantProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentRendered, setContentRendered] = useState<string>('');
  const [initialRender, setInitialRender] = useState(true);

  // Initialize markdown renderer
  useEffect(() => {
    const renderer = new marked.Renderer();
    
    renderer.code = (code, language) => {
      const validLanguage = hljs.getLanguage(language || '') ? language : 'plaintext';
      const highlightedCode = hljs.highlight(code, { language: validLanguage || 'plaintext' }).value;
      
      return `<div class="code-block-wrapper relative"><pre class="hljs-pre" data-language="${validLanguage}"><code class="hljs language-${validLanguage}">${highlightedCode}</code></pre><div class="code-actions absolute right-2 top-2 flex gap-2 opacity-100 z-10">
        <button class="p-1 rounded bg-gray-700 hover:bg-gray-600 text-white copy-btn" title="העתק קוד">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
        <button class="p-1 rounded bg-gray-700 hover:bg-gray-600 text-white edit-btn" title="ערוך קוד">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
      </div></div>`;
    };

    renderer.codespan = (code) => {
      return `<span class="inline-code">${code}</span>`;
    };

    marked.setOptions({
      renderer: renderer,
      highlight: function(code, lang) {
        try {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
          }
          return hljs.highlightAuto(code).value;
        } catch (err) {
          console.error('Error highlighting', err);
          return code;
        }
      },
      breaks: true,
      gfm: true
    });
  }, []);

  // Process the message content with markdown when content changes
  useEffect(() => {
    const content = typeof message.content === 'string' ? message.content : '';
    
    if (content) {
      try {
        const processedContent = processRawBackticks(content);
        const htmlContent = marked(processedContent);
        setContentRendered(htmlContent);
        setInitialRender(true);
      } catch (error) {
        console.error('Error parsing markdown:', error);
        setContentRendered(`<div>${content}</div>`);
      }
    }
  }, [message.content]);

  // Add event handlers after content is rendered and mounted
  useEffect(() => {
    if (!contentRef.current || !initialRender) return;

    const timer = setTimeout(() => {
      if (!contentRef.current) return;

      const codeWrappers = contentRef.current.querySelectorAll('.code-block-wrapper');
      
      codeWrappers.forEach(wrapper => {
        wrapper.classList.add('group');
        
        const copyBtn = wrapper.querySelector('.copy-btn');
        const editBtn = wrapper.querySelector('.edit-btn');
        const codeElement = wrapper.querySelector('code');
        const code = codeElement?.textContent || '';
        
        if (copyBtn) {
          copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            onCopyCode(code);
          });
        }
        
        if (editBtn) {
          editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            onEditCode(code);
          });
        }
      });

      setInitialRender(false);
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [contentRendered, initialRender, onCopyCode, onEditCode]);

  const processRawBackticks = (content: string) => {
    let processedContent = content;
    processedContent = processedContent.replace(/`([^`\n]+)`/g, '<span class="inline-code">$1</span>');
    return processedContent;
  };

  // Basic data extraction from message
  const content = typeof message.content === 'string' ? message.content : '';
  const isHebrew = containsHebrew(content);
  const isStreaming = message.status === 'streaming';
  const containerStyle = minHeight ? { minHeight: `${minHeight}px` } : {};
  
  // Check if this is an upload message by checking the explicit flag
  const isUploadMessage = message.isUploadMessage === true;
  
  // Determine what to render based on message state
  const hasImageResult = !!message.imageResult;
  const contentAvailable = content.trim().length > 0;
  
  // Check if this is explicitly marked as an image generation request
  const isExplicitlyImageGeneration = message.isImageGeneration === true;
  
  // Only show image generation loading for messages explicitly marked
  const isImageGenerationLoading = 
    isStreaming && 
    !contentAvailable && 
    !hasImageResult && 
    !isUploadMessage &&
    isExplicitlyImageGeneration;
  
  // Show loading dots when:
  // 1. We're streaming (waiting for response)
  // 2. AND we have no content yet
  // 3. AND we're NOT in an image generation process
  // 4. OR we're handling an upload
  const showLoadingDots = 
    (isStreaming && !contentAvailable && !isImageGenerationLoading) || isUploadMessage;

  return (
    <div 
      className="max-w-3xl mx-auto assistant-message"
      style={containerStyle}
    >
      {/* Case 1: Display image generation loading UI */}
      {isImageGenerationLoading && (
        <div className="max-w-2xl mx-auto my-4">
          <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
            <div className="w-full aspect-square bg-gray-200 animate-pulse flex items-center justify-center" style={{ maxHeight: '768px' }}>
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
                <span className="text-gray-500">Generating image...</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Case 2: Display completed image result */}
      {hasImageResult && (
        <ImageResult 
          url={message.imageResult!.url}
          filename={message.imageResult!.filename}
          timestamp={message.imageResult!.timestamp}
          isVariation={message.imageResult!.isVariation || false}
        />
      )}
      
      {/* Case 3: Display regular content (when available) */}
      {contentAvailable && !isUploadMessage && (
        <div 
          className={`prose prose-lg max-w-none ${isStreaming ? 'streaming-content' : ''}`}
          dir={isHebrew ? 'rtl' : 'ltr'}
          style={{ 
            textAlign: isHebrew ? 'right' : 'left',
            wordBreak: 'break-word',
            minHeight: 'fit-content'
          }}
        >
          <div
            ref={contentRef}
            className={`markdown-content ${isStreaming ? 'streaming' : ''}`}
            dangerouslySetInnerHTML={{ __html: contentRendered }}
          />
        </div>
      )}
      
      {/* Case 4: Loading dots while waiting for regular response or file upload */}
      {showLoadingDots && (
        <div className="px-4 my-6">
          <LoadingDots />
        </div>
      )}
    </div>
  );
}