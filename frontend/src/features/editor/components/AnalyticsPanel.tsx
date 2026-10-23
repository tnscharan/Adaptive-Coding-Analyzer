import { motion } from 'framer-motion';
import { Activity, Zap } from 'lucide-react';

type AnalysisResult = {
  complexity_score?: number;
  maintainability_index?: number;
  ast_metrics?: {
    num_loops?: number;
  };
  weaknesses?: string[];
  action_plan?: string[];
};

type AnalyticsPanelProps = {
  aiModalMode: 'weaknesses' | 'improvements' | null;
  localAnalysis: AnalysisResult | null;
  onClose: () => void;
};

export default function AnalyticsPanel({ aiModalMode, localAnalysis, onClose }: AnalyticsPanelProps) {
  if (!aiModalMode || !localAnalysis) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`w-full max-w-2xl rounded-2xl border p-8 shadow-2xl ${
          aiModalMode === 'weaknesses' 
            ? 'bg-rose-950/40 border-rose-500/30 shadow-rose-900/20' 
            : 'bg-emerald-950/40 border-emerald-500/30 shadow-emerald-900/20'
        }`}
      >
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h2 className={`text-2xl font-black flex items-center gap-3 ${
            aiModalMode === 'weaknesses' ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {aiModalMode === 'weaknesses' ? (
              <>
                <Activity size={24} /> Detected Weak Areas
              </>
            ) : (
              <>
                <Zap size={24} /> Improvement Suggestions
              </>
            )}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm font-bold">
            CLOSE X
          </button>
        </div>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {aiModalMode === 'weaknesses' ? (
            localAnalysis.weaknesses && localAnalysis.weaknesses.length > 0 ? (
              localAnalysis.weaknesses.map((w: string, i: number) => (
                <div key={i} className="p-4 bg-black/40 rounded-xl border border-white/5 text-rose-200">
                  - {w}
                </div>
              ))
            ) : (
              <div className="text-emerald-400 p-4 bg-emerald-900/20 rounded-xl">
                No critical weaknesses detected! Your logic is solid.
              </div>
            )
          ) : (
            <div className="space-y-4">
              {localAnalysis.action_plan?.map((item: string, i: number) => (
                <div key={i} className="p-4 bg-black/40 rounded-xl border border-white/5">
                  <h4 className="text-emerald-400 font-bold mb-2 uppercase text-xs tracking-widest">Step {i + 1}</h4>
                  <p className="text-slate-300 text-sm">{item}</p>
                </div>
              ))}
              <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                <h4 className="text-emerald-400 font-bold mb-2 uppercase text-xs tracking-widest">Complexity Optimization</h4>
                <p className="text-slate-300 text-sm">
                  Your code's cyclomatic complexity is {(localAnalysis.complexity_score ?? 0).toFixed(1)}.{' '}
                  {(localAnalysis.complexity_score ?? 0) > 5 
                    ? "You should break large functions into smaller, single-purpose helper functions to drastically improve readability." 
                    : "This is well within optimal bounds."}
                </p>
              </div>
              <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                <h4 className="text-emerald-400 font-bold mb-2 uppercase text-xs tracking-widest">Structural Efficiency</h4>
                <p className="text-slate-300 text-sm">
                  You used {localAnalysis.ast_metrics?.num_loops} loops. Try using vectorized operations, list comprehensions, or hash maps to reduce O(N^2) time complexity bottlenecks if dealing with large data arrays.
                </p>
              </div>
              <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                <h4 className="text-emerald-400 font-bold mb-2 uppercase text-xs tracking-widest">Maintainability</h4>
                <p className="text-slate-300 text-sm">
                  Your maintainability index is {localAnalysis.maintainability_index?.toFixed(1)}/100. Adding detailed Python docstrings and typing hints will automatically boost this score.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
