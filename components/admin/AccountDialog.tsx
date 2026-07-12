import React, { useState } from 'react';

interface AccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string | null;
  currentUsername?: string;
  onSuccess: (message: string) => void;
}

export const AccountDialog: React.FC<AccountDialogProps> = ({
  isOpen,
  onClose,
  authToken,
  currentUsername,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setCurrentPassword('');
    setNewUsername('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setIsSubmitting(false);
  };

  const close = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);

    if (!currentPassword) {
      setError('Enter your current password to confirm.');
      return;
    }
    if (!newUsername && !newPassword) {
      setError('Enter a new username or a new password.');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/change-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          currentPassword,
          ...(newUsername ? { newUsername } : {}),
          ...(newPassword ? { newPassword } : {}),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to update credentials');
      }

      const parts: string[] = [];
      if (newUsername) parts.push(`username changed to "${payload.username}"`);
      if (payload.passwordChanged) parts.push('password updated');
      onSuccess(parts.length ? `Account ${parts.join(' and ')}.` : 'Account updated.');
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update credentials');
      setIsSubmitting(false);
    }
  };

  const labelClass = 'block text-sm font-medium mb-1.5 text-white/70';
  const inputClass =
    'w-full rounded-xl border border-white/15 bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder:text-white/30 transition focus:border-sky-400/50 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={close} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-glass backdrop-blur-2xl">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight text-white/95">Account</h2>
          <p className="text-sm leading-relaxed text-white/70">
            Change the admin username and/or password
            {currentUsername ? ` (signed in as "${currentUsername}")` : ''}.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className={labelClass}>
              Current password <span className="text-rose-300/80">*</span>
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSubmitting}
              placeholder="Required to confirm any change"
              className={inputClass}
            />
          </div>

          <div className="border-t border-white/10 pt-4">
            <label className={labelClass}>
              New username <span className="font-normal text-white/40">(optional)</span>
            </label>
            <input
              type="text"
              autoComplete="username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              disabled={isSubmitting}
              placeholder={currentUsername || 'Leave blank to keep current'}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              New password <span className="font-normal text-white/40">(optional)</span>
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
              placeholder="At least 4 characters"
              className={inputClass}
            />
          </div>

          {newPassword && (
            <div>
              <label className={labelClass}>Confirm new password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="Re-enter the new password"
                className={inputClass}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3">
            <p className="text-sm text-rose-200">{error}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={close}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:shadow-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountDialog;
