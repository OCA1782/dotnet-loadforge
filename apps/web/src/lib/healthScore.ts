import type { TestRunDto } from "@/types";

export function computeHealthScore(run: TestRunDto): number | null {
  if (run.status !== "Completed" && run.status !== "Failed") return null;
  if (run.summaryRps == null && run.summaryP95Ms == null && run.summaryErrorRate == null) return null;

  // Error score (0-100): 0% error = 100, 1% = 80, 5% = 0
  const errRate = run.summaryErrorRate ?? 0;
  const errorScore = Math.max(0, 100 - errRate * 100 * 20);

  // Latency score (0-100) based on P95
  const p95 = run.summaryP95Ms;
  let latencyScore = 100;
  if (p95 != null) {
    if (p95 <= 50)        latencyScore = 100;
    else if (p95 <= 100)  latencyScore = 90;
    else if (p95 <= 200)  latencyScore = 75;
    else if (p95 <= 500)  latencyScore = 55;
    else if (p95 <= 1000) latencyScore = 35;
    else                  latencyScore = 10;
  }

  // RPS score (0-100): if targetRps set, measure achievement; else 100 if has data
  let rpsScore = run.summaryRps != null ? 100 : 50;
  if (run.targetRps != null && run.summaryRps != null) {
    rpsScore = Math.min(100, (run.summaryRps / run.targetRps) * 100);
  }

  const score = errorScore * 0.45 + latencyScore * 0.35 + rpsScore * 0.20;
  return Math.round(score);
}

export function healthColor(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 65) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export function healthBg(score: number): string {
  if (score >= 85) return "bg-emerald-900/30 border-emerald-800/50";
  if (score >= 65) return "bg-yellow-900/30 border-yellow-800/50";
  if (score >= 40) return "bg-orange-900/30 border-orange-800/50";
  return "bg-red-900/30 border-red-800/50";
}

export function healthLabel(score: number): string {
  if (score >= 85) return "Mükemmel";
  if (score >= 65) return "İyi";
  if (score >= 40) return "Orta";
  return "Kötü";
}
