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

  const inputClass =
    'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">🔑 Account</h2>
        <p className="text-sm text-gray-500 mb-6">
          Change the admin username and/or password
          {currentUsername ? ` (signed in as "${currentUsername}")` : ''}.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-gray-700">
              Current password <span className="text-red-500">*</span>
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

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-semibold mb-1.5 text-gray-700">
              New username <span className="text-gray-400 font-normal">(optional)</span>
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
            <label className="block text-sm font-semibold mb-1.5 text-gray-700">
              New password <span className="text-gray-400 font-normal">(optional)</span>
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
              <label className="block text-sm font-semibold mb-1.5 text-gray-700">
                Confirm new password
              </label>
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
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <span className="font-semibold">❌ Error:</span> {error}
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          <button
            onClick={close}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 font-medium transition-all flex items-center justify-center gap-2"
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
