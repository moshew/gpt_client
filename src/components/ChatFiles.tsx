import React, { useState, useEffect, useMemo } from 'react';
import { File, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { ChatFile } from '../types';

interface ChatFilesProps {
  docFiles?: ChatFile[];
  codeFiles?: ChatFile[];
  isCodeAnalysisEnabled?: boolean;
  useOriginalFiles?: boolean;
  onUseOriginalFilesChange?: (checked: boolean) => void;
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: Record<string, FileNode>;
  file?: ChatFile;
  path: string;
}

export function ChatFiles({ docFiles, codeFiles, isCodeAnalysisEnabled = false, useOriginalFiles, onUseOriginalFilesChange }: ChatFilesProps) {
  // Always initialize hooks first
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Determine which files to display based on Code Analysis state
  const filesToDisplay = useMemo(() => {
    if (isCodeAnalysisEnabled && codeFiles) {
      return codeFiles;
    } else if (!isCodeAnalysisEnabled && docFiles) {
      return docFiles;
    }
    return [];
  }, [isCodeAnalysisEnabled, codeFiles, docFiles]);

  // Check if any file has directory separators
  const hasDirectories = useMemo(() => 
    filesToDisplay.some(file => 
      file.file_name.includes('/') || file.file_name.includes('\\')
    ), [filesToDisplay]
  );

  // Auto-expand top-level folders when files change
  useEffect(() => {
    if (!hasDirectories || filesToDisplay.length === 0) {
      setExpandedFolders(new Set());
      return;
    }

    const topLevelFolders = new Set<string>();
    
    filesToDisplay.forEach(file => {
      const normalizedPath = file.file_name.replace(/\\/g, '/');
      const parts = normalizedPath.split('/');
      
      if (parts.length > 1) {
        topLevelFolders.add(parts[0]);
        if (parts.length > 2) {
          topLevelFolders.add(`${parts[0]}/${parts[1]}`);
        }
      }
    });
    
    setExpandedFolders(topLevelFolders);
  }, [filesToDisplay, hasDirectories]);

  // Toggle folder expansion
  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  // Build hierarchical file tree
  const buildFileTree = (files: ChatFile[]): Record<string, FileNode> => {
    const tree: Record<string, FileNode> = {};

    files.forEach(file => {
      // Normalize path separators to forward slashes
      const normalizedPath = file.file_name.replace(/\\/g, '/');
      const parts = normalizedPath.split('/');
      
      let currentLevel = tree;
      let currentPath = '';

      // Navigate through the path, creating folders as needed
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (i === parts.length - 1) {
          // This is the file
          currentLevel[part] = {
            name: part,
            type: 'file',
            file: file,
            path: currentPath
          };
        } else {
          // This is a folder
          if (!currentLevel[part]) {
            currentLevel[part] = {
              name: part,
              type: 'folder',
              children: {},
              path: currentPath
            };
          }
          currentLevel = currentLevel[part].children!;
        }
      }
    });

    return tree;
  };

  // Memoize the file tree to prevent unnecessary recalculations
  const fileTree = useMemo(() => {
    return hasDirectories ? buildFileTree(filesToDisplay) : {};
  }, [filesToDisplay, hasDirectories]);

  // Count files in a folder recursively
  const countFilesInFolder = (node: FileNode): number => {
    if (node.type === 'file') return 1;
    
    let count = 0;
    if (node.children) {
      Object.values(node.children).forEach(child => {
        count += countFilesInFolder(child);
      });
    }
    return count;
  };

  // Render file tree recursively
  const renderFileTree = (nodes: Record<string, FileNode>, depth = 0): JSX.Element[] => {
    return Object.entries(nodes)
      .sort(([, a], [, b]) => {
        // Sort folders first, then files
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      })
      .map(([key, node]) => {
        const isExpanded = expandedFolders.has(node.path);
        const paddingLeft = depth * 16;

        if (node.type === 'folder') {
          const fileCount = countFilesInFolder(node);
          
          return (
            <div key={node.path}>
              <div
                className="flex items-center gap-2 px-0 py-0.5 rounded-lg text-gray-700 cursor-pointer transition-colors duration-150 group"
                style={{ paddingLeft: `${paddingLeft}px` }}
                onClick={() => toggleFolder(node.path)}
                title={`${node.path} (${fileCount} file${fileCount !== 1 ? 's' : ''})`}
              >
                <div className="transition-transform duration-200">
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  )}
                </div>
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 flex-shrink-0 text-blue-600" />
                ) : (
                  <Folder className="w-4 h-4 flex-shrink-0 text-yellow-600" />
                )}
                <span className="truncate text-sm font-medium">{node.name}</span>
                <span className="text-xs text-gray-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  {fileCount}
                </span>
              </div>
              <div className={`transition-all duration-200 ease-in-out overflow-hidden ${
                isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                {node.children && renderFileTree(node.children, depth + 1)}
              </div>
            </div>
          );
        } else {
          return (
            <div
              key={node.file?.id || node.path}
              className="flex items-center gap-2 px-0 py-0.5 rounded-lg text-gray-700 cursor-pointer transition-colors duration-150"
              style={{ paddingLeft: `${paddingLeft + 19}px` }}
              title={node.path}
            >
              <File className="w-4 h-4 flex-shrink-0 text-gray-500" />
              <span className="truncate text-sm">{node.name}</span>
            </div>
          );
        }
      });
  };

  // Render flat list (current behavior)
  const renderFlatList = (files: ChatFile[]): JSX.Element[] => {
    return files.map((file) => (
      <div
        key={file.id}
        className="flex items-center gap-2 px-0 py-0.5 rounded-lg text-gray-700 cursor-pointer transition-colors duration-150"
      >
        <File className="w-4 h-4 flex-shrink-0 text-gray-500" />
        <span className="truncate text-sm">{file.file_name}</span>
      </div>
    ));
  };

  const title = isCodeAnalysisEnabled ? "Code Files" : "Document Files";

  return (
    <>
      {filesToDisplay.length > 0 && (
        <div 
          className={`mt-auto border-t border-gray-200 ${filesToDisplay.length > 5 ? 'max-h-52 overflow-y-auto scrollbar-thin' : ''}`}
          style={filesToDisplay.length > 5 ? {
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e0 transparent'
          } : {}}
        >
          {/* Sticky title at the top */}
          <div className="sticky top-0 bg-gray-50 px-5 pt-3 pb-1 z-10">
            <h2 className="text-base font-medium text-gray-700 mb-0">{title}</h2>
          </div>
          
          {/* Content area */}
          <div className="px-5 pb-3">
            <div className="py-1">
              <div className="space-y-0">
                {hasDirectories ? renderFileTree(fileTree) : renderFlatList(filesToDisplay)}
              </div>
            </div>
            
            {/* Checkbox for original files - only in document mode */}
            {!isCodeAnalysisEnabled && onUseOriginalFilesChange && (
              <div className="pt-1 mt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useOriginalFiles || false}
                    onChange={(e) => {
                      onUseOriginalFilesChange(e.target.checked);
                    }}
                    className="simple-checkbox cursor-pointer"
                  />
                  <span className="text-sm text-gray-400">Use original (unindexed) files</span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}