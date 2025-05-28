import React, { useState, useEffect, useRef } from 'react';
import { UserCircle2, X, LogOut, Loader2, Eye } from 'lucide-react';
import { SidebarToggle } from './icons/SidebarToggle';
import { NewChatIcon } from './icons/NewChatIcon';
import { User } from '../types';
import config from '../config';

interface Model {
  id: string;
  name: string;
  description: string;
}

interface HeaderProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  isLeftPanelOpen: boolean;
  onTogglePanel: () => void;
  onNewChat: () => void;
  isCodeEditorOpen?: boolean;
  className?: string;
  showControls?: boolean;
  showAvatar?: boolean;
  title?: string;
  onClose?: () => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isAuthenticating?: boolean;
  isInitializing?: boolean;
  hasTokenInUrl?: boolean;
  isHTML?: boolean;
  isPreviewMode?: boolean;
  onTogglePreview?: () => void;
}

export function Header({ 
  selectedModel, 
  onModelChange, 
  isLeftPanelOpen, 
  onTogglePanel, 
  onNewChat,
  isCodeEditorOpen = false,
  className = "",
  showControls = true,
  showAvatar = true,
  title,
  onClose,
  user,
  onLogin,
  onLogout,
  isAuthenticating = false,
  isInitializing = false,
  hasTokenInUrl = false,
  isHTML = false,
  isPreviewMode = false,
  onTogglePreview
}: HeaderProps) {
  const [availableModels, setAvailableModels] = useState<Model[]>([
    { id: 'gpt-4', name: 'GPT-4 (Recommended)', description: 'Great for most tasks' },
    { id: 'gpt-3.5', name: 'GPT-3.5 Turbo', description: 'Faster, but less capable' },
    { id: 'claude', name: 'Claude 2.1', description: 'Alternative AI model' },
  ]);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAvailableModels = async () => {
      try {
        const response = await fetch(`${config.apiBaseUrl}/query/available_models`);
        if (!response.ok) {
          throw new Error('Failed to fetch available models');
        }
        
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          setAvailableModels(data.models.map((model: any) => ({
            id: model.name,
            name: model.name,
            description: model.description || ''
          })));
        }
      } catch (error) {
        console.error('Error fetching available models:', error);
      }
    };

    fetchAvailableModels();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatModelName = (modelId: string) => {
    let modelName = modelId;
    if (modelName.startsWith('GPT-')) {
      modelName = modelName.substring(4);
    }
    return modelName;
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const displayName = user?.display_name || name;
    return displayName.charAt(0).toUpperCase();
  };

  const getDisplayName = () => {
    if (user?.display_name) return user.display_name;
    if (user?.email) return user.email;
    return user?.username;
  };

  const handleLoginClick = async () => {
    try {
      await onLogin();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const toggleModelDropdown = () => {
    setIsModelDropdownOpen(!isModelDropdownOpen);
  };

  const handleSelectModel = (modelId: string) => {
    onModelChange(modelId);
    setIsModelDropdownOpen(false);
  };

  return (
    <header className={`flex-none ${isCodeEditorOpen && !title ? 'bg-gray-50' : 'bg-white'} ${className}`}>
      <div className="flex justify-between items-center h-14 pr-6 pl-2">
        {showControls && (
          <div className="flex-1 flex items-center gap-2">
            {!isLeftPanelOpen && user && (
              <>
                <div className="tooltip-wrapper">
                  <button
                    onClick={onTogglePanel}
                    className="p-2 hover-button"
                  >
                    <SidebarToggle className="w-6 h-6 text-gray-600" />
                  </button>
                  <div className="tooltip">Open sidebar</div>
                </div>
                <div className="tooltip-wrapper">
                  <button
                    onClick={onNewChat}
                    className="p-2 hover-button"
                  >
                    <NewChatIcon className="w-6 h-6 text-gray-600" />
                  </button>
                  <div className="tooltip">New chat</div>
                </div>
              </>
            )}
            <div className="relative w-64" ref={modelDropdownRef}>
              <button 
                onClick={toggleModelDropdown}
                className="w-full py-1.5 px-3 flex items-center rounded-lg hover:bg-gray-50 transition-colors focus:outline-none"
              >
                <div className="flex items-center">
                  <span className="text-black text-xl">ElbitGPT</span>
                  <span className="text-gray-500 ml-3 text-xl">{formatModelName(selectedModel)}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-500 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {isModelDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="p-2">
                    <div className="text-sm text-gray-500 mb-1 px-2">Models</div>
                    {availableModels.map(model => (
                      <div 
                        key={model.id}
                        className={`p-2 rounded hover:bg-gray-50 cursor-pointer ${selectedModel === model.id ? 'bg-gray-50' : ''}`}
                        onClick={() => handleSelectModel(model.id)}
                      >
                        <div className="font-medium">{model.name}</div>
                        {model.description && (
                          <div className="text-xs text-gray-400">{model.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {title && (
          <div className="flex-1 flex items-center gap-4 px-2">
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X size={26} className="text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
          </div>
        )}
        {showAvatar && (
          <div className="flex items-center gap-5">
            {isCodeEditorOpen && isHTML && onTogglePreview && (
              <button
                onClick={onTogglePreview}
                className={`
                  flex items-center gap-1 px-5 py-2 rounded-full border
                  transition-colors font-medium text-sm
                  ${isPreviewMode 
                    ? 'bg-gray-200 border-gray-300 text-gray-800 hover:bg-gray-100' 
                    : 'bg-transparent border-gray-300 text-gray-700 hover:bg-gray-100'}
                `}
              >
                <Eye size={16} />
                <span>{isPreviewMode ? 'Code' : 'Preview'}</span>
              </button>
            )}
            
            {/* מצב טעינה ראשוני או טוקן ב-URL - מציג placeholder כדי למנוע פליקר */}
            {(isInitializing || hasTokenInUrl) ? (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            ) : !user ? (
              <button
                onClick={handleLoginClick}
                disabled={isAuthenticating}
                className={`
                  flex items-center justify-center min-w-[100px] h-9
                  px-4 text-sm font-medium text-white 
                  bg-blue-600 rounded-lg transition-colors
                  ${isAuthenticating ? 'opacity-90 cursor-not-allowed' : 'hover:bg-blue-700'}
                `}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign in with Microsoft</span>
                )}
              </button>
            ) : (
              <div className="relative group">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center ring-4 ring-blue-50 hover:ring-blue-100 transition-all cursor-pointer">
                  <span className="text-blue-700 font-medium text-sm">{getInitials(user.username)}</span>
                </div>
                <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 z-50">
                  <div className="px-4 py-2">
                    <div className="text-sm font-medium text-gray-900">{getDisplayName()}</div>
                    {user.email && user.email !== user.username && (
                      <div className="text-xs text-gray-500 mt-1 truncate">{user.email}</div>
                    )}
                  </div>
                  <div className="h-px bg-gray-200 my-1"></div>
                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut size={16} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div id="header-separator" className="h-px bg-gray-200 opacity-0 transition-opacity duration-200" />
    </header>
  );
}