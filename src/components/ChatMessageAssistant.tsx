import React, { useEffect, useRef, useState, useMemo } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/vs.css';
import { Loader2, Maximize2, X, Download } from 'lucide-react';
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

// פורמט של תמונה ב-JSON
interface ImageData {
  type: 'image';
  data?: string;      // נתוני base64 (ללא הקידומת data:image/...)
  format?: string;   // פורמט התמונה (png, jpeg, וכו'), ברירת מחדל: png
  alt?: string;      // טקסט חלופי לתמונה, אופציונלי
  // New format for URL-based images
  url?: string;      // URL של התמונה
  filename?: string; // שם הקובץ
  created?: string;  // תאריך יצירה
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
  const [showFullImage, setShowFullImage] = useState(false);

  // Memoize image parsing to prevent flickering - do this FIRST
  const imageInfo = useMemo(() => {
    // Early return if no content
    if (!message.content) {
      return {
        isImage: false,
        imageData: null,
        imageUrl: ''
      };
    }

    try {
      const data = JSON.parse(message.content);
      
      if (data && data.type === 'image') {
        const imageData = data as ImageData;
        
        // יצירת URL לתמונה - תמיכה בשני פורמטים
        let imageUrl = '';
        
        // פורמט חדש - URL ישיר
        if (imageData.url) {
          imageUrl = imageData.url;
        }
        // פורמט ישן - base64 data
        else if (imageData.data) {
          if (imageData.data.startsWith('data:image/')) {
            imageUrl = imageData.data;
          } else {
            const format = imageData.format || 'png';
            imageUrl = `data:image/${format};base64,${imageData.data}`;
          }
        }
        
        if (imageUrl) {
          return {
            isImage: true,
            imageData,
            imageUrl
          };
        }
      }
    } catch (e) {
      // Not an image or invalid JSON
    }
    
    return {
      isImage: false,
      imageData: null,
      imageUrl: ''
    };
  }, [message.content]);
  
  const { isImage, imageData, imageUrl } = imageInfo;

  // Only initialize these states if NOT an image
  const [contentRendered, setContentRendered] = useState<string>('');
  const [initialRender, setInitialRender] = useState(!isImage);

  // Function to download image
  const handleDownloadImage = async () => {
    if (!imageUrl || !imageData?.filename) return;
    
    try {
      // For base64 images
      if (imageUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = imageData.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } 
      // For URL images
      else {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = imageData.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showFullImage) {
        setShowFullImage(false);
      }
    };

    if (showFullImage) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showFullImage]);

  // Initialize markdown renderer
  useEffect(() => {
    const renderer = new marked.Renderer();
    
    renderer.code = (code: string, language?: string) => {
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

    renderer.codespan = (code: string) => {
      return `<span class="inline-code">${code}</span>`;
    };

    marked.setOptions({
      renderer: renderer,
      breaks: true,
      gfm: true
    });
  }, []);

  // Process content when message changes
  useEffect(() => {
    const processContent = async () => {
      // Skip markdown processing if this is an image
      if (!message.content || isImage) {
        setContentRendered('');
        return;
      }
      
      try {
        const processed = await marked(message.content);
        setContentRendered(processed);
      } catch (error) {
        console.error('Error processing markdown:', error);
        setContentRendered(message.content);
      }
    };

    processContent();
  }, [message.content, isImage]);

  // Add event handlers after content is rendered and mounted
  useEffect(() => {
    // Skip event handlers for images
    if (!contentRef.current || isImage) return;

    const timer = setTimeout(() => {
      if (!contentRef.current || isImage) return;

      // Remove existing event listeners first
      const existingWrappers = contentRef.current.querySelectorAll('.code-block-wrapper');
      existingWrappers.forEach(wrapper => {
        const copyBtn = wrapper.querySelector('.copy-btn');
        const editBtn = wrapper.querySelector('.edit-btn');
        
        if (copyBtn) {
          copyBtn.replaceWith(copyBtn.cloneNode(true));
        }
        if (editBtn) {
          editBtn.replaceWith(editBtn.cloneNode(true));
        }
      });

      // Add new event listeners
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
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [contentRendered, onCopyCode, onEditCode, isImage]);

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
    <>
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
        
        {/* Case 3: Display JSON image content */}
        {isImage && imageUrl && (
          <div className="max-w-2xl mx-auto my-4">
            <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
              <img 
                src={imageUrl} 
                alt={imageData?.alt || imageData?.filename || 'Assistant image'} 
                className="w-full object-contain cursor-pointer" 
                style={{ maxHeight: '768px' }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowFullImage(true);
                }}
              />
              <div className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">
                      {imageData?.created || 'Image'}
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadImage}
                    className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                    title="הורד תמונה"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Case 4: Display regular content (when available and not an image) */}
        {contentAvailable && !isUploadMessage && !isImage && (
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
        
        {/* Case 5: Loading dots while waiting for regular response or file upload */}
        {showLoadingDots && (
          <div className="px-4 my-6">
            <LoadingDots />
          </div>
        )}
      </div>

      {/* תצוגת תמונה בגודל מלא */}
      {showFullImage && isImage && imageUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            setShowFullImage(false);
          }}
        >
          <div 
            className="relative max-w-[90vw] max-h-[90vh] overflow-auto"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <img 
              src={imageUrl} 
              alt={imageData?.alt || imageData?.filename || 'Full size preview'} 
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              className="absolute top-2 right-2 bg-white bg-opacity-80 p-1 rounded-full text-gray-800 hover:bg-opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setShowFullImage(false);
              }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}