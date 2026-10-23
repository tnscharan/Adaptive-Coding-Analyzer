declare module '@monaco-editor/react' {
  import * as React from 'react';
  export interface EditorProps {
    [key: string]: any;
  }
  export const loader: {
    config: (options: any) => void;
    [key: string]: any;
  };
  const Editor: React.ComponentType<EditorProps>;
  export default Editor;
}

declare module 'monaco-editor' {
  const monaco: any;
  export = monaco;
}

declare module 'lucide-react';

