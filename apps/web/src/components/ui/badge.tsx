import { cn } from "@/lib/cn";
import type { TestRunStatus } from "@/types";

const statusStyles: Record<TestRunStatus, string> = {
  Pending:   "bg-zinc-800 text-zinc-400",
  Queued:    "bg-yellow-900/40 text-yellow-400",
  Running:   "bg-blue-900/40 text-blue-400",
  Stopping:  "bg-orange-900/40 text-orange-400",
  Completed: "bg-emerald-900/40 text-emerald-400",
  Failed:    "bg-red-900/40 text-red-400",
  Cancelled: "bg-zinc-800 text-zinc-500",
};

export function StatusBadge({ status }: { status: TestRunStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status]
      )}
    >
      {status}
    </span>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-zinc-800 text-zinc-300",
        className
      )}
    >
      {children}
    </span>
  );
}
