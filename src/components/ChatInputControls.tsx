import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Database, X } from 'lucide-react';

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
  if (selectedFiles.length === 0) return null;
  
  return (
    <div className="px-4 pt-3 space-y-2">
      {selectedFiles.map((file, index) => (
        <div key={index} className="file-chip flex items-center justify-between p-2 bg-gray-100 rounded-lg">
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => onRemoveFile(index)}
            className="text-gray-500 hover:text-gray-700 ml-2"
            disabled={isFileProcessing}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}