import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Brain, LineChart, Activity, Cpu } from 'lucide-react';
import type { ReactNode } from 'react';

const Landing = () => {
  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center">
      {/* Navbar */}
      <nav className="w-full max-w-7xl px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/50">
            <Cpu className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tighter neon-text">ADAPTIVE COGNITIVE</span>
        </div>
        <div className="flex gap-8 items-center text-sm font-medium text-slate-400">
          <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
          <a href="#intelligence" className="hover:text-cyan-400 transition-colors">Intelligence</a>
          <Link to="/dashboard" className="btn-primary">Launch Interface</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-7xl px-8 flex flex-col items-center justify-center py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-cyan-400 text-xs font-mono mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            LOCAL SYSTEM ONLINE: COGNITIVE ANALYSIS ENGINE v2.0
          </div>
          <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tighter leading-tight">
            Analyze the <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">Mind</span> <br /> 
            Behind the Code.
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A fully local behavioral intelligence workspace for programmers. It tracks code structure, execution, and thinking patterns.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/editor" className="px-8 py-4 bg-cyan-500 text-white rounded-xl font-bold hover:bg-cyan-400 transition-all shadow-xl shadow-cyan-500/20">
              Start Session
            </Link>
            <Link to="/dashboard" className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all backdrop-blur-md flex items-center justify-center">
              View Analytics
            </Link>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full scroll-mt-32">
          <FeatureCard 
            icon={<Brain className="text-cyan-400" />}
            title="Cognitive Profiling"
            description="Identify your coding persona through behavioral rhythm and pattern recognition."
          />
          <FeatureCard 
            icon={<Activity className="text-indigo-400" />}
            title="Panic Detection"
            description="Real-time detection of stress patterns and trial-and-error debugging loops."
          />
          <FeatureCard 
            icon={<LineChart className="text-pink-400" />}
            title="Intelligence Forecasting"
            description="Predict interview readiness and algorithmic growth using ML models."
          />
        </div>

        {/* Intelligence Section */}
        <div id="intelligence" className="mt-40 w-full mb-20 scroll-mt-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card flex flex-col md:flex-row gap-12 items-center p-12 bg-gradient-to-br from-indigo-900/20 to-black/40 border-indigo-500/20"
          >
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                <Brain size={14} /> Cognitive Intelligence
              </div>
              <h2 className="text-4xl md:text-5xl font-black leading-tight">
                Not just syntax. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Deep Logical Analysis.</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                The local engine parses your Abstract Syntax Tree (AST) to measure exact cyclomatic complexity, loop density, and optimization logic. It identifies O(N^2) bottlenecks before they happen.
              </p>
              <ul className="space-y-3 mt-4">
                <li className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">OK</div> AST Complexity Scoring
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">OK</div> Maintainability Index
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                  <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">OK</div> Security Vulnerability Scans
                </li>
              </ul>
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-indigo-500 blur-[100px] opacity-20 rounded-full"></div>
              <div className="relative bg-black/60 border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden font-mono text-sm text-slate-300">
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
                <div><span className="text-pink-400">def</span> <span className="text-emerald-400">calculate_complexity</span>(code_ast):</div>
                <div className="pl-4 text-slate-500"># The Intelligence Engine in action</div>
                <div className="pl-4">loops = <span className="text-cyan-400">count_nodes</span>(code_ast, ast.For)</div>
                <div className="pl-4">complexity = base_score + (loops * <span className="text-purple-400">1.5</span>)</div>
                <div className="pl-4 mt-4 text-emerald-400">return <span className="text-slate-300">complexity</span></div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: ReactNode, title: string, description: string }) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className="glass-card"
  >
    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-4 border border-white/10">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
  </motion.div>
);

export default Landing;
