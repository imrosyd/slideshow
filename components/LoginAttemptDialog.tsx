import { useState } from "react";

interface LoginAttemptDialogProps {
  attempt: {
    id: string;
    email: string;
    browserInfo: string;
    createdAt: string;
  };
  onRespond: (attemptId: string, decision: "approve" | "deny") => Promise<void>;
  onClose: () => void;
}

export function LoginAttemptDialog({ attempt, onRespond, onClose }: LoginAttemptDialogProps) {
  const [isResponding, setIsResponding] = useState(false);
  
  const handleResponse = async (decision: "approve" | "deny") => {
    setIsResponding(true);
    await onRespond(attempt.id, decision);
    setIsResponding(false);
    onClose();
  };
  
  // Parse browser info for display
  const getBrowserName = (userAgent: string) => {
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Unknown Browser";
  };
  
  const browserName = getBrowserName(attempt.browserInfo);
  const loginTime = new Date(attempt.createdAt).toLocaleTimeString();
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl">
        <div className="border-b border-white/10 bg-amber-500/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-amber-100">
            ⚠️ New Login Attempt
          </h2>
        </div>
        
        <div className="px-6 py-4 text-white">
          <p className="mb-4 text-sm text-gray-300">
            Someone is trying to login from another browser:
          </p>
          
          <div className="mb-6 rounded-lg bg-white/5 p-3 text-sm">
            <div className="mb-2">
              <span className="text-gray-400">Browser:</span>{" "}
              <span className="text-white">{browserName}</span>
            </div>
            <div className="mb-2">
              <span className="text-gray-400">Email:</span>{" "}
              <span className="text-white">{attempt.email}</span>
            </div>
            <div>
              <span className="text-gray-400">Time:</span>{" "}
              <span className="text-white">{loginTime}</span>
            </div>
          </div>
          
          <p className="mb-6 text-sm text-amber-200">
            Do you want to allow this login? If you approve, your current session will end.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={() => handleResponse("approve")}
              disabled={isResponding}
              className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {isResponding ? "Processing..." : "Yes, Allow Login"}
            </button>
            <button
              onClick={() => handleResponse("deny")}
              disabled={isResponding}
              className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              {isResponding ? "Processing..." : "No, Deny Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
