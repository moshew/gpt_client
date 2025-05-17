import React from 'react';
import { File } from 'lucide-react';
import { ChatFile } from '../types';

interface ChatFilesProps {
  docFiles?: ChatFile[];
  codeFiles?: ChatFile[];
  isCodeAnalysisEnabled?: boolean;
}

export function ChatFiles({ docFiles, codeFiles, isCodeAnalysisEnabled = false }: ChatFilesProps) {
  // Determine which files to display based on Code Analysis state
  let filesToDisplay: ChatFile[] = [];
  
  if (isCodeAnalysisEnabled && codeFiles) {
    filesToDisplay = codeFiles;
  } else if (!isCodeAnalysisEnabled && docFiles) {
    filesToDisplay = docFiles;
  }
  
  // Check if we have files to display
  if (!filesToDisplay || filesToDisplay.length === 0) return null;

  const title = isCodeAnalysisEnabled ? "Code Files" : "Document Files";

  return (
    <div className="mt-auto p-3 border-t border-gray-200">
      <h2 className="text-base font-medium text-gray-700 mb-2">{title}</h2>
      <div className={`space-y-1 ${filesToDisplay.length > 5 ? 'max-h-40 overflow-y-auto pr-2' : ''}`}>
        {filesToDisplay.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-100 cursor-pointer"
          >
            <File className="w-4 h-4 flex-shrink-0" />
            <span className="truncate text-sm">{file.file_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}