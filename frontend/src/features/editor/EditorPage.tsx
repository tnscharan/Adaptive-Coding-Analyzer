import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Brain, 
  Play, 
  FileCode2, 
  ChevronLeft, 
  LayoutDashboard, 
  Terminal, 
  Cpu,
  Maximize2,
  Minimize2,
  HelpCircle
} from 'lucide-react';
import { api, WS_BASE_URL } from '../../services/api';
import {
  getLocalMetrics
} from '../../services/localIntelligence';

const CODE_TEMPLATES: Record<string, string> = {
  python: `def solve():\n    # Write your Python code here\n    print("Hello from ACPIS!")\n\nif __name__ == "__main__":\n    solve()`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your C code here\n    printf("Hello from ACPIS!\\n");\n    return 0;\n}`,
  cpp: `#include <iostream>\n\nint main() {\n    // Write your C++ code here\n    std::cout << "Hello from ACPIS!" << std::endl;\n    return 0;\n}`,
  java: `public class Main {\n    public static void main(String[] args) {\n        // Write your Java code here\n        System.out.println("Hello from ACPIS!");\n    }\n}`
};

// Modular Panels Imports
import EditorPanel from './components/EditorPanel';
import ExecutionPanel from './components/ExecutionPanel';
import SessionPanel from './components/SessionPanel';

type WorkspaceFile = {
  id: string;
  name: string;
  code: string;
  language: string;
};



