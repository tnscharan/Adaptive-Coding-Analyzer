import { useState } from 'react';
import { Keyboard, BarChart2, ChevronDown, FolderOpen, FileCode2, Download, Edit3, Check, X } from 'lucide-react';

export type WorkspaceFile = {
  id: string;
  name: string;
  code: string;
  language: string;
};

type MetricItem = {
  label: string;
  value: string | number;
  tone: string;
};

type SessionPanelProps = {
  stats: {
    wpm: number;
    pauses: number;
    edits: number;
    backspaces: number;
  };
  backendStatus: 'connecting' | 'online' | 'offline';
  localMetrics?: MetricItem[];
  files: WorkspaceFile[];
  activeFileId: string | null;
  selectedFileIds?: string[];
  language: string;
  onFileSelect: (id: string) => void;
  onFileClick?: (id: string, ctrlKey: boolean) => void;
  onFileCreate: (name: string, content?: string) => void;
  onFileClose: (id: string) => void;
  onFileRename: (id: string, newName: string) => void;
  onFileDownload: (file: WorkspaceFile, format: 'pdf' | 'txt' | 'doc' | 'native') => void;
  onBulkClose?: (ids: string[]) => void;
  onBulkDownload?: (ids: string[], format: 'pdf' | 'txt' | 'doc' | 'native') => void;
};

