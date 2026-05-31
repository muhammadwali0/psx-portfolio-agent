export default function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-psx-800 border border-psx-500/10 flex items-center justify-center shrink-0">
        <span className="text-[10px]">🤖</span>
      </div>
      <div className="bg-psx-800 border border-psx-500/10 rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-psx-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.6s' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
