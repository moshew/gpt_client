import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  onClose?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange }) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    // Set focus to the editor when mounted
    editor.focus();
  };

  const detectLanguage = (code: string): string => {
    // Check for Python-specific patterns
    if (code.match(/^(def|class|import|from|if __name__)/m)) {
      return 'python';
    }
    
    // Check for JSX/TSX patterns
    if (code.includes('React') || code.includes('jsx') || code.match(/<[A-Z][A-Za-z0-9]*|<\/[A-Z]/)) {
      return code.includes('typescript') || code.includes(':') ? 'typescript' : 'javascript';
    }
    
    // Check for TypeScript patterns
    if (code.includes('interface') || code.includes('type ') || code.match(/:\s*(string|number|boolean|any)\b/)) {
      return 'typescript';
    }
    
    // Check for JavaScript patterns
    if (code.includes('function') || code.includes('const ') || code.includes('let ') || code.includes('var ')) {
      return 'javascript';
    }
    
    // Check for CSS
    if (code.includes('{') && (code.includes(':') || code.includes('@media'))) {
      return 'css';
    }
    
    // Check for HTML
    if (code.includes('<!DOCTYPE') || code.includes('<html') || (code.match(/<\/?[a-z][\s\S]*>/i) && !code.includes('React'))) {
      return 'html';
    }
    
    // Default to typescript if no other matches
    return 'typescript';
  };

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        width="100%"
        language={detectLanguage(code)}
        value={code}
        theme="vs-light"
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          lineNumbers: 'off',
          folding: false,
          renderOverviewRuler: false,
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
          renderIndentGuides: false,
          padding: { top: 0, left: 10 },
          contextmenu: false,
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8
          }
        }}
      />
    </div>
  );
};

export default CodeEditor;