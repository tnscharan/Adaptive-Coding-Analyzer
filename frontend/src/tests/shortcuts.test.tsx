import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditorPage from '../features/editor/EditorPage';
import { useEffect } from 'react';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Brain: () => <div data-testid="brain-icon" />,
  Play: () => <div data-testid="play-icon" />,
  RotateCcw: () => <div data-testid="rotate-icon" />,
  FileCode2: () => <div data-testid="filecode-icon" />,
  ChevronLeft: () => <div data-testid="chevron-left-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  LayoutDashboard: () => <div data-testid="dashboard-icon" />,
  Terminal: () => <div data-testid="terminal-icon" />,
  Cpu: () => <div data-testid="cpu-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />,
  Minimize2: () => <div data-testid="minimize-icon" />,
  HelpCircle: () => <div data-testid="help-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  XCircle: () => <div data-testid="xcircle-icon" />,
  CheckCircle: () => <div data-testid="checkcircle-icon" />,
  Keyboard: () => <div data-testid="keyboard-icon" />,
  BarChart2: () => <div data-testid="barchart-icon" />,
  LineChart: () => <div data-testid="linechart-icon" />,
  Columns: () => <div data-testid="columns-icon" />,
  Rows: () => <div data-testid="rows-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  FolderOpen: () => <div data-testid="folder-open-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Edit3: () => <div data-testid="edit-icon" />,
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock api
vi.mock('../../services/api', () => ({
  api: {
    post: vi.fn(() => Promise.resolve({ data: { id: 1 } })),
    get: vi.fn(() => Promise.resolve({ data: {} })),
  },
  WS_BASE_URL: 'ws://localhost:8001',
}));

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => {
  const MockMonacoEditor = (props: any) => {
    useEffect(() => {
      if (props.onMount) {
        props.onMount({
          addCommand: vi.fn(),
          getValue: () => props.value || '',
          setValue: vi.fn(),
        }, {
          KeyMod: { CtrlCmd: 2048, Alt: 512, Shift: 1024 },
          KeyCode: { Enter: 3, KeyB: 32, US_BACKSLASH: 84, KeyZ: 56, EnterKey: 3, Escape: 9, KeyC: 33, US_SLASH: 85, KeyD: 34, KeyW: 53 }
        });
      }
    }, [props]);
    return <textarea data-testid="monaco-editor" value={props.value} onChange={(e) => props.onChange && props.onChange(e.target.value)} />;
  };
  return {
    default: MockMonacoEditor,
    loader: {
      config: vi.fn(),
    },
  };
});

describe('EditorPage Keyboard Shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('1. toggles keyboard shortcuts modal using Ctrl+Shift+/', async () => {
    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    // Modal should not be in document initially
    expect(screen.queryByText('Workspace & Files')).not.toBeInTheDocument();

    // Trigger keyboard event globally using resolved key '?' (Ctrl + ?)
    fireEvent.keyDown(window, { ctrlKey: true, key: '?' });

    // Modal should be visible now
    expect(screen.getByText('Workspace & Files')).toBeInTheDocument();
    expect(screen.getByText('Toggle Shortcuts Panel')).toBeInTheDocument();

    // Pressing Escape should close it
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Workspace & Files')).not.toBeInTheDocument();

    // Trigger keyboard event globally using key '/' and shiftKey (Ctrl+Shift+/)
    fireEvent.keyDown(window, { ctrlKey: true, shiftKey: true, key: '/' });
    expect(screen.getByText('Workspace & Files')).toBeInTheDocument();

    // Toggle back using Ctrl+?
    fireEvent.keyDown(window, { ctrlKey: true, key: '?' });
    expect(screen.queryByText('Workspace & Files')).not.toBeInTheDocument();
  });

  test('2. opens shortcuts modal by clicking the help button in header', async () => {
    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    // Help icon trigger should be present
    const helpBtn = screen.getByTitle('Keyboard Shortcuts (Ctrl+Shift+/)');
    expect(helpBtn).toBeInTheDocument();

    // Click help button
    fireEvent.click(helpBtn);

    // Modal should be visible
    expect(screen.getByText('Workspace & Files')).toBeInTheDocument();
  });

  test('3. toggles sidebar using Ctrl+B', async () => {
    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    // Find the sidebar toggle button
    const toggleBtn = screen.getByTitle('Hide Left Sidebar (Ctrl+B)');
    expect(toggleBtn).toBeInTheDocument();

    // Trigger keyboard event globally (Ctrl+B)
    fireEvent.keyDown(window, { ctrlKey: true, key: 'b' });

    // Tooltip should update to "Show Left Sidebar (Ctrl+B)"
    expect(screen.getByTitle('Show Left Sidebar (Ctrl+B)')).toBeInTheDocument();

    // Toggle back with Ctrl+B
    fireEvent.keyDown(window, { ctrlKey: true, key: 'b' });
    expect(screen.getByTitle('Hide Left Sidebar (Ctrl+B)')).toBeInTheDocument();
  });

  test('4. navigates using Alt+D and Alt+W', async () => {
    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>
    );

    // Press Alt+D
    fireEvent.keyDown(window, { altKey: true, key: 'd' });
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');

    // Press Alt+W
    fireEvent.keyDown(window, { altKey: true, key: 'w' });
    expect(mockNavigate).toHaveBeenCalledWith('/editor');
  });
});
