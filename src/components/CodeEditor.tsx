import React, { useRef, useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Eye, Code as CodeIcon } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  onClose?: () => void;
  onTitleChange?: (title: string) => void;
  onHtmlDetected?: (isHtml: boolean) => void;
  onPreviewModeChange?: (isPreviewMode: boolean) => void;
  isPreviewModeExternal?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  code, 
  onChange, 
  onTitleChange,
  onHtmlDetected,
  onPreviewModeChange,
  isPreviewModeExternal
}) => {
  const editorRef = useRef<any>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [language, setLanguage] = useState<string>('typescript');
  const [isHTML, setIsHTML] = useState(false);
  const initialDetectionDone = useRef(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync with external preview mode state
  useEffect(() => {
    if (isPreviewModeExternal !== undefined && isPreviewModeExternal !== isPreviewMode) {
      console.log('Syncing preview mode from external source:', isPreviewModeExternal);
      setIsPreviewMode(isPreviewModeExternal);
    }
  }, [isPreviewModeExternal]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    // Set focus to the editor when mounted
    editor.focus();
  };

  // Separate function for thorough HTML detection
  const isHtmlContent = useCallback((codeToCheck: string): boolean => {
    // Check for common HTML markers
    if (codeToCheck.includes('<!DOCTYPE html') || 
        codeToCheck.includes('<html') ||
        codeToCheck.match(/^```html/m) ||
        codeToCheck.match(/<head>|<\/head>/i) ||
        codeToCheck.match(/<body>|<\/body>/i) ||
        codeToCheck.match(/<meta\s/i) ||
        codeToCheck.match(/<title>|<\/title>/i) ||
        codeToCheck.match(/<div\s|<div>|<\/div>/i) ||
        codeToCheck.match(/<span\s|<span>|<\/span>/i) ||
        codeToCheck.match(/<p\s|<p>|<\/p>/i) ||
        codeToCheck.match(/<a\s|<a>|<\/a>/i) ||
        codeToCheck.match(/<img\s/i) ||
        codeToCheck.match(/<style>|<\/style>/i) ||
        codeToCheck.match(/<script>|<\/script>/i)) {
      return true;
    }

    // Count HTML-like tags as an additional check
    const tagMatches = codeToCheck.match(/<\/?[a-z][a-z0-9]*[\s>]/gi);
    if (tagMatches && tagMatches.length > 2) {
      return true;
    }

    return false;
  }, []);

  const detectLanguage = useCallback((codeToCheck: string): string => {
    // First check for HTML - give priority to HTML detection
    if (isHtmlContent(codeToCheck)) {
      return 'html';
    }
    
    // Check for Python-specific patterns
    if (codeToCheck.match(/^(def|class|import|from|if __name__)/m)) {
      return 'python';
    }
    
    // Check for JSX/TSX patterns
    if (codeToCheck.includes('React') || codeToCheck.includes('jsx') || codeToCheck.match(/<[A-Z][A-Za-z0-9]*|<\/[A-Z]/)) {
      return codeToCheck.includes('typescript') || codeToCheck.includes(':') ? 'typescript' : 'javascript';
    }
    
    // Check for TypeScript patterns
    if (codeToCheck.includes('interface') || codeToCheck.includes('type ') || codeToCheck.match(/:\s*(string|number|boolean|any)\b/)) {
      return 'typescript';
    }
    
    // Check for JavaScript patterns
    if (codeToCheck.includes('function') || codeToCheck.includes('const ') || codeToCheck.includes('let ') || codeToCheck.includes('var ')) {
      return 'javascript';
    }
    
    // Check for CSS
    if (codeToCheck.includes('{') && (codeToCheck.includes(':') || codeToCheck.includes('@media'))) {
      return 'css';
    }
    
    // Default to typescript if no other matches
    return 'typescript';
  }, [isHtmlContent]);

  // Prepare clean HTML outside of render function
  const getCleanHtml = useCallback(() => {
    try {
      let cleanHtml = code;
      
      // Remove markdown code block markers
      cleanHtml = cleanHtml.replace(/^```html\n|^```\n|```$/gm, '');
      
      // Make sure we have a complete HTML structure
      if (!cleanHtml.includes('<!DOCTYPE') && !cleanHtml.includes('<html')) {
        // If only partial HTML, wrap it in a basic HTML document
        cleanHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HTML Preview</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
  </style>
</head>
<body>
${cleanHtml}
</body>
</html>`;
      }
      
      return cleanHtml;
    } catch (error) {
      console.error('Error preparing HTML:', error);
      return `<!DOCTYPE html><html><body>Error preparing preview</body></html>`;
    }
  }, [code]);

  // Initial detection - run immediately and on mount
  useEffect(() => {
    // Force immediate detection
    const detectedLang = detectLanguage(code);
    const htmlDetected = isHtmlContent(code);
    
    console.log('Initial detection:', { 
      detectedLang, 
      htmlDetected,
      codePreview: code.substring(0, 100) // Log first 100 chars for debugging
    });
    
    setLanguage(detectedLang);
    setIsHTML(htmlDetected || detectedLang === 'html');
    initialDetectionDone.current = true;
    
    // Notify parent component about HTML detection
    if (onHtmlDetected && (htmlDetected || detectedLang === 'html')) {
      onHtmlDetected(true);
    }
    
    // If HTML is detected, display debug info in console for debugging
    if (htmlDetected || detectedLang === 'html') {
      console.log('HTML DETECTED! Enabling preview button.');
    }
  }, [code, detectLanguage, isHtmlContent, onHtmlDetected]);

  // Handle code changes
  useEffect(() => {
    if (!code) return;
    
    const detectedLanguage = detectLanguage(code);
    const htmlDetected = isHtmlContent(code);
    
    setLanguage(detectedLanguage);
    const isHtmlCode = htmlDetected || detectedLanguage === 'html';
    setIsHTML(isHtmlCode);
    
    // Notify parent component about HTML detection
    if (onHtmlDetected) {
      onHtmlDetected(isHtmlCode);
    }
    
    // Reset preview mode when switching to non-HTML code
    if (!isHtmlCode && isPreviewMode) {
      setIsPreviewMode(false);
      if (onPreviewModeChange) {
        onPreviewModeChange(false);
      }
    }
  }, [code, isPreviewMode, detectLanguage, isHtmlContent, onHtmlDetected, onPreviewModeChange]);

  useEffect(() => {
    // Update the title in the parent component when mode changes
    if (onTitleChange) {
      onTitleChange(isPreviewMode ? 'HTML Preview' : 'Code Editor');
    }
  }, [isPreviewMode, onTitleChange]);

  // Respond to preview toggle from Header component
  useEffect(() => {
    if (onPreviewModeChange) {
      onPreviewModeChange(isPreviewMode);
    }
  }, [isPreviewMode, onPreviewModeChange]);

  // Remember preview state for HTML code
  useEffect(() => {
    // Store the current preview mode for HTML in local storage
    if (isHTML) {
      try {
        localStorage.setItem('html_preview_mode', isPreviewMode ? 'true' : 'false');
      } catch (e) {
        // Handle local storage errors
      }
    }
  }, [isPreviewMode, isHTML]);

  // Restore preview mode when HTML is detected
  useEffect(() => {
    if (isHTML && initialDetectionDone.current) {
      try {
        const savedMode = localStorage.getItem('html_preview_mode');
        if (savedMode === 'true') {
          setIsPreviewMode(true);
          if (onPreviewModeChange) {
            onPreviewModeChange(true);
          }
        }
      } catch (e) {
        // Handle local storage errors
      }
    }
  }, [isHTML, onPreviewModeChange]);

  // Handle iframe load events safely (not during render)
  const handleIframeLoad = useCallback(() => {
    console.log('iframe loaded successfully');
    
    // Try to access the iframe content to see if it loaded properly
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        // Successfully loaded
        setPreviewError(null);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setPreviewError(`Error accessing iframe content: ${errorMsg}`);
    }
  }, []);

  const handleIframeError = useCallback(() => {
    console.error('iframe error');
    setPreviewError('Failed to load preview');
  }, []);

  const togglePreviewMode = () => {
    console.log('Toggle preview button clicked, changing from', isPreviewMode, 'to', !isPreviewMode);
    setIsPreviewMode(!isPreviewMode);
    setPreviewError(null); // Clear any errors when toggling
    
    if (onPreviewModeChange) {
      onPreviewModeChange(!isPreviewMode);
    }
  };

  // External toggle preview method that can be called from the parent component
  useEffect(() => {
    // Expose a method for the parent component to toggle preview mode
    (window as any).togglePreviewMode = togglePreviewMode;
    
    return () => {
      delete (window as any).togglePreviewMode;
    };
  }, [isPreviewMode]);

  // Render HTML Preview component
  const renderHTMLPreview = () => {
    if (previewError) {
      return (
        <div className="h-full w-full bg-white overflow-auto p-4 flex flex-col items-center justify-center">
          <div className="text-red-500 mb-4">⚠️ Error displaying preview</div>
          <div className="bg-red-50 p-3 rounded border border-red-200 max-w-xl">
            {previewError}
          </div>
        </div>
      );
    }

    // Prepare HTML content for preview
    const cleanHtml = getCleanHtml();

    return (
      <div className="h-full w-full bg-white overflow-auto p-0 flex flex-col">
        <div className="flex-1">
          <iframe
            ref={iframeRef}
            title="HTML Preview"
            srcDoc={cleanHtml}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1">
        {isPreviewMode && isHTML ? (
          renderHTMLPreview()
        ) : (
          <Editor
            height="100%"
            width="100%"
            language={language}
            value={code}
            theme="vs-light"
            onChange={(value) => onChange(value || '')}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              lineNumbers: 'off',
              folding: false,

              scrollBeyondLastLine: false,
              overviewRulerBorder: false,
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              automaticLayout: true,
              fontFamily: '"JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
              fontSize: 14,
              renderLineHighlight: 'none',
              glyphMargin: false,
              guides: { indentation: false },

              padding: { top: 0 },
              contextmenu: false,
              scrollbar: {
                vertical: 'auto',
                horizontal: 'auto',
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CodeEditor;