import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const [username, setUsername] = useState("imron");
  const [password, setPassword] = useState("password");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Authentication failed.");
      }

      const payload = await response.json();
      const token = payload?.token as string | undefined;
      
      if (!token) {
        throw new Error("Invalid authentication token.");
      }

      sessionStorage.setItem("admin-auth-token", token);
      
      setUsername("");
      setPassword("");
      
      const redirect = router.query.redirect as string | undefined;
      if (redirect) {
        await router.push(`/${redirect}`);
      } else {
        await router.push("/admin");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Login · Slideshow</title>
      </Head>
      <main className="min-h-screen w-full bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 py-12">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-glass backdrop-blur-lg">
          <div className="absolute -top-32 -right-24 h-64 w-64 rounded-full bg-sky-500/30 blur-3xl"></div>
          <div className="absolute -bottom-36 -left-20 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl"></div>
          <div className="relative z-10 px-8 py-10 flex flex-col gap-6 text-white">
            <div className="flex flex-col gap-2 text-center">
              <span className="text-xs uppercase tracking-[0.35em] text-white/60">
                Slideshow Control
              </span>
              <h1 className="text-3xl font-semibold tracking-tight">Administrator</h1>
              <p className="text-sm text-white/60">
                Enter your credentials to access the dashboard.
              </p>
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-5 select-text"
              autoComplete="off"
            >
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-white/60">
                  Username
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="imron"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white outline-none ring-0 transition focus:border-sky-400 focus:bg-slate-900/60 focus:ring-2 focus:ring-sky-500/40"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-white/60">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white outline-none ring-0 transition focus:border-sky-400 focus:bg-slate-900/60 focus:ring-2 focus:ring-sky-500/40"
                  disabled={isLoading}
                  autoComplete="current-password"
                  spellCheck={false}
                />
              </label>
              {error && (
                <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-[0.9rem] text-rose-100/90">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={!username || !password || isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-sky-400 to-blue-500 px-5 py-3 text-base font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Signing in…" : "Sign in to dashboard"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
