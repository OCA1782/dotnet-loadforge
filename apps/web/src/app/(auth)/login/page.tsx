"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      setToken(res.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Zap className="h-6 w-6 text-blue-400" />
          <span className="text-xl font-bold text-zinc-100">LoadForge</span>
        </div>

        <h1 className="mb-6 text-center text-lg font-semibold text-zinc-100">
          Sign in
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-950/40 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" className="mt-2 w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
