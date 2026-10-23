import { useLocation, Link, useNavigate } from 'react-router-dom';
import { type ReactNode, useEffect } from 'react';
import { Cpu, LayoutDashboard, Terminal } from 'lucide-react';
import '../../styles/App.css';

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === '/';
  const isEditor = location.pathname === '/editor';

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Go to Dashboard: Alt+D
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        navigate('/dashboard');
      }
      // Go to Workspace: Alt+W
      if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        navigate('/editor');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col">
      <div className="neural-bg" />
      <div className="glow-mesh" />
      
      {!isLanding && !isEditor && (
        <nav className="w-full bg-[#020617]/70 backdrop-blur-md border-b border-white/10 px-8 py-3 flex justify-between items-center z-50 sticky top-0">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform">
                <Cpu className="text-white" size={18} />
              </div>
              <span className="text-sm font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                ADAPTIVE COGNITIVE
              </span>
            </Link>
            <div className="hidden md:flex gap-6 items-center">
              <Link 
                to="/dashboard" 
                className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  location.pathname === '/dashboard' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard size={14} />
                Dashboard
              </Link>
              <Link 
                to="/editor" 
                className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  location.pathname === '/editor' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal size={14} />
                Workspace
              </Link>
            </div>
          </div>
        </nav>
      )}
      
      <div className="flex-grow w-full flex flex-col min-h-0 relative">
        {children}
      </div>
    </div>
  );
}