export default function SessionPanel({ 
  stats, 
  localMetrics = [],
  files = [],
  activeFileId,
  selectedFileIds = [],
  language,
  onFileSelect,
  onFileClick,
  onFileCreate,
  onFileClose,
  onFileRename,
  onFileDownload,
  onBulkClose = () => {},
  onBulkDownload = () => {}
}: SessionPanelProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRhythmOpen, setIsRhythmOpen] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [downloadMenuFileId, setDownloadMenuFileId] = useState<string | null>(null);
  
  // Renaming states
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renamedName, setRenamedName] = useState('');

  // Extract the direct metrics
  const linesMetric = localMetrics.find(m => m.label === 'Lines');
  const linesValue = linesMetric ? linesMetric.value : '--';

  const flowPathsMetric = localMetrics.find(m => m.label === 'Flow Paths');
  const flowPathsValue = flowPathsMetric ? flowPathsMetric.value : '--';
  const flowPathsTone = flowPathsMetric ? flowPathsMetric.tone : 'text-emerald-300';

  // Extract the collapsed metrics
  const loopsMetric = localMetrics.find(m => m.label === 'Loops');
  const loopsValue = loopsMetric ? loopsMetric.value : '--';
  const loopsTone = loopsMetric ? loopsMetric.tone : 'text-indigo-300';

  const structureMetric = localMetrics.find(m => m.label === 'Structure');
  const structureValue = structureMetric ? structureMetric.value : '--';
  const structureTone = structureMetric ? structureMetric.tone : 'text-emerald-300';

  const commentsMetric = localMetrics.find(m => m.label === 'Comments');
  const commentsValue = commentsMetric ? commentsMetric.value : '--';
  const commentsTone = commentsMetric ? commentsMetric.tone : 'text-slate-300';

  const handleCreateConfirm = () => {
    if (!newFileName.trim()) return;
    onFileCreate(newFileName.trim());
    setNewFileName('');
    setIsCreating(false);
  };

  const handleRenameConfirm = (id: string) => {
    if (!renamedName.trim()) return;
    onFileRename(id, renamedName.trim());
    setRenamingFileId(null);
  };

  const handleOpenFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    filesArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onFileCreate(file.name, text);
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  const getPlaceholderExtension = () => {
    switch (language) {
      case 'java': return 'Main.java';
      case 'c': return 'main.c';
      case 'cpp': return 'main.cpp';
      default: return 'script.py';
    }
  };

  return (
    <div className="w-full h-full border-r border-white/10 p-4 flex flex-col gap-4 bg-[#070b14]/75 backdrop-blur-md overflow-hidden shrink-0 select-none">
      
      {/* SECTION 1: WORKSPACE FILES */}
      <div className="flex flex-col gap-2.5 flex-1 min-h-0">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <FolderOpen size={13} className="text-cyan-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workspace Files</span>
          </div>
          {!isCreating && (
            <div className="flex gap-1.5 items-center">
              <button
                onClick={() => {
                  setIsCreating(true);
                  setNewFileName(getPlaceholderExtension());
                }}
                className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors px-1.5 py-0.5 border border-cyan-500/20 rounded bg-cyan-500/5 hover:bg-cyan-500/10"
                title="Create new file"
              >
                + New File
              </button>
              <label
                className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors px-1.5 py-0.5 border border-cyan-500/20 rounded bg-cyan-500/5 hover:bg-cyan-500/10 cursor-pointer flex items-center justify-center"
                title="Open local files"
              >
                + Open Files
                <input
                  type="file"
                  multiple
                  onChange={handleOpenFiles}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {isCreating && (
          <div className="p-2 border border-cyan-500/30 bg-[#0c101b] rounded-lg flex flex-col gap-2">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.py"
              className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500/50 font-mono"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateConfirm();
                if (e.key === 'Escape') setIsCreating(false);
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsCreating(false)}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold text-slate-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConfirm}
                className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold transition-colors"
              >
                Save File
              </button>
            </div>
          </div>
        )}

        {/* Bulk Action Controls */}
        {selectedFileIds.length > 1 && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-purple-950/20 border border-purple-500/20 text-purple-200 animate-fadeIn text-[10px] font-bold">
            <span className="text-slate-400 font-mono text-[9px]">{selectedFileIds.length} Selected</span>
            <div className="flex gap-1.5 items-center">
              <button
                onClick={() => onBulkDownload(selectedFileIds, 'native')}
                className="px-1.5 py-0.5 border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded text-[9px] transition-colors"
                title="Download selected as Source files"
              >
                Download
              </button>
              <button
                onClick={() => onBulkClose(selectedFileIds)}
                className="px-1.5 py-0.5 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded text-[9px] transition-colors"
                title="Close selected files"
              >
                Close
              </button>
              <button
                onClick={() => onFileClick?.(activeFileId || '', false)}
                className="p-0.5 text-slate-400 hover:text-white transition-colors"
                title="Clear Selection"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* File items list */}
        <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1 min-h-[150px]">
          {files.length === 0 ? (
            <div className="text-[10px] text-slate-500 text-center py-4 border border-dashed border-white/5 rounded-lg leading-normal">
              No files created yet.<br />Create a file to start coding.
            </div>
          ) : (
            files.map((file) => {
              const isActive = file.id === activeFileId;
              const isSelected = selectedFileIds.includes(file.id);
              const isRenaming = renamingFileId === file.id;
              const isDownloadOpen = downloadMenuFileId === file.id;

              return (
                <div
                  key={file.id}
                  onClick={(e) => {
                    if (!isRenaming) {
                      if (onFileClick) {
                        onFileClick(file.id, e.ctrlKey || e.metaKey);
                      } else {
                        onFileSelect(file.id);
                      }
                    }
                  }}
                  className={`flex flex-col p-2 rounded-lg border transition-all cursor-pointer group relative ${
                    isActive
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                      : isSelected
                        ? 'bg-purple-600/10 border-purple-500/20 text-purple-300'
                        : 'bg-white/[0.01] border-white/5 text-slate-400 hover:bg-white/[0.03] hover:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full min-w-0">
                    <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-grow">
                      <FileCode2 size={13} className={isActive ? 'text-cyan-400' : 'text-slate-500'} />
                      {isRenaming ? (
                        <input
                          type="text"
                          value={renamedName}
                          onChange={(e) => setRenamedName(e.target.value)}
                          className="bg-black/60 border border-cyan-500/40 rounded px-1.5 py-0.5 text-xs text-white outline-none font-mono flex-grow min-w-0"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameConfirm(file.id);
                            if (e.key === 'Escape') setRenamingFileId(null);
                          }}
                        />
                      ) : (
                        <span className={`text-xs font-mono truncate ${isActive ? 'font-bold' : ''}`}>{file.name}</span>
                      )}
                    </div>
                    
                    {/* File operations icons */}
                    <div className="flex items-center gap-1 shrink-0 ml-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      {isRenaming ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameConfirm(file.id);
                            }}
                            className="p-1 hover:text-emerald-400 rounded hover:bg-white/5 transition-colors"
                            title="Save rename"
                          >
                            <Check size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingFileId(null);
                            }}
                            className="p-1 hover:text-rose-400 rounded hover:bg-white/5 transition-colors"
                            title="Cancel rename"
                          >
                            <X size={11} />
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Rename trigger */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingFileId(file.id);
                              setRenamedName(file.name);
                            }}
                            className="p-1 hover:text-cyan-400 rounded hover:bg-white/5 transition-colors"
                            title="Rename file"
                          >
                            <Edit3 size={11} />
                          </button>
                          {/* Download trigger */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDownloadMenuFileId(isDownloadOpen ? null : file.id);
                            }}
                            className={`p-1 hover:text-white rounded transition-colors ${isDownloadOpen ? 'text-white bg-white/10' : 'hover:bg-white/5'}`}
                            title="Download formats"
                          >
                            <Download size={11} />
                          </button>
                          {/* Close button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onFileClose(file.id);
                            }}
                            className="p-1 hover:text-rose-400 rounded hover:bg-rose-500/10 transition-colors"
                            title="Close file"
                          >
                            <X size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline download choices row to resolve clipping issues inside scroll containment */}
                  {isDownloadOpen && !isRenaming && (
                    <div 
                      className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/5 w-full justify-between"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          onFileDownload(file, 'native');
                          setDownloadMenuFileId(null);
                        }}
                        className="px-1.5 py-0.5 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/20 rounded text-[9px] font-bold text-cyan-300 transition-colors flex-grow text-center"
                        title="Download standard source file code extension"
                      >
                        Source
                      </button>
                      <button
                        onClick={() => {
                          onFileDownload(file, 'pdf');
                          setDownloadMenuFileId(null);
                        }}
                        className="px-1.5 py-0.5 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/20 rounded text-[9px] font-bold text-indigo-300 transition-colors flex-grow text-center"
                        title="Download formatted code as PDF document"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => {
                          onFileDownload(file, 'txt');
                          setDownloadMenuFileId(null);
                        }}
                        className="px-1.5 py-0.5 bg-slate-950/40 hover:bg-slate-900/60 border border-slate-500/20 rounded text-[9px] font-bold text-slate-300 transition-colors flex-grow text-center"
                        title="Download raw plain text file"
                      >
                        TXT
                      </button>
                      <button
                        onClick={() => {
                          onFileDownload(file, 'doc');
                          setDownloadMenuFileId(null);
                        }}
                        className="px-1.5 py-0.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/20 rounded text-[9px] font-bold text-emerald-300 transition-colors flex-grow text-center"
                        title="Download Word doc document"
                      >
                        Word
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="h-px bg-white/5" />

      {/* SECTION 2: COLLAPSIBLE RHYTHM TELEMETRY */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setIsRhythmOpen(prev => !prev)}
          className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left"
          title="Toggle Rhythm Telemetry"
        >
          <div className="flex items-center gap-1.5">
            <Keyboard size={13} className="text-cyan-400" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Rhythm Telemetry</span>
          </div>
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isRhythmOpen ? 'rotate-180' : ''}`} />
        </button>

        {isRhythmOpen && (
          <div className="grid grid-cols-3 gap-2 p-1 animate-fadeIn">
            {/* Speed */}
            <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2 flex flex-col justify-between min-w-0">
              <span className="text-[8px] text-slate-500 uppercase font-black">Speed</span>
              <span className="text-[11px] font-black text-cyan-300 font-mono mt-1 whitespace-nowrap overflow-hidden text-ellipsis">{stats.wpm} WPM</span>
            </div>
            {/* Lines */}
            <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2 flex flex-col justify-between min-w-0">
              <span className="text-[8px] text-slate-500 uppercase font-black">Lines</span>
              <span className="text-[11px] font-black text-indigo-300 font-mono mt-1 overflow-hidden text-ellipsis">{linesValue}</span>
            </div>
            {/* Flow Paths */}
            <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2 flex flex-col justify-between min-w-0">
              <span className="text-[8px] text-slate-500 uppercase font-black">Flow Paths</span>
              <span className={`text-[11px] font-black mt-1 font-mono overflow-hidden text-ellipsis ${flowPathsTone}`}>{flowPathsValue}</span>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-white/5" />

      {/* SECTION 3: COLLAPSIBLE SECONDARY TELEMETRY */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setIsDropdownOpen(prev => !prev)}
          className="flex items-center justify-between w-full px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left"
          title="Toggle additional telemetry metrics"
        >
          <div className="flex items-center gap-1.5">
            <BarChart2 size={13} className="text-indigo-400" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Additional Metrics</span>
          </div>
          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="flex flex-col gap-2 p-2 border border-white/5 bg-white/[0.01] rounded-lg animate-fadeIn">
            <div className="grid grid-cols-2 gap-2">
              {/* Pauses */}
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2 flex flex-col justify-between">
                <span className="text-[8px] text-slate-500 uppercase font-black">Pauses</span>
                <span className="text-xs font-black text-indigo-300 font-mono mt-0.5">{stats.pauses}</span>
              </div>
              {/* Edits / Deletes */}
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2 flex flex-col justify-between">
                <span className="text-[8px] text-slate-500 uppercase font-black">Edits / Del</span>
                <span className="text-xs font-black text-emerald-300 font-mono mt-0.5">{stats.edits} / {stats.backspaces}</span>
              </div>
              {/* Loops */}
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2 flex flex-col justify-between">
                <span className="text-[8px] text-slate-500 uppercase font-black">Loops</span>
                <span className={`text-xs font-black font-mono mt-0.5 ${loopsTone}`}>{loopsValue}</span>
              </div>
              {/* Structure */}
              <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2 flex flex-col justify-between">
                <span className="text-[8px] text-slate-500 uppercase font-black">Structure</span>
                <span className={`text-xs font-black font-mono mt-0.5 ${structureTone}`}>{structureValue}</span>
              </div>
            </div>
            {/* Comments ratio */}
            <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2 flex justify-between items-center px-3">
              <span className="text-[8px] text-slate-500 uppercase font-black">Comments Ratio</span>
              <span className={`text-xs font-black font-mono ${commentsTone}`}>{commentsValue}</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
