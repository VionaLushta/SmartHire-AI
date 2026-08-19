import ProgressCircle from './ProgressCircle';

export default function ResumeScore({ score = 0, summary = 'Resume quality is solid.' }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Resume score</p>
      <div className="mt-6 flex items-center gap-5">
        <ProgressCircle value={score} size={120} strokeWidth={10} />
        <div>
          <p className="text-4xl font-semibold">{score}%</p>
          <p className="mt-2 max-w-xs text-sm text-slate-300">{summary}</p>
        </div>
      </div>
    </div>
  );
}
