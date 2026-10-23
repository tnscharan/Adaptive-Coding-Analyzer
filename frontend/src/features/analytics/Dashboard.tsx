import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  Radar, 
  AreaChart, 
  Area, 
  XAxis, 
  Tooltip, 
  CartesianGrid
} from 'recharts';
import { 
  Brain, 
  Zap, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw,
  LayoutDashboard,
  FileCode2,
  BookOpen,
  Download,
  Printer,
  Activity,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { api } from '../../services/api';
import type { ReactNode } from 'react';

type DashboardData = {
  total_sessions: number;
  executions_count: number;
  success_rate: number;
  most_used_language: string;
  average_complexity: number;
  profile_level: string;
  intelligence_score: number;
  confidence_level: number;
  weakness_radar: Record<string, number>;
  recent_sessions: Array<{ name: string; date?: string; score: number }>;
  readiness_score: number;
};

export default function Dashboard() {
  const location = useLocation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Tab state: 'overview' | 'report'
  const [activeTab, setActiveTab] = useState<'overview' | 'report'>(() => {
    const initialTab = location.state?.tab || 'overview';
    return initialTab === 'report' ? 'report' : 'overview';
  });

  // Code review AST report state
  const [analysisResult, setAnalysisResult] = useState(() => {
    const stateVal = location.state?.analysisResult;
    if (stateVal) return stateVal;
    const cached = sessionStorage.getItem('acpis_last_analysis_result');
    return cached ? JSON.parse(cached) : null;
  });

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/dashboard/1');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load dashboard data", err);
      setError("Local cognitive engine is offline. Start the backend locally to retrieve dynamic metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    setIsMounted(true);
  }, []);

  // Update states if routed here with custom state (e.g. from editor)
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
    if (location.state?.analysisResult) {
      setAnalysisResult(location.state.analysisResult);
    }
  }, [location.state]);

  const handleExportJSON = () => {
    if (!analysisResult) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(analysisResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `acpis_cognitive_report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-4 text-slate-400">
        <RefreshCw className="animate-spin text-cyan-400" size={32} />
        <span className="font-mono text-sm">Decoding cognitive synapse profiles...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-6 p-8 max-w-md mx-auto text-center">
        <AlertTriangle className="text-amber-500" size={48} />
        <h2 className="text-xl font-bold">Connection Refused</h2>
        <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
        <button 
          onClick={fetchDashboard} 
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold transition-all shadow-md"
        >
          Try Reconnecting
        </button>
      </div>
    );
  }

  // Pre-process chart data
  const radarData = Object.entries(data.weakness_radar).map(([subject, score]) => ({
    subject,
    A: score,
    fullMark: 100
  }));

  // AST report scoring helpers
  const reportScores = analysisResult?.scores || {
    overall: 50.0, efficiency: 50.0, readability: 50.0, maintainability: 50.0, security: 50.0, optimization: 50.0
  };

  const reportAst = analysisResult?.ast_metrics || {
    num_loops: 0, num_functions: 0, num_classes: 0, num_imports: 0, recursion_detected: false, max_nesting_depth: 0, security_issues: []
  };

  const reportRadarData = [
    { subject: 'Efficiency', A: reportScores.efficiency, fullMark: 100 },
    { subject: 'Readability', A: reportScores.readability, fullMark: 100 },
    { subject: 'Maintain.', A: reportScores.maintainability, fullMark: 100 },
    { subject: 'Security', A: reportScores.security, fullMark: 100 },
    { subject: 'Optimization', A: reportScores.optimization, fullMark: 100 },
  ];

  const getProfileSummary = () => {
    if (analysisResult?.profile_summary) {
      return {
        title: analysisResult.profile_summary.title,
        desc: analysisResult.profile_summary.description
      };
    }
    const overall = Math.round(reportScores.overall);
    if (overall >= 80) return { title: "Optimal Logical Architect", desc: "Demonstrates exceptional control path choices, clean maintainability levels, and proactive modular design." };
    if (overall >= 60) return { title: "Competent Pragmatic Programmer", desc: "Constructs readable logic with functional partitions. Minor optimization opportunities exist in complex conditional nesting." };
    return { title: "Developing Algorithmic Thinker", desc: "Focuses on solving direct problem constraints. Refactoring nesting depth and function modularity will significantly raise score." };
  };

  const reportProfile = getProfileSummary();

  return (
    <div className="relative z-10 min-h-screen p-8 max-w-7xl mx-auto pb-24 text-slate-300">
      
      {/* Stylesheet injector for clean PDF printing support in report tab */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .glass-card {
            border: 1px solid #dddddd !important;
            background: #ffffff !important;
            box-shadow: none !important;
            color: #000000 !important;
            page-break-inside: avoid;
          }
          h1, h2, h3, h4, p, span, div {
            color: #000000 !important;
            text-shadow: none !important;
          }
          .radar-container {
            border: 1px solid #ccc;
          }
        }
      `}</style>

      {/* Header Section */}
      <header className="flex flex-wrap gap-6 justify-between items-end mb-10 no-print">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
            Cognitive <span className="text-white">Command</span> Center
          </h1>
          <p className="text-slate-400 font-mono text-sm">Psychometric, behavioral, and structural compiler telemetry</p>
        </div>
      </header>

      {/* Sleek Tab Navigation Bar */}
      <div className="flex justify-center mb-10 no-print">
        <div className="bg-[#020617]/50 border border-white/10 p-1.5 rounded-xl flex gap-1 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <LayoutDashboard size={14} />
            Overview & Cognitive Analytics
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'report'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <FileCode2 size={14} />
            AST Code Review
          </button>
        </div>
      </div>

      {/* Active Tab Panel Rendering */}
      <div>
        
        {/* TAB 1: OVERVIEW & COGNITIVE ANALYTICS */}
        {activeTab === 'overview' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8 no-print"
          >
            {/* Developer Cognitive Profile Card */}
            <div className="glass-card p-6 flex flex-wrap justify-between items-center gap-6 bg-gradient-to-r from-[#0d1527] to-[#070b14] border border-cyan-500/20 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                  <Brain size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-wide">Developer Cognitive Profile</h2>
                  <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1.5">
                    Level Persona: <span className="text-indigo-400 font-black uppercase tracking-wider">{data.profile_level}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-8 items-center pr-2">
                <div className="text-center md:border-r md:border-white/10 md:pr-8">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-mono">Cognitive Score</span>
                  <span className="text-2xl font-black text-cyan-300 font-mono">{data.intelligence_score.toFixed(1)}%</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 block font-mono">Readiness Score</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">{data.readiness_score.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Intelligence KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <InsightCard 
                icon={<Brain className="text-indigo-400" />}
                label="Cognitive Readiness"
                value={`${Math.round(data.intelligence_score)}%`}
                description="Average global score calculated across all codebase reviews."
              />
              <InsightCard 
                icon={<AlertTriangle className="text-amber-400" />}
                label="Success Rate"
                value={`${data.success_rate.toFixed(1)}%`}
                description={`${data.executions_count} execution attempts logged in database.`}
              />
              <InsightCard 
                icon={<ShieldCheck className="text-emerald-400" />}
                label="Algorithmic Complexity"
                value={data.average_complexity <= 4.0 ? "Optimal" : "Suboptimal"}
                description={`Average complexity is ${data.average_complexity}. Lower means cleaner logic.`}
              />
              <InsightCard 
                icon={<Zap className="text-cyan-400" />}
                label="Workspace Profile"
                value={`${data.total_sessions} Sessions`}
                description={`Total active session tracks. Favorite language: ${data.most_used_language.toUpperCase()}.`}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Skill Distribution Radar Chart */}
              <div className="lg:col-span-1 glass-card h-[400px] flex flex-col">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Target size={20} className="text-cyan-400" /> Skill Distribution
                </h3>
                <div className="flex-1 min-h-0 min-w-0">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Radar
                          name="Mastery"
                          dataKey="A"
                          stroke="#22d3ee"
                          fill="#22d3ee"
                          fillOpacity={0.4}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Progress Timeline Area Chart */}
              <div className="lg:col-span-2 glass-card h-[400px] flex flex-col">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <TrendingUp size={20} className="text-indigo-400" /> Cognitive Growth Timeline
                </h3>
                <div className="flex-1 min-h-0 min-w-0 -ml-4">
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.recent_sessions}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                          itemStyle={{ color: '#818cf8' }}
                        />
                        <Area type="monotone" name="Score" dataKey="score" stroke="#818cf8" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: AST CODE REVIEW REPORT */}
        {activeTab === 'report' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {analysisResult ? (
              <div className="flex flex-col gap-8">
                {/* Print and Export Buttons */}
                <div className="flex justify-between items-center no-print border-b border-white/5 pb-4 mb-4">
                  <span className="text-xs text-slate-400 font-mono">AST Review Code Report loaded</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleExportJSON}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all text-slate-300"
                    >
                      <Download size={14} /> Export JSON
                    </button>
                    <button 
                      onClick={handlePrintPDF}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold transition-all text-white shadow-lg shadow-indigo-900/30"
                    >
                      <Printer size={14} /> Export PDF / Print
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Profile Summary */}
                  <div className="glass-card lg:col-span-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-400 mb-4 flex items-center gap-2">
                        <Brain size={16} /> Profile Summary
                      </h3>
                      <div className="text-xl font-bold text-white mb-2">{reportProfile.title}</div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-6">{reportProfile.desc}</p>
                    </div>
                    <div className="border-t border-white/5 pt-4 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Maintainability Index</span>
                        <span className="text-lg font-bold text-white">{(analysisResult.maintainability_index ?? 100.0).toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Cyclomatic Complexity</span>
                        <span className="text-lg font-bold text-white">{(analysisResult.complexity_score ?? 1.0).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Heuristic Metrics */}
                  <div className="glass-card lg:col-span-2">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2">
                      <Activity size={16} /> Session Structural Metrics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-black/30 p-4 border border-white/5 rounded-xl text-center">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">Loops</div>
                        <div className="text-3xl font-black text-white mt-1">{reportAst.num_loops}</div>
                      </div>
                      <div className="bg-black/30 p-4 border border-white/5 rounded-xl text-center">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">Functions</div>
                        <div className="text-3xl font-black text-white mt-1">{reportAst.num_functions}</div>
                      </div>
                      <div className="bg-black/30 p-4 border border-white/5 rounded-xl text-center">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">Classes</div>
                        <div className="text-3xl font-black text-white mt-1">{reportAst.num_classes}</div>
                      </div>
                      <div className="bg-black/30 p-4 border border-white/5 rounded-xl text-center">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">Imports</div>
                        <div className="text-3xl font-black text-white mt-1">{reportAst.num_imports}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-white/5 pt-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Max Nesting Depth</span>
                        <span className="font-bold text-white font-mono">{reportAst.max_nesting_depth} levels</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Self-Recursion Detected</span>
                        <span className={`font-bold font-mono ${reportAst.recursion_detected ? 'text-cyan-400' : 'text-slate-400'}`}>
                          {reportAst.recursion_detected ? 'YES' : 'NO'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Radar Mastery */}
                  <div className="glass-card lg:col-span-1 h-[380px] flex flex-col">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                      <Brain size={16} className="text-indigo-400" /> Mastery Profile
                    </h3>
                    <div className="flex-1 min-h-0 min-w-0 -ml-6 radar-container">
                      {isMounted && (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={reportRadarData}>
                            <PolarGrid stroke="#1e293b" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar name="Score" dataKey="A" stroke="#22d3ee" fill="#818cf8" fillOpacity={0.4} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Learning Guide Pathway */}
                  <div className="glass-card lg:col-span-2 flex flex-col bg-gradient-to-r from-indigo-900/10 to-purple-900/10 border-indigo-500/20">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2">
                      <BookOpen size={16} /> Learning Pathway Guide
                    </h3>
                    <div className="space-y-4 flex-1">
                      {analysisResult.learning_pathway && analysisResult.learning_pathway.length > 0 ? (
                        analysisResult.learning_pathway.map((step: any, i: number) => (
                          <div key={i}>
                            <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider mb-1">{i + 1}. {step.title}</div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        ))
                      ) : (
                        <>
                          <div>
                            <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider mb-1">1. Architectural Cleanliness</div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Currently, your cyclomatic complexity score stands at {(analysisResult.complexity_score ?? 1.0).toFixed(1)}. Maintainability is registered at {(analysisResult.maintainability_index ?? 100.0).toFixed(1)}/100. If complexity goes above 5.0, start extracting nested block sequences out into standalone helper routines.
                            </p>
                          </div>
                          <div>
                            <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider mb-1">2. Loop Efficiency & Lookup Speeds</div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Your code has {reportAst.num_loops} loops. If you write nested loops (O(N^2) or higher complexity), try swapping array searches with cached hashes or dictionary indexes. In Python/JS, pre-compiling keys will reduce performance delays on large datasets.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Weaknesses Panel */}
                  <div className="glass-card lg:col-span-3">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                      <ShieldAlert size={16} className="text-rose-400" /> Detected Weaknesses & Vulnerabilities
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysisResult.weaknesses && analysisResult.weaknesses.length > 0 ? (
                        analysisResult.weaknesses.map((w: string, i: number) => (
                          <div key={i} className={`p-4 rounded-xl border ${
                            w.includes('Security') 
                              ? 'bg-rose-950/20 border-rose-500/30' 
                              : w.includes('No critical') 
                                ? 'bg-emerald-950/20 border-emerald-500/30' 
                                : 'bg-amber-950/20 border-amber-500/30'
                          }`}>
                            <div className="flex items-start gap-3">
                              <ShieldAlert className={w.includes('Security') ? 'text-rose-400 mt-0.5' : 'text-amber-400 mt-0.5'} size={16} />
                              <p className={`text-xs ${
                                w.includes('Security') ? 'text-rose-200' : 'text-amber-200'
                              }`}>{w}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 text-sm">
                          No code vulnerabilities or critical logical weaknesses detected in this submission.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Strengths & Action Plan */}
                  <div className="glass-card lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
                        <Zap size={16} /> Code Strengths
                      </h3>
                      <div className="space-y-3">
                        {analysisResult.strengths && analysisResult.strengths.length > 0 ? (
                          analysisResult.strengths.map((item: string, i: number) => (
                            <div key={i} className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-500/20 text-emerald-100 text-xs">
                              ✓ {item}
                            </div>
                          ))
                        ) : (
                          <div className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-500/20 text-emerald-100 text-xs">
                            Clean syntax parsing structure.
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-400 mb-4 flex items-center gap-2">
                        <HelpCircle size={16} /> Recommendations & Action Plan
                      </h3>
                      <div className="space-y-3">
                        {analysisResult.action_plan && analysisResult.action_plan.length > 0 ? (
                          analysisResult.action_plan.map((item: string, i: number) => (
                            <div key={i} className="p-3 rounded-xl bg-cyan-950/15 border border-cyan-500/20 text-cyan-100 text-xs">
                              {i + 1}. {item}
                            </div>
                          ))
                        ) : (
                          <div className="p-3 rounded-xl bg-cyan-950/15 border border-cyan-500/20 text-cyan-100 text-xs">
                            Add local boundary condition checks.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              /* Report empty state fallback placeholder */
              <div className="glass-card p-12 text-center max-w-xl mx-auto flex flex-col items-center gap-6 no-print">
                <FileCode2 size={48} className="text-slate-500" />
                <h3 className="text-xl font-bold">No Active Code Review Found</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Go to the Workspace code editor, write some logic, and click the <strong className="text-cyan-400">Review</strong> button to trigger a full Abstract Syntax Tree (AST) scan and retrieve your analysis metrics report.
                </p>
                <Link 
                  to="/editor" 
                  className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 mt-2"
                >
                  Open Workspace
                </Link>
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}

// Subcomponents helper layouts
const InsightCard = ({ icon, label, value, description }: { icon: ReactNode, label: string, value: string, description: string }) => (
  <div className="glass-card hover:-translate-y-1 transition-transform duration-300">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</span>
    </div>
    <div className="text-2xl font-bold mb-2">{value}</div>
    <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
  </div>
);

export type InsightBoxProps = {
  title: string;
  value: string;
  status: string;
  description: string;
};

export const InsightBox = ({ title, value, status, description }: InsightBoxProps) => (
  <div className="glass-card flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300 border border-white/5 hover:border-cyan-500/30 shadow-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.1)]">
    <div>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{title}</span>
        <span className={`text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10 ${status === 'Excellent' || status === 'Optimal' || status === 'Active' ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'}`}>{status}</span>
      </div>
      <div className="text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">{value}</div>
    </div>
    <p className="text-xs text-slate-400 leading-relaxed mt-4">{description}</p>
  </div>
);
