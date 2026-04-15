import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/60", className)}
      {...props}
    />
  );
}

export function SkeletonPanel({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("app-panel overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-14 rounded-md" />
      </div>
      <div className="space-y-3 p-5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 4, cols = 5, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("app-panel overflow-hidden", className)}>
      <div className="border-b border-slate-100 px-5 py-3">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="p-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-8 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex gap-2">
              {Array.from({ length: cols }).map((_, j) => (
                <Skeleton key={j} className="h-10 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
