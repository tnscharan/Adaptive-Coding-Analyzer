import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Import components
import SessionPanel from '../features/editor/components/SessionPanel';
import MetricsPanel from '../features/editor/components/MetricsPanel';
import ExecutionPanel from '../features/editor/components/ExecutionPanel';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Keyboard: () => <div data-testid="keyboard-icon" />,
  BarChart2: () => <div data-testid="barchart-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  FolderOpen: () => <div data-testid="folder-open-icon" />,
  FileCode2: () => <div data-testid="file-code-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Terminal: () => <div data-testid="terminal-icon" />,
  Edit3: () => <div data-testid="edit-icon" />,
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

describe('SessionPanel Component', () => {
  const defaultStats = { wpm: 45, pauses: 3, edits: 10, backspaces: 2 };
  const mockFiles = [
    { id: '1', name: 'main.py', code: 'print("hello")', language: 'python' },
    { id: '2', name: 'script.java', code: 'System.out.println()', language: 'java' }
  ];
  const mockMetrics = [
    { label: 'Lines', value: '15', tone: 'text-cyan-300' },
    { label: 'Flow Paths', value: '2', tone: 'text-emerald-300' },
    { label: 'Loops', value: '0', tone: 'text-indigo-300' },
    { label: 'Structure', value: '1', tone: 'text-emerald-300' },
    { label: 'Comments', value: '10%', tone: 'text-slate-300' }
  ];

  test('1. renders typing speed WPM correctly', () => {
    render(
      <SessionPanel 
        stats={defaultStats} 
        backendStatus="online" 
        files={mockFiles}
        activeFileId="1"
        language="python"
        onFileSelect={vi.fn()}
        onFileCreate={vi.fn()}
        onFileClose={vi.fn()}
        onFileRename={vi.fn()}
        onFileDownload={vi.fn()}
        localMetrics={mockMetrics}
      />
    );
    expect(screen.getByText('45 WPM')).toBeInTheDocument();
  });

  test('2. renders lines and flow paths directly', () => {
    render(
      <SessionPanel 
        stats={defaultStats} 
        backendStatus="online" 
        files={mockFiles}
        activeFileId="1"
        language="python"
        onFileSelect={vi.fn()}
        onFileCreate={vi.fn()}
        onFileClose={vi.fn()}
        onFileRename={vi.fn()}
        onFileDownload={vi.fn()}
        localMetrics={mockMetrics}
      />
    );
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('3. renders file explorer list correctly', () => {
    render(
      <SessionPanel 
        stats={defaultStats} 
        backendStatus="online" 
        files={mockFiles}
        activeFileId="1"
        language="python"
        onFileSelect={vi.fn()}
        onFileCreate={vi.fn()}
        onFileClose={vi.fn()}
        onFileRename={vi.fn()}
        onFileDownload={vi.fn()}
        localMetrics={mockMetrics}
      />
    );
    expect(screen.getByText('main.py')).toBeInTheDocument();
    expect(screen.getByText('script.java')).toBeInTheDocument();
  });

  test('4. invokes file select callback on item click', () => {
    const handleSelect = vi.fn();
    render(
      <SessionPanel 
        stats={defaultStats} 
        backendStatus="online" 
        files={mockFiles}
        activeFileId="1"
        language="python"
        onFileSelect={handleSelect}
        onFileCreate={vi.fn()}
        onFileClose={vi.fn()}
        onFileRename={vi.fn()}
        onFileDownload={vi.fn()}
        localMetrics={mockMetrics}
      />
    );
    fireEvent.click(screen.getByText('script.java'));
    expect(handleSelect).toHaveBeenCalledWith('2');
  });

  test('4b. invokes file close callback on close button click', () => {
    const handleClose = vi.fn();
    render(
      <SessionPanel 
        stats={defaultStats} 
        backendStatus="online" 
        files={mockFiles}
        activeFileId="1"
        language="python"
        onFileSelect={vi.fn()}
        onFileCreate={vi.fn()}
        onFileClose={handleClose}
        onFileRename={vi.fn()}
        onFileDownload={vi.fn()}
        localMetrics={mockMetrics}
      />
    );
    const closeButtons = screen.getAllByTitle('Close file');
    expect(closeButtons.length).toBe(mockFiles.length);
    fireEvent.click(closeButtons[0]);
    expect(handleClose).toHaveBeenCalledWith('1');
  });

  test('5. renders collapsible additional metrics on toggle click', () => {
    render(
      <SessionPanel 
        stats={defaultStats} 
        backendStatus="online" 
        files={mockFiles}
        activeFileId="1"
        language="python"
        onFileSelect={vi.fn()}
        onFileCreate={vi.fn()}
        onFileClose={vi.fn()}
        onFileRename={vi.fn()}
        onFileDownload={vi.fn()}
        localMetrics={mockMetrics}
      />
    );
    
    // Check that Pauses (inside collapsible) is not rendered initially
    expect(screen.queryByText('Pauses')).not.toBeInTheDocument();

    // Toggle dropdown
    fireEvent.click(screen.getByText('Additional Metrics'));

    // Check that Pauses and comments ratio are now rendered
    expect(screen.getByText('Pauses')).toBeInTheDocument();
    expect(screen.getByText('Comments Ratio')).toBeInTheDocument();
  });
});

describe('MetricsPanel Component', () => {
  test('6. renders local metrics list accurately', () => {
    const mockMetrics = [
      { label: 'Lines', value: 25, tone: 'text-cyan-400' },
      { label: 'Complexity', value: 'Low', tone: 'text-emerald-400' }
    ];
    render(<MetricsPanel localMetrics={mockMetrics} />);
    expect(screen.getByText('Lines')).toBeInTheDocument();
    expect(screen.getByText('Complexity')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });
});

describe('ExecutionPanel Component', () => {
  test('7. renders stdout logs correctly', () => {
    render(<ExecutionPanel executionOutput="Hello world output\nFinished" isExecuting={false} />);
    expect(screen.getByText(/Hello world output/)).toBeInTheDocument();
  });

  test('8. renders default message when output is empty', () => {
    render(<ExecutionPanel executionOutput="" isExecuting={false} />);
    expect(screen.getByText(/Press Ctrl\+Enter or click Run/)).toBeInTheDocument();
  });

  test('9. renders clear button and invokes clear output callback', () => {
    const handleClear = vi.fn();
    render(<ExecutionPanel executionOutput="some logging" isExecuting={false} onClearOutput={handleClear} />);
    
    const clearBtn = screen.getByText('Clear');
    expect(clearBtn).toBeInTheDocument();
    
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledOnce();
  });
});
