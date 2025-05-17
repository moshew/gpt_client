import React, { useRef, useEffect, useState } from 'react';
import { Send, Plus, Square, Loader2 } from 'lucide-react';
import { Message } from '../types';
import { KBControl, ImageControl, FileUploadsControl, ImageOptions, KnowledgeBaseOptions } from './ChatInputControls';

// Re-export these types for backward compatibility
export type { ImageOptions, KnowledgeBaseOptions };

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent, files?: File[], imageOptions?: ImageOptions, kbOptions?: KnowledgeBaseOptions) => void;
  onStop?: () => void;
  messages: Message[];
  isInitializing?: boolean;
  uploadStatus?: {
    isUploading: boolean;
    isIndexing: boolean;
    error?: string;
  };
  chatId?: string | null;
  isImageCreatorEnabled?: boolean;
  isKnowledgeBasesEnabled?: boolean;
  registerAddFiles?: (addFilesFunc: (files: File[]) => void) => void;
}

export function ChatInput({ 
  input, 
  isLoading, 
  onChange, 
  onSubmit, 
  onStop,
  messages,
  isInitializing = false,
  uploadStatus = { isUploading: false, isIndexing: false },
  chatId,
  isImageCreatorEnabled = false,
  isKnowledgeBasesEnabled = false,
  registerAddFiles
}: ChatInputProps) {
  const showHelpText = messages.length === 0 && !isInitializing;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imageOptions, setImageOptions] = useState<ImageOptions>({
    size: "1024x1024",
    quality: "standard",
    style: "natural"
  });
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedKb, setSelectedKb] = useState<string>("e-cix");
  
  // Define isFileProcessing at the top of the component
  const isFileProcessing = chatId !== null && (uploadStatus.isUploading || uploadStatus.isIndexing);

  // Register the function to handle dropped files
  useEffect(() => {
    if (registerAddFiles) {
      registerAddFiles((files: File[]) => {
        setSelectedFiles(prev => [...prev, ...files]);
      });
    }
  }, [registerAddFiles]);

  // Handle clipboard paste events
  const handlePaste = (e: ClipboardEvent) => {
    // Skip if we're in image creator mode or knowledge bases mode
    if (isImageCreatorEnabled || isKnowledgeBasesEnabled) return;
    
    // Skip if file processing is in progress
    if (isFileProcessing) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const fileItems: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Check if item is a file
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          fileItems.push(file);
        }
      }
    }

    // Add the pasted files to the selected files
    if (fileItems.length > 0) {
      setSelectedFiles(prev => [...prev, ...fileItems]);
      e.preventDefault(); // Prevent default paste behavior if we handled files
    }
  };

  // Add paste event listener
  useEffect(() => {
    // Add global paste listener to catch paste anywhere in the chat area
    document.addEventListener('paste', handlePaste);
    
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isFileProcessing, isImageCreatorEnabled, isKnowledgeBasesEnabled]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 56), 224);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim() || selectedFiles.length > 0) && !isFileProcessing && !isLoading) {
        handleSubmit(e);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
    // Reset the input value so the same files can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedImageFile(files[0]);
      setImageOptions(prev => ({
        ...prev,
        image: files[0]
      }));
    }
    // Reset the input value so the same file can be selected again
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveImageFile = () => {
    setSelectedImageFile(null);
    setImageOptions(prev => {
      const newOptions = {...prev};
      delete newOptions.image;
      return newOptions;
    });
  };

  const handleOptionChange = (option: keyof ImageOptions, value: string) => {
    setImageOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const handleKbChange = (kbName: string) => {
    setSelectedKb(kbName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't submit if there's no input, no files, if we're already loading, or if a response is being generated
    if (
      (!input.trim() && selectedFiles.length === 0 && !isImageCreatorEnabled) || 
      (!input.trim() && isImageCreatorEnabled) || 
      isFileProcessing ||
      isLoading  // Add this check to prevent submission while a response is being generated
    ) return;

    const files = selectedFiles.length > 0 ? [...selectedFiles] : undefined;
    
    // Prepare options based on active tool
    if (isImageCreatorEnabled) {
      onSubmit(e, undefined, imageOptions);
    } else if (isKnowledgeBasesEnabled) {
      const kbOptions: KnowledgeBaseOptions = {
        kbName: selectedKb
      };
      onSubmit(e, undefined, undefined, kbOptions);
    } else {
      onSubmit(e, files);
    }
    
    // Clear selected files
    setSelectedFiles([]);
  };

  // Check if a file upload is in progress for the current chat
  // This declaration was moved to the top of the component
  // const isFileProcessing = chatId !== null && (uploadStatus.isUploading || uploadStatus.isIndexing);

  // Determine the upload status text to display
  const uploadStatusText = !isImageCreatorEnabled && uploadStatus.isUploading 
    ? "The documents are uploading..." 
    : !isImageCreatorEnabled && uploadStatus.isIndexing 
      ? "Indexing uploaded documents..." 
      : "";

  // This controls whether the submit button should be disabled
  // Important: We're keeping the input field enabled, but controlling only the submit button
  const isSubmitDisabled = (
    !input.trim() || // Always require text input
    isFileProcessing ||
    isLoading
  );

  return (
    <div className={`flex-none bg-gradient-to-t from-white via-white pb-8`}>
      <form 
        ref={formRef}
        onSubmit={handleSubmit} 
        className="relative w-full max-w-[50rem] mx-auto"
      >
        <div className="relative rounded-2xl shadow-[0_0_15px_rgba(0,0,0,0.1)] bg-white">
          {/* File Uploads (only shown when neither Image Creator nor Knowledge Bases is enabled) */}
          {selectedFiles.length > 0 && !isImageCreatorEnabled && !isKnowledgeBasesEnabled && (
            <FileUploadsControl 
              selectedFiles={selectedFiles}
              onRemoveFile={handleRemoveFile}
              isFileProcessing={isFileProcessing}
            />
          )}
          
          {/* Image Creator file preview */}
          {isImageCreatorEnabled && selectedImageFile && (
            <ImageControl 
              options={imageOptions}
              onOptionChange={handleOptionChange}
              selectedImageFile={selectedImageFile}
              onRemoveImageFile={handleRemoveImageFile}
              disabled={isLoading || isFileProcessing}
            />
          )}
          
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isImageCreatorEnabled ? "Describe the image you want to create..." : "Ask anything"}
            className="w-full px-4 py-4 border-0 bg-transparent focus:outline-none focus:ring-0 text-lg resize-none overflow-y-auto"
            disabled={isFileProcessing || isLoading} // Disable input during loading or file processing
            dir="auto"
            rows={1}
            style={{
              minHeight: '56px',
              maxHeight: '224px'
            }}
          />
          <div className="p-2">
            <div className="flex items-center gap-2">
              {!isImageCreatorEnabled && !isKnowledgeBasesEnabled && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.zip,.tar,.gz,.rar,.7z" // Added archive file extensions
                    disabled={isFileProcessing}
                    multiple
                  />
                  <div className="tooltip-wrapper upload-button">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors border border-gray-200 ml-2"
                      disabled={isFileProcessing}
                    >
                      {isFileProcessing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                    </button>
                    <div className="tooltip">Upload documents</div>
                  </div>
                </>
              )}
              
              {/* Image upload button - hidden but functional */}
              {isImageCreatorEnabled && (
                <input
                  ref={imageFileInputRef}
                  type="file"
                  onChange={handleImageFileSelect}
                  className="hidden"
                  accept="image/*"
                  disabled={isLoading}
                />
              )}
              
              {/* Image Creator options - only visible when the tool is enabled */}
              {isImageCreatorEnabled && !selectedImageFile && (
                <ImageControl 
                  options={imageOptions}
                  onOptionChange={handleOptionChange}
                  selectedImageFile={null}
                  onRemoveImageFile={() => {}}
                  disabled={isLoading || isFileProcessing}
                />
              )}
              
              {/* Knowledge Base ComboBox - only visible when the tool is enabled */}
              {isKnowledgeBasesEnabled && (
                <KBControl 
                  selectedKb={selectedKb} 
                  onChange={handleKbChange}
                  disabled={isLoading}
                />
              )}
              
              {uploadStatusText && (
                <span className="text-sm text-gray-500 ml-2">{uploadStatusText}</span>
              )}
              <button
                type="button"
                onClick={isLoading && !uploadStatus.isIndexing ? onStop : handleSubmit}
                disabled={!isLoading && isSubmitDisabled} // Only disable when NOT loading and submission conditions aren't met
                className="ml-auto mr-2 p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Square className="w-5 h-5 text-red-500" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}