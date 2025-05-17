import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/vs.css';
import { Copy, Edit } from 'lucide-react';
import { Message, containsHebrew } from '../types';

interface ChatMessageProps {
  message: Message;
  onCopyCode: (code: string) => void;
  onEditCode: (code: string) => void;
}

export function ChatMessage({ message, onCopyCode, onEditCode }: ChatMessageProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentRendered, setContentRendered] = useState<string>('');
  const [initialRender, setInitialRender] = useState(true);

  // Initialize markdown renderer once
  useEffect(() => {
    const renderer = new marked.Renderer();
    
    renderer.code = (code, language) => {
      const validLanguage = hljs.getLanguage(language || '') ? language : 'plaintext';
      const highlightedCode = hljs.highlight(code, { language: validLanguage || 'plaintext' }).value;
      
      return `<div class="code-block-wrapper relative"><pre class="hljs-pre" data-language="${validLanguage}"><code class="hljs language-${validLanguage}">${highlightedCode}</code></pre><div class="code-actions absolute right-2 top-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
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

  // Render content when message changes
  useEffect(() => {
    if (typeof message.content !== 'string') {
      console.error('Invalid content type:', message.content);
      return;
    }

    if (message.role === 'assistant') {
      try {
        const processedContent = processRawBackticks(message.content);
        const htmlContent = marked(processedContent);
        setContentRendered(htmlContent);
        setInitialRender(true); // Mark as needing initialization
      } catch (error) {
        console.error('Error parsing markdown:', error);
        setContentRendered(`<div>${message.content}</div>`);
      }
    }
  }, [message.content, message.role]);

  // Add event handlers after content is rendered and mounted
  useEffect(() => {
    if (!contentRef.current || message.role !== 'assistant' || !initialRender) return;

    // Add a slight delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      if (!contentRef.current) return;

      const codeWrappers = contentRef.current.querySelectorAll('.code-block-wrapper');
      
      codeWrappers.forEach(wrapper => {
        // Add hover class to wrapper for easier targeting
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

      setInitialRender(false); // Mark as initialized
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [contentRendered, initialRender, message.role, onCopyCode, onEditCode]);

  const processRawBackticks = (content: string) => {
    let processedContent = content;
    processedContent = processedContent.replace(/`([^`\n]+)`/g, '<span class="inline-code">$1</span>');
    return processedContent;
  };

  const renderUserContent = () => {
    return message.content.split('\n').map((line, index, array) => (
      <React.Fragment key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const isHebrew = containsHebrew(message.content);
  const isStreaming = message.status === 'streaming';

  return (
    <div>
      <div className={`max-w-3xl mx-auto ${message.role === 'user' ? 'flex justify-end' : ''}`}>
        <div 
          className={`prose prose-lg max-w-none ${
            message.role === 'user' 
              ? 'bg-gray-100 rounded-2xl p-4 inline-block text-lg user-message'
              : ''
          } ${isStreaming ? 'streaming-content' : ''}`}
          dir={isHebrew ? 'rtl' : 'ltr'}
          style={{ 
            textAlign: isHebrew ? 'right' : 'left',
            whiteSpace: message.role === 'user' ? 'pre-wrap' : 'normal',
            wordBreak: 'break-word',
            minHeight: 'fit-content'
          }}
        >
          {message.role === 'user' ? (
            renderUserContent()
          ) : (
            <div
              ref={contentRef}
              className={`markdown-content ${isStreaming ? 'streaming' : ''}`}
              dangerouslySetInnerHTML={{ __html: contentRendered }}
            />
          )}
        </div>
      </div>
    </div>
  );
}