import { useCallback, useRef, useState } from "react";

type MusicSettings = {
  music_enabled: boolean;
  music_source_type: 'upload' | 'url';
  music_file_url: string;
  music_external_url: string;
  music_volume: number;
  music_loop: boolean;
};

type Props = {
  settings: MusicSettings;
  onSave: (settings: Partial<MusicSettings>) => Promise<void>;
  authToken: string | null;
};

export const MusicSettingsPanel = ({ settings, onSave, authToken }: Props) => {
  const [isUploading, setIsUploading] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file (MP3, WAV, OGG, AAC)');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/music', {
        method: 'POST',
        headers: authToken ? { Authorization: `Token ${authToken}` } : {},
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      // Update settings
      await onSave({
        music_file_url: data.url,
        music_source_type: 'upload',
      });

      setLocalSettings(prev => ({
        ...prev,
        music_file_url: data.url,
        music_source_type: 'upload',
      }));

      alert('Music uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload music file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [authToken, onSave]);

  const handleDeleteMusic = useCallback(async () => {
    if (!confirm('Delete current music file?')) return;

    try {
      const response = await fetch('/api/admin/music', {
        method: 'DELETE',
        headers: authToken ? { Authorization: `Token ${authToken}` } : {},
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      await onSave({ music_file_url: '' });
      setLocalSettings(prev => ({ ...prev, music_file_url: '' }));
      alert('Music deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete music file');
    }
  }, [authToken, onSave]);

  const handleToggleEnabled = useCallback(async () => {
    const newValue = !localSettings.music_enabled;
    await onSave({ music_enabled: newValue });
    setLocalSettings(prev => ({ ...prev, music_enabled: newValue }));
  }, [localSettings.music_enabled, onSave]);

  const handleSourceTypeChange = useCallback(async (type: 'upload' | 'url') => {
    await onSave({ music_source_type: type });
    setLocalSettings(prev => ({ ...prev, music_source_type: type }));
  }, [onSave]);

  const handleExternalUrlChange = useCallback(async (url: string) => {
    await onSave({ music_external_url: url });
    setLocalSettings(prev => ({ ...prev, music_external_url: url }));
  }, [onSave]);

  const handleVolumeChange = useCallback(async (volume: number) => {
    await onSave({ music_volume: volume });
    setLocalSettings(prev => ({ ...prev, music_volume: volume }));
  }, [onSave]);

  const handleLoopChange = useCallback(async () => {
    const newValue = !localSettings.music_loop;
    await onSave({ music_loop: newValue });
    setLocalSettings(prev => ({ ...prev, music_loop: newValue }));
  }, [localSettings.music_loop, onSave]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-glass backdrop-blur-lg">
      <h2 className="mb-6 text-lg font-semibold text-white">Background Music</h2>
      
      <div className="flex flex-col gap-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/80">Enable Background Music</span>
          <button
            onClick={handleToggleEnabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              localSettings.music_enabled ? 'bg-sky-500' : 'bg-white/20'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                localSettings.music_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {localSettings.music_enabled && (
          <>
            {/* Source Type Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-white/80">Music Source</label>
              <div className="flex gap-4">
                <button
                  onClick={() => handleSourceTypeChange('upload')}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm transition ${
                    localSettings.music_source_type === 'upload'
                      ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                      : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                  }`}
                >
                  Upload File
                </button>
                <button
                  onClick={() => handleSourceTypeChange('url')}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm transition ${
                    localSettings.music_source_type === 'url'
                      ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                      : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                  }`}
                >
                  External URL
                </button>
              </div>
            </div>

            {/* Upload File */}
            {localSettings.music_source_type === 'upload' && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Choose Audio File'}
                  </button>
                  {localSettings.music_file_url && (
                    <button
                      onClick={handleDeleteMusic}
                      className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:border-rose-400/50 hover:bg-rose-500/20"
                    >
                      Delete
                    </button>
                  )}
                </div>
                {localSettings.music_file_url && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-white/60">Current file:</p>
                    <p className="mt-1 truncate text-sm text-white/80">
                      {localSettings.music_file_url.split('/').pop()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* External URL */}
            {localSettings.music_source_type === 'url' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white/80">Audio URL</label>
                <input
                  type="url"
                  value={localSettings.music_external_url}
                  onChange={(e) => handleExternalUrlChange(e.target.value)}
                  placeholder="https://example.com/music.mp3"
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
                <p className="text-xs text-white/50">
                  Enter direct link to audio file (MP3, WAV, OGG)
                </p>
              </div>
            )}

            {/* Volume Control */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/80">Volume</label>
                <span className="text-sm text-white/60">{localSettings.music_volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={localSettings.music_volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>

            {/* Loop Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">Loop Music</span>
              <button
                onClick={handleLoopChange}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  localSettings.music_loop ? 'bg-sky-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    localSettings.music_loop ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
