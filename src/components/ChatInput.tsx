import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Plus, Square, Loader2 } from 'lucide-react';
import { Message } from '../types';
import { KBControl, ImageControl, FileUploadsControl, ImageOptions, KnowledgeBaseOptions } from './ChatInputControls';

// Re-export these types for backward compatibility
export type { ImageOptions, KnowledgeBaseOptions };

interface ChatInputProps {
  input: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent, files?: File[], imageOptions?: ImageOptions, kbOptions?: KnowledgeBaseOptions, useOriginalFiles?: boolean) => void;
  onStop?: () => void;
  messages: Message[];
  isInitializing?: boolean;
  uploadStatus?: {
    isUploading: boolean;
    procInfo?: string; // Add support for PROC_INFO messages
  };
  chatId?: string | null;
  isImageCreatorEnabled?: boolean;
  isKnowledgeBasesEnabled?: boolean;
  registerAddFiles?: (addFilesFunc: (files: File[]) => void) => void;
  useOriginalFiles?: boolean;
  onUseOriginalFilesChange?: (checked: boolean) => void;
}

export function ChatInput({ 
  input, 
  isLoading, 
  onChange, 
  onSubmit, 
  onStop,
  messages,
  isInitializing = false,
  uploadStatus,
  chatId,
  isImageCreatorEnabled = false,
  isKnowledgeBasesEnabled = false,
  registerAddFiles,
  useOriginalFiles = false,
  onUseOriginalFilesChange
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
  const [localUseOriginalFiles, setLocalUseOriginalFiles] = useState<boolean>(false);
  
  // Determine if there's an upload in progress
  const isFileProcessing = uploadStatus?.isUploading || (uploadStatus?.procInfo !== undefined) || false;

  // Check if we have images (either in selectedFiles or as selectedImageFile)
  const hasImages = selectedFiles.some(file => file.type.startsWith('image/')) || 
                   selectedImageFile !== null ||
                   imageOptions.image !== undefined;

  // Check if we have non-image files
  const hasNonImageFiles = selectedFiles.some(file => !file.type.startsWith('image/'));

  // Register the function to handle dropped files
  useEffect(() => {
    if (registerAddFiles) {
      registerAddFiles((files: File[]) => {
        setSelectedFiles(prev => [...prev, ...files]);
      });
    }
  }, [registerAddFiles]);

  // Handle clipboard paste events
  const handlePaste = useCallback((e: ClipboardEvent) => {
    // Skip if we're in image creator mode or knowledge bases mode
    if (isImageCreatorEnabled || isKnowledgeBasesEnabled) return;
    
    // Skip if file processing is in progress
    if (isLoading || isFileProcessing) return;

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
  }, [isLoading, isImageCreatorEnabled, isKnowledgeBasesEnabled, isFileProcessing]);

  // Add paste event listener
  useEffect(() => {
    // Add global paste listener to catch paste anywhere in the chat area
    document.addEventListener('paste', handlePaste);
    
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

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
      
      // Check what content we have
      const hasText = input.trim().length > 0;
      const hasFiles = selectedFiles.length > 0;
      const hasImageContent = hasImages;
      const hasNonImageFiles = selectedFiles.some(file => !file.type.startsWith('image/'));
      
      // Check if we can submit
      const canSubmit = (hasText || hasFiles || hasImageContent) && // Have some content
                       !(hasNonImageFiles && !hasText) && // Non-image files need text
                       !(isImageCreatorEnabled && !hasText); // Image Creator needs text
      
      // Submit if conditions are met and not loading
      if (canSubmit && !isLoading && !isFileProcessing) {
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
    
    // Check what content we have
    const hasText = input.trim().length > 0;
    const hasFiles = selectedFiles.length > 0;
    const hasImageContent = hasImages;
    
    // Don't submit if there's absolutely no content
    if (!hasText && !hasFiles && !hasImageContent) return;
    
    // Don't submit if we have non-image files but no text (non-image files require text)
    if (hasNonImageFiles && !hasText) return;
    
    // Don't submit if in Image Creator mode but no text (Image Creator requires text)
    if (isImageCreatorEnabled && !hasText) return;
    
    // Don't submit during loading or file processing
    if (isLoading || isFileProcessing) return;

    const files = selectedFiles.length > 0 ? [...selectedFiles] : undefined;
    
    // Prepare options based on active tool
    if (isImageCreatorEnabled) {
      onSubmit(e, undefined, imageOptions, undefined, localUseOriginalFiles);
    } else if (isKnowledgeBasesEnabled) {
      const kbOptions: KnowledgeBaseOptions = {
        kbName: selectedKb
      };
      onSubmit(e, undefined, undefined, kbOptions, localUseOriginalFiles);
    } else {
      onSubmit(e, files, undefined, undefined, localUseOriginalFiles);
    }
    
    // Clear selected files and reset checkbox
    setSelectedFiles([]);
  };

  // Determine the upload status text to display
  const uploadStatusText = (() => {
    if (isImageCreatorEnabled) return "";
    
    // Handle PROC_INFO messages first
    if (uploadStatus?.procInfo !== undefined) {
      return uploadStatus.procInfo; // Could be empty string to clear the message
    }
    
    if (uploadStatus?.isUploading) {
      return "The documents are uploading...";
    }
    
    // No longer showing indexing status since we don't index files anymore
    
    return "";
  })();

  // Check what content we have for submit button state
  const hasText = input.trim().length > 0;
  const hasFiles = selectedFiles.length > 0;
  const hasImageContent = hasImages;

  // This controls whether the submit button should be disabled
  const isSubmitDisabled = (
    (!hasText && !hasFiles && !hasImageContent) || // Need some content
    (hasNonImageFiles && !hasText) || // Non-image files need text
    (isImageCreatorEnabled && !hasText) || // Image Creator needs text
    isLoading ||
    isFileProcessing
  );

  // Sync local state with prop - improved version
  useEffect(() => {
    setLocalUseOriginalFiles(useOriginalFiles || false);
  }, [useOriginalFiles, chatId]);

  return (
    <div className={`flex-none bg-gradient-to-t from-white via-white pb-8`}>
      <form ref={formRef} onSubmit={handleSubmit} className="relative w-full max-w-[50rem] mx-auto">
        <div className="relative rounded-3xl border border-gray-300 shadow-[0px_5px_5px_rgba(0,0,0,0.06)] bg-white">
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
            disabled={isLoading || isFileProcessing} // Disable input during loading or file processing
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
                    disabled={isLoading || isFileProcessing}
                    multiple
                  />
                  <div className="tooltip-wrapper upload-button">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors border border-gray-200 ml-2"
                      disabled={isLoading || isFileProcessing}
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
                  disabled={isLoading || isFileProcessing}
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
                  disabled={isLoading || isFileProcessing}
                />
              )}
              
              {/* Checkbox for sending original files - only shown when there are non-image files and no processing */}
              {hasNonImageFiles && !isFileProcessing && !isImageCreatorEnabled && !isKnowledgeBasesEnabled && (
                <label className="flex items-center gap-2 text-sm text-gray-600 ml-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localUseOriginalFiles}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setLocalUseOriginalFiles(newValue);
                      if (onUseOriginalFilesChange) {
                        onUseOriginalFilesChange(newValue);
                      }
                    }}
                    className="simple-checkbox cursor-pointer"
                    disabled={isLoading}
                  />
                  Use original (unindexed) files
                </label>
              )}
              
              {uploadStatusText && (
                <span className="text-sm text-gray-500 ml-2">{uploadStatusText}</span>
              )}
              
              <button
                type="button"
                onClick={isLoading ? onStop : handleSubmit}
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