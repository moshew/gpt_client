import React from 'react';
import { ToggleLeft, ToggleRight, Globe, Code, Image, Database } from 'lucide-react';

interface ToolsProps {
  tools: {
    webSearch: boolean;
    codeAnalysis: boolean;
    imageCreator: boolean;
    knowledgeBases: boolean;
  };
  onToggle: (tool: keyof typeof tools) => void;
}

export function Tools({ tools, onToggle }: ToolsProps) {
  return (
    <div className="px-5 pt-4 pb-8">
      <h2 className="text-base font-medium text-gray-700 mb-0">Tools</h2>
      <div className="py-1">
        <button
          onClick={() => onToggle('imageCreator')}
          className="w-full flex items-center justify-between px-0 py-1.5 hover:bg-gray-200 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">Amazing Images Creator</span>
          </div>
          {tools.imageCreator ? (
            <ToggleRight className="w-5 h-5 text-blue-600" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-gray-400" />
          )}
        </button>
        <button
          onClick={() => onToggle('webSearch')}
          className="w-full flex items-center justify-between px-0 py-1.5 hover:bg-gray-200 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">Search the Web</span>
          </div>
          {tools.webSearch ? (
            <ToggleRight className="w-5 h-5 text-blue-600" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-gray-400" />
          )}
        </button>
        <button
          onClick={() => onToggle('knowledgeBases')}
          className="w-full flex items-center justify-between px-0 py-1.5 hover:bg-gray-200 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">Knowledge Bases</span>
          </div>
          {tools.knowledgeBases ? (
            <ToggleRight className="w-5 h-5 text-blue-600" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-gray-400" />
          )}
        </button>
        <button
          onClick={() => onToggle('codeAnalysis')}
          className="w-full flex items-center justify-between px-0 py-1.5 hover:bg-gray-200 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">Code Analysis</span>
          </div>
          {tools.codeAnalysis ? (
            <ToggleRight className="w-5 h-5 text-blue-600" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-gray-400" />
          )}
        </button>
      </div>
    </div>
  );
}