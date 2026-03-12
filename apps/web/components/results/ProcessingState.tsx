// apps/web/components/results/ProcessingState.tsx
export function ProcessingState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-5 animate-fade-in">
      <div className="relative">
        <div className="w-24 h-24 rounded-[32px] bg-brand-50 flex items-center justify-center">
          <span className="text-5xl animate-spin-slow">⚙️</span>
        </div>
        <div className="absolute -inset-2 rounded-[36px] border-2 border-brand-200
                        border-dashed animate-spin-slow opacity-50" />
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900">Identifying fonts...</p>
        <p className="text-sm text-gray-400 mt-1">Usually takes 5–15 seconds</p>
      </div>
      {/* Animated steps */}
      <div className="flex flex-col gap-3 w-full max-w-xs text-left mt-4">
        {[
          "Detecting text regions",
          "Extracting typographic features",
          "Matching against font library",
        ].map((step, i) => (
          <div key={step} className="flex items-center gap-3 text-sm text-gray-500">
            <div className="w-2 h-2 rounded-full animate-pulse bg-brand-400"
                 style={{ animationDelay: `${i * 0.4}s` }} />
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}
