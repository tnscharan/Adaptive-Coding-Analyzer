import Editor, { loader } from '@monaco-editor/react';

// Configure monaco-editor to load locally from public/vs directory (avoids heavy pre-bundling)
loader.config({ paths: { vs: '/vs' } });

type EditorPanelProps = {
  code: string;
  language: string;
  onChange: (value: string | undefined) => void;
  onMount?: (editor: any, monaco: any) => void;
};

export default function EditorPanel({ code, language, onChange, onMount }: EditorPanelProps) {
  // Translate visual language label to monaco languages
  const monacoLanguage = language === 'c' || language === 'cpp' ? 'cpp' : language;

  return (
    <div className="flex-1 min-h-0 min-w-0 relative">
      <Editor
        height="100%"
        defaultLanguage="python"
        language={monacoLanguage}
        theme="vs-dark"
        value={code}
        onChange={onChange}
        onMount={(editor: any, monaco: any) => {
          if (onMount) onMount(editor, monaco);
        }}
        options={{
          fontSize: 14,
          fontFamily: "'Fira Code', monospace",
          minimap: { enabled: false },
          smoothScrolling: true,
          cursorBlinking: "expand",
          padding: { top: 20 }
        }}
      />
    </div>
  );
}
