// apps/web/components/results/ResultsSkeleton.tsx
export function ResultsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Image skeleton */}
      <div className="bg-gray-200 h-64 w-full rounded-[32px]" />
      
      {/* Section 1 */}
      <div className="space-y-3">
        <div className="bg-gray-200 h-5 w-32 rounded" />
        <div className="rounded-[32px] border border-gray-100 bg-white p-6 space-y-4">
          <div className="flex gap-4">
            <div className="bg-gray-200 h-16 w-24 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-3 mt-1">
              <div className="bg-gray-100 h-3 w-16 rounded" />
              <div className="bg-gray-200 h-7 w-48 rounded" />
              <div className="flex gap-2">
                <div className="bg-gray-100 h-6 w-16 rounded-full" />
                <div className="bg-gray-100 h-6 w-12 rounded-full" />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 h-12 w-full rounded-2xl" />
        </div>
      </div>

      {/* Section 2 */}
      <div className="space-y-3">
        <div className="bg-gray-200 h-5 w-40 rounded" />
        <div className="bg-gray-200 h-40 w-full rounded-[32px]" />
      </div>
    </div>
  );
}