const EditorPage = () => {
  const navigate = useNavigate();
  
  // States
  const [files, setFiles] = useState<WorkspaceFile[]>(() => {
    const cached = localStorage.getItem('acpis:workspace:files');
    return cached ? JSON.parse(cached) : [];
  });
  
  const [activeFileId, setActiveFileId] = useState<string | null>(() => {
    return localStorage.getItem('acpis:workspace:activeFileId') || null;
  });

  const [code, setCode] = useState(() => {
    const cachedFiles = localStorage.getItem('acpis:workspace:files');
    const parsedFiles = cachedFiles ? JSON.parse(cachedFiles) : [];
    const cachedActiveId = localStorage.getItem('acpis:workspace:activeFileId');
    const activeFile = parsedFiles.find((f: any) => f.id === cachedActiveId);
    if (activeFile) {
      return activeFile.code;
    }
    return '';
  });
  
  const [stats, setStats] = useState({
    wpm: 0,
    pauses: 0,
    backspaces: 0,
    thinkingTime: 0,
    edits: 0
  });

  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  // Sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Shortcuts modal state
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Error enabling fullscreen:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // WPM character trackers
  const charsTyped = useRef(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Layout and Save states
  const [consolePosition, setConsolePosition] = useState<'bottom' | 'right'>(() => {
    return (localStorage.getItem('acpis:console:position') as 'bottom' | 'right') || 'bottom';
  });
  const [fileSavedTimes, setFileSavedTimes] = useState<Record<string, string>>({});

  const lastKeyTime = useRef(0);
  const sessionId = useRef<number | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [executionOutput, setExecutionOutput] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const keystrokesRef = useRef<number[]>([]);
  const lastTypingEventTimeRef = useRef<number>(0);
  const [language, setLanguage] = useState('python');
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

  const editorRef = useRef<any>(null);
  const triggerExecuteRef = useRef<any>(null);
  const triggerFullscreenRef = useRef<any>(null);
  const triggerAnalysisRef = useRef<any>(null);
  const triggerStopRef = useRef<any>(null);
  const triggerClearRef = useRef<any>(null);
  const triggerShortcutsModalRef = useRef<any>(null);
  const triggerDashboardRef = useRef<any>(null);
  const triggerWorkspaceRef = useRef<any>(null);
  const localMetrics = useMemo(() => getLocalMetrics(code), [code]);

  const handleFileSelect = (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file) return;
    setActiveFileId(id);
    setCode(file.code);
    setLanguage(file.language);
    setSelectedFileIds([id]);
  };

  const handleFileClick = (id: string, ctrlKey: boolean) => {
    const file = files.find(f => f.id === id);
    if (!file) return;

    if (ctrlKey) {
      setSelectedFileIds(prev => {
        const isSelected = prev.includes(id);
        const next = isSelected ? prev.filter(x => x !== id) : [...prev, id];
        
        if (next.includes(id)) {
          setActiveFileId(id);
          setCode(file.code);
          setLanguage(file.language);
        } else if (next.length > 0) {
          const lastId = next[next.length - 1];
          const lastFile = files.find(f => f.id === lastId);
          if (lastFile) {
            setActiveFileId(lastId);
            setCode(lastFile.code);
            setLanguage(lastFile.language);
          }
        }
        return next;
      });
    } else {
      setSelectedFileIds([id]);
      setActiveFileId(id);
      setCode(file.code);
      setLanguage(file.language);
    }
  };

  const handleBulkClose = (ids: string[]) => {
    setFiles(prev => prev.filter(f => !ids.includes(f.id)));
    if (activeFileId && ids.includes(activeFileId)) {
      const remaining = files.filter(f => !ids.includes(f.id));
      if (remaining.length > 0) {
        const next = remaining[0];
        setActiveFileId(next.id);
        setCode(next.code);
        setLanguage(next.language);
      } else {
        setActiveFileId(null);
        setCode('');
      }
    }
    setSelectedFileIds([]);
  };

  const handleBulkDownload = (ids: string[], format: 'pdf' | 'txt' | 'doc' | 'native') => {
    const targets = files.filter(f => ids.includes(f.id));
    targets.forEach(f => {
      handleFileDownload(f, format);
    });
  };

  const handleFileCreate = (name: string, content?: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    let lang = 'python';
    if (ext === 'java') lang = 'java';
    else if (ext === 'c') lang = 'c';
    else if (ext === 'cpp' || ext === 'cc' || ext === 'h') lang = 'cpp';
    
    const newFile: WorkspaceFile = {
      id: (Date.now() + Math.random()).toString(),
      name,
      code: content !== undefined ? content : (CODE_TEMPLATES[lang] || CODE_TEMPLATES.python || 'def solve():\n    pass'),
      language: lang
    };
    
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
    setCode(newFile.code);
    setLanguage(lang);
  };

  const handleFileClose = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setSelectedFileIds(prev => prev.filter(selId => selId !== id));
    if (activeFileId === id) {
      const remaining = files.filter(f => f.id !== id);
      if (remaining.length > 0) {
        const next = remaining[0];
        setActiveFileId(next.id);
        setCode(next.code);
        setLanguage(next.language);
      } else {
        setActiveFileId(null);
        setCode('');
      }
    }
  };

  const handleFileRename = (id: string, newName: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id === id) {
        const ext = newName.split('.').pop()?.toLowerCase() || '';
        let lang = f.language;
        if (ext === 'py') lang = 'python';
        else if (ext === 'java') lang = 'java';
        else if (ext === 'c') lang = 'c';
        else if (ext === 'cpp' || ext === 'cc' || ext === 'h') lang = 'cpp';

        if (id === activeFileId) {
          setLanguage(lang);
        }

        return {
          ...f,
          name: newName,
          language: lang
        };
      }
      return f;
    }));
  };

  const handleFileDownload = async (file: WorkspaceFile, format: 'pdf' | 'txt' | 'doc' | 'native') => {
    const codeContent = file.code;
    let filename = file.name;
    let mimeType = 'text/plain';
    let blob: Blob;

    if (format === 'native') {
      blob = new Blob([codeContent], { type: 'text/plain' });
    } else if (format === 'txt') {
      filename = filename.substring(0, filename.lastIndexOf('.')) + '.txt';
      blob = new Blob([codeContent], { type: 'text/plain' });
    } else if (format === 'doc') {
      filename = filename.substring(0, filename.lastIndexOf('.')) + '.doc';
      mimeType = 'application/msword';
      const docHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><title>${file.name}</title><style>pre { font-family: Courier New, monospace; font-size: 10pt; }</style></head>
<body><pre>${codeContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`;
      blob = new Blob([docHtml], { type: mimeType });
    } else if (format === 'pdf') {
      filename = filename.substring(0, filename.lastIndexOf('.')) + '.pdf';
      mimeType = 'application/pdf';
      
      const escapePdfText = (text: string) => {
        return text.replace(/[\\()]/g, '\\$&');
      };
      
      const lines = codeContent.split('\n');
      let streamText = "BT\n/F1 9 Tf\n11 TL\n50 780 Td\n";
      let y = 780;
      
      lines.forEach((line) => {
        if (y < 50) return;
        streamText += `(${escapePdfText(line)}) Tj T*\n`;
        y -= 11;
      });
      streamText += "ET";
      
      const pdfBody = `%PDF-1.4\n` +
        `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nobj\n` +
        `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nobj\n` +
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Courier >> >> >> >>\nobj\n` +
        `4 0 obj\n<< /Length ${streamText.length} >>\nstream\n${streamText}\nendstream\nobj\n` +
        `xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000250 00000 n\n` +
        `trailer\n<< /Size 5 /Root 1 0 R >>\n` +
        `%%EOF`;
        
      blob = new Blob([pdfBody], { type: mimeType });
    } else {
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Delay revoking to let Chrome resolve metadata and filename
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 3000);
  };

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    charsTyped.current = 0;
    setSessionStartTime(null);
    
    // If there is an active file, rename its extension to match the new language selection
    if (activeFileId) {
      setFiles(prev => prev.map(f => {
        if (f.id === activeFileId) {
          const dotIndex = f.name.lastIndexOf('.');
          const baseName = dotIndex !== -1 ? f.name.substring(0, dotIndex) : f.name;
          const ext = newLang === 'python' ? 'py' : newLang === 'java' ? 'java' : newLang === 'c' ? 'c' : 'cpp';
          const newName = `${baseName}.${ext}`;
          const newCode = CODE_TEMPLATES[newLang] || f.code;
          
          setCode(newCode);
          return {
            ...f,
            name: newName,
            language: newLang,
            code: newCode
          };
        }
        return f;
      }));
    }
  };

  const handleToggleConsolePosition = () => {
    const nextPos = consolePosition === 'bottom' ? 'right' : 'bottom';
    setConsolePosition(nextPos);
    localStorage.setItem('acpis:console:position', nextPos);
    
    // Trigger editor relayout
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
  };

  const triggerSaveRef = useRef<any>(null);
  
  const handleManualSave = () => {
    if (!activeFileId) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setFileSavedTimes(prev => ({ ...prev, [activeFileId]: timeStr }));
    
    // Update files code contents explicitly in memory files
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, code } : f));
    
    // Force write files list directly to localStorage
    const updatedFiles = files.map(f => f.id === activeFileId ? { ...f, code } : f);
    localStorage.setItem('acpis:workspace:files', JSON.stringify(updatedFiles));
    
    setExecutionOutput(prev => prev + `\n[SYSTEM]: File manually saved at ${timeStr}.`);
  };

  triggerSaveRef.current = handleManualSave;

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    if (editor && monaco) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        if (triggerExecuteRef.current) {
          triggerExecuteRef.current();
        }
      });
      // Toggle sidebar shortcut inside editor: Ctrl+B
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
        setIsSidebarOpen(prev => !prev);
      });
      // Toggle Zen Mode: Alt+Z
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyZ, () => {
        if (triggerFullscreenRef.current) {
          triggerFullscreenRef.current();
        }
      });
      // Get Code Review: Ctrl+Shift+Enter
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
        if (triggerAnalysisRef.current) {
          triggerAnalysisRef.current();
        }
      });
      // Stop Execution: Shift+Escape
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Escape, () => {
        if (triggerStopRef.current) {
          triggerStopRef.current();
        }
      });
      // Clear Terminal Output: Alt+C
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyC, () => {
        if (triggerClearRef.current) {
          triggerClearRef.current();
        }
      });
      // Toggle Shortcuts Modal: Ctrl+Shift+/ (Ctrl+?)
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.US_SLASH, () => {
        if (triggerShortcutsModalRef.current) {
          triggerShortcutsModalRef.current();
        }
      });
      // Go to Dashboard: Alt+D
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyD, () => {
        if (triggerDashboardRef.current) {
          triggerDashboardRef.current();
        }
      });
      // Go to Workspace: Alt+W
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyW, () => {
        if (triggerWorkspaceRef.current) {
          triggerWorkspaceRef.current();
        }
      });
      // Manual Save command: Ctrl+S
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        if (triggerSaveRef.current) {
          triggerSaveRef.current();
        }
      });
    }
  };

  // sliding window WPM decay interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      const cutoff = now - 15000; // 15 seconds
      
      // Filter out older keystrokes
      keystrokesRef.current = keystrokesRef.current.filter(t => t >= cutoff);
      
      // Recalculate WPM with stabilization
      const count = keystrokesRef.current.length;
      let calculatedWpm = 0;
      if (count > 0) {
        const first = keystrokesRef.current[0];
        const elapsedMs = Math.max(3000, now - first);
        const minutes = elapsedMs / 60000;
        calculatedWpm = Math.round((count / 5) / minutes);
      }
      
      setStats(prev => ({
        ...prev,
        wpm: Math.max(0, Math.min(200, calculatedWpm))
      }));
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Start session on mount
    const startSession = async () => {
      const cachedSessionId = sessionStorage.getItem('acpis_active_session_id');
      const cachedLanguage = sessionStorage.getItem('acpis_active_session_lang');
      
      if (cachedSessionId && cachedLanguage === language) {
        sessionId.current = parseInt(cachedSessionId);
        setCurrentSessionId(parseInt(cachedSessionId));
        setBackendStatus('online');
        return;
      }

      if (cachedSessionId) {
        try {
          await api.post(`/sessions/end/${cachedSessionId}`);
        } catch { /* silent */ }
        sessionStorage.removeItem('acpis_active_session_id');
        sessionStorage.removeItem('acpis_active_session_lang');
      }

      try {
        const res = await api.post('/sessions/start', { language: language });
        sessionId.current = res.data.id;
        setCurrentSessionId(res.data.id);
        sessionStorage.setItem('acpis_active_session_id', res.data.id.toString());
        sessionStorage.setItem('acpis_active_session_lang', language);
        setBackendStatus('online');
      } catch {
        console.error("Failed to connect to backend");
        setBackendStatus('offline');
      }
    };
    startSession();
  }, [language]);

  // End session on unmount or tab/browser close
  useEffect(() => {
    const handleUnmountOrClose = () => {
      const cachedSessionId = sessionStorage.getItem('acpis_active_session_id');
      if (cachedSessionId) {
        api.post(`/sessions/end/${cachedSessionId}`).catch(() => {});
        sessionStorage.removeItem('acpis_active_session_id');
        sessionStorage.removeItem('acpis_active_session_lang');
      }
    };

    window.addEventListener('beforeunload', handleUnmountOrClose);
    return () => {
      handleUnmountOrClose();
      window.removeEventListener('beforeunload', handleUnmountOrClose);
    };
  }, []);

  // Sync files and active file ID to localStorage
  useEffect(() => {
    localStorage.setItem('acpis:workspace:files', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    setSelectedFileIds(prev => prev.filter(id => files.some(f => f.id === id)));
  }, [files]);

  useEffect(() => {
    if (activeFileId) {
      localStorage.setItem('acpis:workspace:activeFileId', activeFileId);
    } else {
      localStorage.removeItem('acpis:workspace:activeFileId');
    }
  }, [activeFileId]);

  useEffect(() => {
    if (!activeFileId || !code) return;
    const timer = window.setTimeout(() => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setFileSavedTimes(prev => ({ ...prev, [activeFileId]: timeStr }));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [code, activeFileId]);

  const handleEditorChange = (value: string | undefined) => {
    if (!value) return;
    setCode(value);
    if (activeFileId) {
      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, code: value } : f));
    }
    
    const now = Date.now();
    let currentStartTime = sessionStartTime;
    if (!currentStartTime) {
      currentStartTime = now;
      setSessionStartTime(now);
      lastKeyTime.current = now;
    }

    // Pause tracking
    const interval = lastKeyTime.current ? now - lastKeyTime.current : 0;
    if (interval > 2000 && lastKeyTime.current !== 0) {
      setStats(prev => ({ 
        ...prev, 
        pauses: prev.pauses + 1, 
        thinkingTime: prev.thinkingTime + Math.round(interval / 1000) 
      }));
      trackEvent('pause', { duration: interval });
    }

    const previousLength = code.length;
    const nextLength = value.length;
    
    // Telemetry character addition tracker
    let addedChars = 0;
    if (nextLength > previousLength) {
      addedChars = nextLength - previousLength;
    }

    if (addedChars > 0) {
      const countToPush = Math.min(addedChars, 5);
      for (let i = 0; i < countToPush; i++) {
        keystrokesRef.current.push(now);
      }
    }

    // Recalculate WPM instantly with stabilization
    const cutoff = now - 15000;
    keystrokesRef.current = keystrokesRef.current.filter(t => t >= cutoff);
    const count = keystrokesRef.current.length;
    let calculatedWpm = 0;
    if (count > 0) {
      const first = keystrokesRef.current[0];
      const elapsedMs = Math.max(3000, now - first);
      const minutes = elapsedMs / 60000;
      calculatedWpm = Math.round((count / 5) / minutes);
    }

    setStats(statsPrev => ({
      ...statsPrev,
      edits: statsPrev.edits + 1,
      backspaces: nextLength < previousLength ? statsPrev.backspaces + 1 : statsPrev.backspaces,
      wpm: Math.max(0, Math.min(200, calculatedWpm))
    }));

    if (nextLength < previousLength) {
      trackEvent('backspace', {});
    }

    if (calculatedWpm > 0 && now - lastTypingEventTimeRef.current > 5000) {
      trackEvent('typing', { wpm: Math.max(0, Math.min(200, calculatedWpm)) });
      lastTypingEventTimeRef.current = now;
    }

    lastKeyTime.current = now;
  };

  const trackEvent = async (type: string, data: Record<string, unknown>) => {
    if (!sessionId.current || backendStatus !== 'online') return;
    try {
      await api.post('/sessions/events/track', {
        session_id: sessionId.current,
        event_type: type,
        payload_json: data
      });
    } catch { /* silent */ }
  };

  const runAnalysis = async () => {
    if (!sessionId.current) {
      setExecutionOutput('System Error: Session not initialized. Check backend connection.');
      return;
    }
    const currentCode = editorRef.current ? editorRef.current.getValue() : code;
    setIsAnalyzing(true);
    
    // Map current workspace files to submit
    const workspaceFilesPayload = files.map(f => ({
      name: f.name,
      code: f.code,
      language: f.language
    }));

    const activeFile = files.find(f => f.id === activeFileId);
    const activeFilename = activeFile ? activeFile.name : "main.py";

    try {
      const res = await api.post('/analysis/submit', {
        session_id: sessionId.current,
        code: currentCode,
        language: language,
        filename: activeFilename,
        workspace_files: workspaceFilesPayload
      });
      sessionStorage.setItem('acpis_last_analysis_result', JSON.stringify(res.data));
      navigate('/dashboard', { state: { tab: 'report', analysisResult: res.data } });
    } catch {
      setExecutionOutput('Analysis Error: Could not reach local intelligence engine.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const ws = useRef<WebSocket | null>(null);

  const initWebSocket = () => {
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      return ws.current;
    }

    if (ws.current) {
      try {
        ws.current.close();
      } catch {
        // Socket may already be closed.
      }
    }

    const socket = new WebSocket(`${WS_BASE_URL}/execution/ws/execute`);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'stdout') {
        setExecutionOutput(prev => prev + data.content);
      } else if (data.type === 'stderr') {
        setExecutionOutput(prev => prev + data.content);
      } else if (data.type === 'error') {
        setExecutionOutput(prev => prev + `\n[ERROR]: ${data.content}`);
        setIsExecuting(false);
        if (startTimeRef.current) {
          setExecutionTime(Number(((performance.now() - startTimeRef.current) / 1000).toFixed(3)));
        }
        setExitCode(1);
      } else if (data.type === 'system') {
        setIsExecuting(false);
        if (startTimeRef.current) {
          setExecutionTime(Number(((performance.now() - startTimeRef.current) / 1000).toFixed(3)));
        }
        if (data.content && data.content.includes('exit code')) {
          try {
            const exitCodeMatch = data.content.split('exit code').pop()?.trim();
            if (exitCodeMatch !== undefined) {
              setExitCode(parseInt(exitCodeMatch, 10));
            }
          } catch {
            setExitCode(0);
          }
        }
      }
    };

    socket.onerror = () => {
      setExecutionOutput(prev => prev + '\n[SYSTEM_ERROR]: WebSocket connection error.');
      setIsExecuting(false);
      if (startTimeRef.current) {
        setExecutionTime(Number(((performance.now() - startTimeRef.current) / 1000).toFixed(3)));
      }
      setExitCode(-1);
    };

    socket.onclose = () => {
      setIsExecuting(false);
      if (startTimeRef.current) {
        setExecutionTime(prev => prev ?? Number(((performance.now() - startTimeRef.current!) / 1000).toFixed(3)));
      }
    };

    ws.current = socket;
    return socket;
  };

  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const handleExecute = () => {
    if (!sessionId.current) {
      setExecutionOutput('System Error: Session not initialized. Check backend connection.');
      return;
    }

    // Force close any existing connection to ensure clean workspace run output
    if (ws.current) {
      try {
        ws.current.close();
      } catch { /* silent */ }
      ws.current = null;
    }

    setExecutionOutput('');
    setIsExecuting(true);
    setExecutionTime(null);
    setExitCode(null);
    startTimeRef.current = performance.now();

    const currentCode = editorRef.current ? editorRef.current.getValue() : code;
    const socket = initWebSocket();
    
    const payload = JSON.stringify({
      session_id: sessionId.current,
      code: currentCode,
      language: language
    });

    if (socket.readyState === WebSocket.CONNECTING) {
      const existingOnOpen = socket.onopen;
      socket.onopen = function(event) {
        if (existingOnOpen) existingOnOpen.call(this, event);
        socket.send(payload);
      };
    } else if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    } else {
      setExecutionOutput('System Error: Failed to establish real-time execution connection.');
      setIsExecuting(false);
    }
  };

  const handleStop = () => {
    if (ws.current) {
      try {
        ws.current.close();
      } catch {
        // Socket may already be closed.
      }
    }
    initWebSocket();
    setIsExecuting(false);
    setExecutionOutput(prev => prev + '\n[SYSTEM]: Execution aborted by user.');
    if (startTimeRef.current) {
      setExecutionTime(Number(((performance.now() - startTimeRef.current) / 1000).toFixed(3)));
    }
    setExitCode(-1);
  };

  useEffect(() => {
    triggerExecuteRef.current = handleExecute;
    triggerFullscreenRef.current = toggleFullscreen;
    triggerAnalysisRef.current = runAnalysis;
    triggerStopRef.current = handleStop;
    triggerClearRef.current = () => {
      setExecutionOutput('');
      setExecutionTime(null);
      setExitCode(null);
    };
    triggerShortcutsModalRef.current = () => setIsShortcutsModalOpen(prev => !prev);
    triggerDashboardRef.current = () => navigate('/dashboard');
    triggerWorkspaceRef.current = () => navigate('/editor');
  });

  // Keyboard shortcut Ctrl+Enter, Escape, and Sidebar Toggle listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Run Code: Ctrl+Enter (only if Shift is not pressed)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleExecute();
      }
      // 2. Toggle Sidebar: Ctrl+B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
      // 3. Zen Mode: Alt+Z
      if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        toggleFullscreen();
      }
      // 4. Get Code Review: Ctrl+Shift+Enter
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        runAnalysis();
      }
      // 5. Stop Execution: Shift+Escape
      if (e.shiftKey && e.key === 'Escape') {
        e.preventDefault();
        handleStop();
      }
      // 6. Clear Output: Alt+C
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setExecutionOutput('');
      }
      // 7. Go to Dashboard: Alt+D
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        navigate('/dashboard');
      }
      // 8. Go to Workspace: Alt+W
      if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        navigate('/editor');
      }
      // 9. Toggle Shortcuts Modal: Ctrl+Shift+/ (Ctrl+?)
      if ((e.ctrlKey || e.metaKey) && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        setIsShortcutsModalOpen(prev => !prev);
      }
      // 10. Manual Save: Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      }
      // 11. Escape key behavior: close modal first, then exit Zen mode
      if (e.key === 'Escape') {
        if (isShortcutsModalOpen) {
          e.preventDefault();
          setIsShortcutsModalOpen(false);
        } else if (isFullscreen) {
          if (document.fullscreenElement) {
            e.preventDefault();
            toggleFullscreen();
          } else {
            setIsFullscreen(false);
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [code, language, currentSessionId, isFullscreen, isShortcutsModalOpen, files, activeFileId]);



  return (
    <div className="h-screen w-screen flex flex-col z-10 relative overflow-hidden bg-background">
      
      {/* Unified Merged Header */}
      {!isFullscreen && (
      <nav className="w-full bg-[#020617]/70 backdrop-blur-md border-b border-white/10 px-6 py-2.5 flex justify-between items-center z-50 sticky top-0 shrink-0">
        <div className="flex items-center gap-6">
          {/* Snappy Sidebar Toggler on Left */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 border border-white/10 text-slate-400 hover:text-white rounded-lg transition-colors hover:bg-white/5"
            title={isSidebarOpen ? "Hide Left Sidebar (Ctrl+B)" : "Show Left Sidebar (Ctrl+B)"}
          >
            <ChevronLeft size={16} className={`transition-transform duration-200 ${!isSidebarOpen ? 'rotate-180' : ''}`} />
          </button>

          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform">
              <Cpu className="text-white" size={18} />
            </div>
            <span className="text-sm font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
              ADAPTIVE COGNITIVE
            </span>
          </Link>
          
          <div className="hidden md:flex gap-5 items-center">
            <Link 
              to="/dashboard" 
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
              title="Shortcut: Alt+D"
            >
              <LayoutDashboard size={13} />
              Dashboard
            </Link>
            <Link 
              to="/editor" 
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-400"
              title="Shortcut: Alt+W"
            >
              <Terminal size={13} />
              Workspace
            </Link>
            <div className="h-4 w-[1px] bg-white/10" />
            <button 
              onClick={handleManualSave}
              disabled={!activeFileId}
              className="text-[10px] text-slate-400 hover:text-cyan-300 font-mono select-none px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Click to save immediately (Ctrl+S)"
            >
              Saved: {activeFileId ? (fileSavedTimes[activeFileId] || 'Just now') : 'not saved yet'}
            </button>
          </div>
        </div>

        {/* Unified Editor Actions (Right side of navbar) */}
        <div className="flex items-center gap-2.5">

          <select 
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-black/40 border border-white/10 text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-cyan-500/50 cursor-pointer font-bold"
          >
            <option value="python" className="bg-[#0c101b] text-slate-200">Python 3</option>
            <option value="c" className="bg-[#0c101b] text-slate-200">C</option>
            <option value="cpp" className="bg-[#0c101b] text-slate-200">C++</option>
            <option value="java" className="bg-[#0c101b] text-slate-200">Java (javac)</option>
          </select>

          {/* Review code analysis */}
          <button 
            onClick={runAnalysis} 
            disabled={isAnalyzing || backendStatus !== 'online'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all shadow-md text-white shadow-indigo-900/10"
            title="Shortcut: Ctrl+Shift+Enter"
          >
            <Brain size={14} className={isAnalyzing ? 'animate-pulse text-cyan-300' : ''} /> 
            Review
          </button>

          {/* Stop / Run triggers */}
          {isExecuting ? (
            <button 
              onClick={handleStop}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 rounded-lg text-xs font-bold text-red-400 transition-all animate-pulse"
              title="Shortcut: Shift+Esc"
            >
              Stop
            </button>
          ) : (
            <button 
              onClick={handleExecute}
              disabled={backendStatus !== 'online'}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all shadow-lg text-white"
              title="Shortcut: Ctrl+Enter"
            >
              <Play size={14} /> Run
            </button>
          )}

          {/* Keyboard Shortcuts Help Trigger */}
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            className="p-1.5 border border-white/10 text-slate-400 hover:text-white rounded-lg transition-colors hover:bg-white/5"
            title="Keyboard Shortcuts (Ctrl+Shift+/)"
          >
            <HelpCircle size={16} />
          </button>

          {/* Snappy Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 border border-white/10 text-slate-400 hover:text-white rounded-lg transition-colors hover:bg-white/5"
            title={isFullscreen ? "Exit Zen Mode (Alt+Z or Esc)" : "Enter Zen Mode (Alt+Z)"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </nav>
      )}

      {/* Main Workspace Panels Layout */}
      <div className="flex-grow w-full flex overflow-hidden min-h-0 relative">
        
        {/* Collapsible Sidebar Wrapper */}
        <div 
          className="flex shrink-0 h-full overflow-hidden"
          style={{ width: (isSidebarOpen && !isFullscreen) ? '16rem' : '0' }}
        >
          <SessionPanel 
            stats={stats} 
            backendStatus={backendStatus}
            localMetrics={localMetrics}
            files={files}
            activeFileId={activeFileId}
            selectedFileIds={selectedFileIds}
            language={language}
            onFileSelect={handleFileSelect}
            onFileClick={handleFileClick}
            onFileCreate={handleFileCreate}
            onFileClose={handleFileClose}
            onFileRename={handleFileRename}
            onFileDownload={handleFileDownload}
            onBulkClose={handleBulkClose}
            onBulkDownload={handleBulkDownload}
          />
        </div>

        {/* Code editor workspace + execution console panels */}
        <div className={`flex-grow flex ${consolePosition === 'bottom' ? 'flex-col' : 'flex-row'} bg-[#1e1e1e] min-h-0 min-w-0 overflow-hidden relative`}>
          {/* Overlay when no file is active */}
          {!activeFileId && (
            <div className="absolute inset-0 bg-[#070b14]/90 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
              <div className="max-w-md bg-white/[0.02] border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-5 shadow-2xl backdrop-blur-lg">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
                  <FileCode2 size={32} />
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-bold text-white tracking-wide">No Active File Open</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Create a new file in the sidebar, or click below to quickly initialize a default Python scratchpad to begin coding.
                  </p>
                </div>
                <button
                  onClick={() => handleFileCreate('main.py')}
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-1.5"
                >
                  Create Scratchpad File
                </button>
              </div>
            </div>
          )}
          {isFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="absolute top-4 right-6 z-50 px-3 py-1.5 bg-[#080d1a]/85 hover:bg-[#0c1222] border border-white/10 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold backdrop-blur-md shadow-lg"
              title="Exit Zen Mode (Esc)"
            >
              <Minimize2 size={13} /> Exit Zen Mode
            </button>
          )}
          <EditorPanel 
            code={code} 
            language={language} 
            onChange={handleEditorChange} 
            onMount={handleEditorMount} 
          />
          <ExecutionPanel 
            executionOutput={executionOutput} 
            isExecuting={isExecuting} 
            onClearOutput={() => {
              setExecutionOutput('');
              setExecutionTime(null);
              setExitCode(null);
            }}
            code={code}
            language={language}
            executionTime={executionTime}
            exitCode={exitCode}
            consolePosition={consolePosition}
            onTogglePosition={handleToggleConsolePosition}
          />
        </div>
      </div>



      {/* Glassmorphic keyboard shortcuts cheat sheet modal overlay */}
      {isShortcutsModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
          onClick={() => setIsShortcutsModalOpen(false)}
        >
          <div 
            className="bg-[#0b0f19]/90 border border-white/10 p-6 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col gap-4 text-slate-200 relative backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-black tracking-widest text-xs uppercase">Keyboard Shortcuts</span>
              </div>
              <button 
                onClick={() => setIsShortcutsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors text-xs font-bold font-mono px-2 py-1 hover:bg-white/5 rounded"
              >
                ESC
              </button>
            </div>

            {/* Content list */}
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
              
              {/* Category: Workspace */}
              <div>
                <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 font-mono">Workspace & Files</h4>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                    <span className="text-xs text-slate-300 font-bold">Run Code</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Ctrl</kbd>
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Enter</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                    <span className="text-xs text-slate-300 font-bold">Stop Execution</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Shift</kbd>
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Esc</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                    <span className="text-xs text-slate-300 font-bold">Review</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Ctrl</kbd>
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Shift</kbd>
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Enter</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                    <span className="text-xs text-slate-300 font-bold">Clear Console</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Alt</kbd>
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">C</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category: Interface */}
              <div>
                <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 font-mono">Interface Toggles</h4>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                    <span className="text-xs text-slate-300 font-bold">Toggle Sidebar</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Ctrl</kbd>
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">B</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                    <span className="text-xs text-slate-300 font-bold">Toggle Zen Mode</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Alt</kbd>
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Z</kbd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category: Navigation */}
              <div>
                <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 font-mono">Navigation</h4>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                    <span className="text-xs text-slate-300 font-bold">Go to Dashboard</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Alt</kbd>
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">D</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                    <span className="text-xs text-slate-300 font-bold">Go to Workspace</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Alt</kbd>
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">W</kbd>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                    <span className="text-xs text-slate-300 font-bold">Toggle Shortcuts Panel</span>
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Ctrl</kbd>
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">Shift</kbd>
                      <kbd className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[10px] font-mono text-slate-300 shadow">/</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
              <button 
                onClick={() => setIsShortcutsModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-all text-white shadow-md shadow-indigo-900/20"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorPage;
