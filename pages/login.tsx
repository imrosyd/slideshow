import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { getBrowserId } from "../lib/browser-utils";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionConflict, setSessionConflict] = useState<any>(null);
  const [browserId, setBrowserId] = useState<string>("");
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    // Get browser ID on mount
    setBrowserId(getBrowserId());
  }, []);
  
  // Poll for approval status when waiting
  useEffect(() => {
    if (!waitingForApproval || !attemptId) return;
    
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/attempt-status?attemptId=${attemptId}`);
        const data = await response.json();
        
        if (data.status === "approved") {
          // Approved! Proceed with login
          setWaitingForApproval(false);
          setAttemptId(null);
          // Retry login with forceLogin flag
          const form = document.querySelector('form');
          if (form) {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            Object.defineProperty(submitEvent, 'preventDefault', { value: () => {} });
            handleSubmit(submitEvent as any, true, true); // Skip attempt creation
          }
        } else if (data.status === "denied" || data.status === "expired") {
          // Denied or expired
          setWaitingForApproval(false);
          setAttemptId(null);
          setError(data.status === "denied" ? 
            "Login denied by active session." : 
            "Login attempt expired. Please try again.");
        }
      } catch (err) {
        console.error("Error checking attempt status:", err);
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(checkInterval);
  }, [waitingForApproval, attemptId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>, forceLogin = false, skipAttempt = false) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    setSessionConflict(null);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, browserId, forceLogin }),
      });

      // DISABLED: Approval dialog feature (not working properly)
      // if (response.status === 409) {
      //   const payload = await response.json();
      //   setSessionConflict(payload);
      //   setIsLoading(false);
      //   return;
      // }

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Authentication failed.");
      }

      const payload = await response.json();
      const token = payload?.token as string | undefined;
      const supabaseToken = payload?.supabaseToken as string | undefined;
      const sessionId = payload?.sessionId as string | undefined;
      
      if (!token) {
        throw new Error("Invalid authentication token.");
      }

      // Store tokens and sessionId
      sessionStorage.setItem("admin-auth-token", token);
      if (supabaseToken) {
        sessionStorage.setItem("supabase-token", supabaseToken);
      }
      
      // Store sessionId based on redirect target
      const redirect = router.query.redirect as string | undefined;
      if (sessionId) {
        // Always store both session IDs for seamless navigation
        const sessionIdForPage = redirect === "remote" ? 
          `remote-${sessionId}` : 
          `admin-${sessionId}`;
        
        if (redirect === "remote") {
          sessionStorage.setItem("remote-session-id", sessionIdForPage);
        } else {
          sessionStorage.setItem("admin-session-id", sessionIdForPage);
        }
      }
      
      setPassword("");
      
      // Navigate to the appropriate page
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
                Enter the admin password to access the dashboard.
              </p>
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-5 select-text"
              autoComplete="off"
            >
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
              
              {sessionConflict && (
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-white">
                  <p className="text-[0.9rem] mb-3">
                    Another browser is currently logged in. Do you want to take over the session?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSessionConflict(null);
                        // Create a proper form event
                        const form = e.currentTarget.closest('form');
                        if (form) {
                          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                          Object.defineProperty(submitEvent, 'preventDefault', { value: () => {} });
                          handleSubmit(submitEvent as any, true);
                        }
                      }}
                      className="px-3 py-1 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium"
                    >
                      Yes, take over
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSessionConflict(null);
                        setPassword("");
                      }}
                      className="px-3 py-1 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <button
                type="submit"
                disabled={!password || isLoading || waitingForApproval}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-sky-400 to-blue-500 px-5 py-3 text-base font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {waitingForApproval ? "Waiting for approval..." : 
                 isLoading ? "Signing in…" : 
                 "Sign in to dashboard"}
              </button>
              
              {waitingForApproval && (
                <div className="rounded-xl border border-blue-400/40 bg-blue-500/10 px-4 py-3 text-white">
                  <p className="text-[0.9rem] mb-2">
                    A request has been sent to the active session. 
                    Waiting for approval...
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setWaitingForApproval(false);
                      setAttemptId(null);
                      setIsLoading(false);
                    }}
                    className="text-sm underline hover:no-underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
