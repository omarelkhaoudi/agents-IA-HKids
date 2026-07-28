export default function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
      <span>Assistant is typing</span>
      <span className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300" />
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300 [animation-delay:150ms]" />
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300 [animation-delay:300ms]" />
      </span>
    </div>
  );
}
