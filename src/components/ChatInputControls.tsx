import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Database, X, Maximize2 } from 'lucide-react';

// ======= Knowledge Base Control =======
export interface KnowledgeBaseOptions {
  kbName: string;
}

interface KBControlProps {
  selectedKb: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function KBControl({ 
  selectedKb, 
  onChange,
  disabled = false
}: KBControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  // List of available knowledge bases - can be expanded later
  const knowledgeBases = [
    { id: 'e-cix', name: 'E-CIX' }
  ];

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (kbId: string) => {
    onChange(kbId);
    setIsOpen(false);
  };

  return (
    <div className="relative ml-2">
      <button
        type="button"
        onClick={toggleDropdown}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
          ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
        `}
        disabled={disabled}
      >
        <Database className="w-4 h-4" />
        <span>{knowledgeBases.find(kb => kb.id === selectedKb)?.name || 'Select Knowledge Base'}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-1 left-0 w-52 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
          {knowledgeBases.map(kb => (
            <button
              key={kb.id}
              className={`
                w-full text-left px-4 py-2 text-sm hover:bg-gray-100
                ${selectedKb === kb.id ? 'font-medium bg-gray-50' : ''}
              `}
              onClick={() => handleSelect(kb.id)}
            >
              {kb.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ======= Image Control =======
export interface ImageOptions {
  size: string;
  quality: string;
  style: string;
  image?: File;
}

interface ImageControlProps {
  options: ImageOptions;
  onOptionChange: (option: keyof ImageOptions, value: string) => void;
  selectedImageFile: File | null;
  onRemoveImageFile: () => void;
  disabled?: boolean;
}

export function ImageControl({
  options,
  onOptionChange,
  selectedImageFile,
  onRemoveImageFile,
  disabled = false
}: ImageControlProps) {
  // Size options for DALL-E 3
  const sizeOptions = [
    { value: "1024x1024", label: "Square (1024×1024)" },
    { value: "1792x1024", label: "Landscape (1792×1024)" },
    { value: "1024x1792", label: "Portrait (1024×1792)" }
  ];

  // Quality options for DALL-E 3
  const qualityOptions = [
    { value: "standard", label: "Standard" },
    { value: "hd", label: "HD" }
  ];

  // Style options for DALL-E 3
  const styleOptions = [
    { value: "natural", label: "Natural" },
    { value: "vivid", label: "Vivid" }
  ];

  return (
    <>
      {selectedImageFile && (
        <div className="px-4 pt-3">
          <div className="file-chip flex items-center justify-between p-2 bg-gray-100 rounded-lg">
            <span className="truncate">Variation base: {selectedImageFile.name}</span>
            <button
              type="button"
              onClick={onRemoveImageFile}
              className="text-gray-500 hover:text-gray-700 ml-2"
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-2 flex-1">
        <div className="flex items-center">
          <span className="text-s text-gray-500 font-bold mr-1.5 ml-2.5">Size:</span>
          <select
            value={options.size}
            onChange={(e) => onOptionChange('size', e.target.value)}
            className="px-2 py-1 rounded border border-gray-300 text-sm"
            disabled={disabled}
          >
            {sizeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center">
          <span className="text-s text-gray-500 font-bold mr-1.5 ml-2">Quality:</span>
          <select
            value={options.quality}
            onChange={(e) => onOptionChange('quality', e.target.value)}
            className="px-2 py-1 rounded border border-gray-300 text-sm"
            disabled={disabled}
          >
            {qualityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center">
          <span className="text-s text-gray-500 font-bold mr-1.5 ml-2">Style:</span>
          <select
            value={options.style}
            onChange={(e) => onOptionChange('style', e.target.value)}
            className="px-2 py-1 rounded border border-gray-300 text-sm"
            disabled={disabled}
          >
            {styleOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

// ======= Image Viewer Modal =======
interface ImageViewerModalProps {
  imageUrl: string;
  onClose: () => void;
}

function ImageViewerModal({ imageUrl, onClose }: ImageViewerModalProps) {
  // Close modal when clicking escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="relative max-w-[90vw] max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt="Full size preview" 
          className="max-w-full max-h-[90vh] object-contain"
        />
        <button
          className="absolute top-2 right-2 bg-white bg-opacity-80 p-1 rounded-full text-gray-800 hover:bg-opacity-100"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

// ======= File Uploads Control =======
interface FileUploadsControlProps {
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
  isFileProcessing: boolean;
}

export function FileUploadsControl({
  selectedFiles,
  onRemoveFile,
  isFileProcessing
}: FileUploadsControlProps) {
  const [thumbnails, setThumbnails] = useState<{[key: number]: string}>({});
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Check if file is an image
  const isImageFile = (file: File): boolean => {
    return file.type.startsWith('image/jpeg') || 
           file.type.startsWith('image/jpg') || 
           file.type.startsWith('image/png');
  };

  // Generate thumbnails for image files
  useEffect(() => {
    const newThumbnails: {[key: number]: string} = {};
    
    selectedFiles.forEach((file, index) => {
      if (isImageFile(file)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const target = e.target;
          const result = target?.result;
          if (target && result) {
            const resultString = result.toString();
            newThumbnails[index] = resultString;
            setThumbnails(prev => ({ ...prev, [index]: resultString }));
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }, [selectedFiles]);

  // Handle thumbnail click
  const handleThumbnailClick = (thumbnailUrl: string) => {
    setViewingImage(thumbnailUrl);
  };

  // Separate files into images and non-images
  const nonImageFiles = selectedFiles.filter((file, index) => !isImageFile(file));
  const imageFiles = selectedFiles.filter((file, index) => isImageFile(file));
  
  if (selectedFiles.length === 0) return null;
  
  return (
    <div className="px-4 pt-3 space-y-3">
      {/* Non-image files */}
      {nonImageFiles.length > 0 && (
        <div className="space-y-2">
          {nonImageFiles.map((file, fileIndex) => {
            const originalIndex = selectedFiles.findIndex(f => f === file);
            return (
              <div key={fileIndex} className="file-chip flex items-center justify-between mr-2 p-2 bg-gray-100 rounded-lg">
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveFile(originalIndex)}
                  className="text-gray-500 hover:text-gray-700 ml-2"
                  disabled={isFileProcessing}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Image files thumbnails */}
      {imageFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {imageFiles.map((file, fileIndex) => {
            const originalIndex = selectedFiles.findIndex(f => f === file);
            const thumbnailUrl = thumbnails[originalIndex];
            
            return (
              <div key={fileIndex} className="relative group">
                <div 
                  className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 cursor-pointer border border-gray-200 flex items-center justify-center"
                  onClick={() => thumbnailUrl && handleThumbnailClick(thumbnailUrl)}
                >
                  {thumbnailUrl ? (
                    <img 
                      src={thumbnailUrl} 
                      alt={file.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveFile(originalIndex)}
                  className="absolute -top-1 -right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700 border border-gray-300"
                  disabled={isFileProcessing}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Image viewer modal */}
      {viewingImage && (
        <ImageViewerModal 
          imageUrl={viewingImage} 
          onClose={() => setViewingImage(null)} 
        />
      )}
    </div>
  );
}