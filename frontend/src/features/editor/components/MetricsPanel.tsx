type MetricItem = {
  label: string;
  value: string | number;
  tone: string;
};

type MetricsPanelProps = {
  localMetrics: MetricItem[];
};

export default function MetricsPanel({ localMetrics }: MetricsPanelProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 font-bold">Local Quick Metrics</div>
      <div className="grid grid-cols-2 gap-3">
        {localMetrics.map((metric) => (
          <div key={metric.label} className="rounded-md bg-black/30 p-3 border border-white/5">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">{metric.label}</div>
            <div className={`text-lg font-black ${metric.tone}`}>{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
