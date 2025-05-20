import React from 'react';
import { UserCircle2, X, LogOut, Loader2, Eye } from 'lucide-react';
import { SidebarToggle } from './icons/SidebarToggle';
import { NewChatIcon } from './icons/NewChatIcon';
import { User } from '../types';

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
  isHTML = false,
  isPreviewMode = false,
  onTogglePreview
}: HeaderProps) {
  const models = [
    { id: 'gpt-4', name: 'GPT-4 (Recommended)' },
    { id: 'gpt-3.5', name: 'GPT-3.5 Turbo' },
    { id: 'claude', name: 'Claude 2.1' },
  ];

  const getInitials = (name: string) => {
    if (!name) return '?';
    // If display_name is available, use it; otherwise use username
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
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-64 py-1.5 px-3 text-lg bg-transparent hover:bg-gray-50 rounded-lg cursor-pointer transition-colors focus:outline-none font-medium text-gray-600"
            >
              {models.map(model => (
                <option key={model.id} value={model.id} className="text-lg font-medium text-gray-600">
                  {model.name}
                </option>
              ))}
            </select>
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
            
            {!user ? (
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