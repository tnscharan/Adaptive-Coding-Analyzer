import { Terminal, Trash2, Columns, Rows } from 'lucide-react';
import { estimateComplexity } from '../../../services/localIntelligence';
import { useState, useRef, useEffect } from 'react';

type ExecutionPanelProps = {
  executionOutput: string;
  isExecuting: boolean;
  onClearOutput?: () => void;
  code?: string;
  language?: string;
  executionTime?: number | null;
  exitCode?: number | null;
  consolePosition?: 'bottom' | 'right';
  onTogglePosition?: () => void;
};

export default function ExecutionPanel({
  executionOutput,
  isExecuting,
  onClearOutput,
  code = '',
  language = 'python',
  executionTime = null,
  exitCode = null,
  consolePosition = 'bottom',
  onTogglePosition
}: ExecutionPanelProps) {
  const complexity = estimateComplexity(code, language);
  
  const [panelHeight, setPanelHeight] = useState(() => {
    const cached = localStorage.getItem('acpis:console:height');
    return cached ? parseInt(cached) : 300;
  });
  
  const [panelWidth, setPanelWidth] = useState(() => {
    const cached = localStorage.getItem('acpis:console:width');
    return cached ? parseInt(cached) : 380;
  });

  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = consolePosition === 'bottom' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      if (consolePosition === 'bottom') {
        const newHeight = window.innerHeight - e.clientY;
        const clampedHeight = Math.max(80, Math.min(window.innerHeight - 100, newHeight));
        setPanelHeight(clampedHeight);
        localStorage.setItem('acpis:console:height', clampedHeight.toString());
      } else {
        const newWidth = window.innerWidth - e.clientX;
        const clampedWidth = Math.max(250, Math.min(window.innerWidth - 300, newWidth));
        setPanelWidth(clampedWidth);
        localStorage.setItem('acpis:console:width', clampedWidth.toString());
      }
      
      // Let editor resize layout
      window.dispatchEvent(new Event('resize'));
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [consolePosition]);

  const hasOutput = executionOutput.trim().length > 0 || isExecuting;
  const displayTimeComplexity = hasOutput ? complexity.timeComplexity : '--';
  const displaySpaceComplexity = hasOutput ? complexity.spaceComplexity : '--';
  const displayExplanation = hasOutput 
    ? complexity.explanation 
    : 'No active execution output. Run code to analyze complexity estimates.';

  const displayTime = hasOutput && executionTime !== null ? `${executionTime}s` : '--';
  const displayExitCode = hasOutput && exitCode !== null ? (
    <span className={`text-xs font-mono font-bold ${exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
      {exitCode === 0 ? 'Success (0)' : `Error (${exitCode})`}
    </span>
  ) : (
    <span className="text-xs font-mono font-bold text-slate-500">--</span>
  );

  return (
    <div 
      style={consolePosition === 'bottom' ? { height: `${panelHeight}px` } : { width: `${panelWidth}px` }}
      className={`relative flex ${
        consolePosition === 'bottom' ? 'flex-row w-full border-t' : 'flex-col h-full border-l'
      } bg-[#070b15]/95 border-white/10 shrink-0 select-none min-h-0 min-w-0`}
    >
      {/* Border Resize Handle */}
      {consolePosition === 'bottom' ? (
        <div 
          onMouseDown={startResizing}
          className="h-1 cursor-row-resize absolute top-0 left-0 right-0 hover:bg-cyan-500/50 transition-colors z-[60]"
          title="Drag to resize console height"
        />
      ) : (
        <div 
          onMouseDown={startResizing}
          className="w-1 cursor-col-resize absolute top-0 bottom-0 left-0 hover:bg-cyan-500/50 transition-colors z-[60]"
          title="Drag to resize console width"
        />
      )}

      {/* 1. Console Output Section */}
      <div className="flex-grow flex flex-col min-w-0 min-h-0 relative">
        {/* Console Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/30 text-slate-400">
          <div className="flex items-center gap-1.5">
            <Terminal size={12} className="text-cyan-400" />
            <span className="font-bold text-[9px] uppercase tracking-wider text-slate-300">Console Output</span>
            {isExecuting && (
              <span className="flex items-center gap-1 ml-1 text-[8px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                RUNNING
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3.5">
            {/* Position Toggle Button */}
            {onTogglePosition && (
              <button 
                onClick={onTogglePosition}
                className="flex items-center gap-1 hover:text-white text-slate-400 transition-colors text-[9px] uppercase font-bold"
                title={consolePosition === 'bottom' ? "Move to Right Pane" : "Move to Bottom Pane"}
              >
                {consolePosition === 'bottom' ? <Columns size={11} /> : <Rows size={11} />}
                Layout
              </button>
            )}

            {onClearOutput && (
              <button 
                onClick={onClearOutput}
                className="flex items-center gap-1 hover:text-white text-slate-400 transition-colors text-[9px] uppercase font-bold"
                title="Clear Console Output (Alt+C)"
              >
                <Trash2 size={11} />
                Clear
              </button>
            )}
          </div>
        </div>
        
        {/* Terminal Content */}
        <div className="flex-grow p-3 overflow-y-auto font-mono text-[11px] leading-relaxed select-text">
          <pre className="text-slate-300 whitespace-pre-wrap font-mono">
            {executionOutput || '> Press Ctrl+Enter or click Run to execute code...'}
          </pre>
        </div>
      </div>

      {/* 2. Complexity Estimates & Stats Section */}
      <div 
        className={`${
          consolePosition === 'bottom' 
            ? 'w-80 border-l border-white/10 flex-shrink-0' 
            : 'h-72 border-t border-white/10 flex-shrink-0'
        } flex flex-col min-w-0 min-h-0 bg-black/10`}
      >
        {/* Complexity Header */}
        <div className="px-3 py-2 border-b border-white/10 bg-black/30 text-slate-300 font-bold text-[9px] uppercase tracking-wider">
          Complexity & Stats
        </div>
        
        {/* Complexity Content */}
        <div className="flex-grow p-3 overflow-y-auto flex flex-col gap-3 font-sans text-xs select-text">
          {/* Complexity section */}
          <div className="flex flex-col gap-2">
            <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Complexity Estimates</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.02] border border-white/5 p-2 rounded flex flex-col">
                <span className="text-[8px] text-slate-500 uppercase font-black">Time Complexity</span>
                <span className="text-xs font-mono font-bold text-indigo-300">{displayTimeComplexity}</span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-2 rounded flex flex-col">
                <span className="text-[8px] text-slate-500 uppercase font-black">Space Complexity</span>
                <span className="text-xs font-mono font-bold text-emerald-300">{displaySpaceComplexity}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal bg-white/[0.01] p-2 rounded border border-white/5">
              {displayExplanation}
            </p>
          </div>

          <div className="h-px bg-white/5" />

          {/* Stats section */}
          <div className="flex flex-col gap-2">
            <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Execution Stats</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.02] border border-white/5 p-2 rounded flex flex-col justify-center">
                <span className="text-[8px] text-slate-500 uppercase font-black">Run Duration</span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {displayTime}
                </span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-2 rounded flex flex-col justify-center">
                <span className="text-[8px] text-slate-500 uppercase font-black">Exit Status</span>
                {displayExitCode}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invisible full-screen drag overlay to prevent iframe/Monaco event hijacking */}
      {isResizing && (
        <div 
          className="fixed inset-0 z-[9999] pointer-events-auto" 
          style={{ cursor: consolePosition === 'bottom' ? 'row-resize' : 'col-resize' }}
        />
      )}
    </div>
  );
}
