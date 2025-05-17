import { useState, useEffect } from 'react';

export function useCodeEditor() {
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);

  const handleEditCode = (code: string) => {
    setIsLeftPanelOpen(false);
    setTimeout(() => {
      setEditingCode(code);
    }, 50);
  };

  useEffect(() => {
    if (editingCode !== null) {
      setIsLeftPanelOpen(false);
    }
  }, [editingCode]);

  const handleSidebarToggle = () => {
    if (editingCode !== null) {
      document.body.style.overflow = !isLeftPanelOpen ? 'hidden' : 'auto';
    }
    setIsLeftPanelOpen(!isLeftPanelOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.querySelector('.sidebar');
      const sidebarButton = document.querySelector('.sidebar-toggle');
      
      if (isLeftPanelOpen && editingCode !== null && 
          sidebar && !sidebar.contains(event.target as Node) &&
          sidebarButton && !sidebarButton.contains(event.target as Node)) {
        setIsLeftPanelOpen(false);
        document.body.style.overflow = 'auto';
      }
    };

    if (isLeftPanelOpen && editingCode !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLeftPanelOpen, editingCode]);

  return {
    editingCode,
    setEditingCode,
    isLeftPanelOpen,
    setIsLeftPanelOpen,
    handleEditCode,
    handleSidebarToggle
  };
}