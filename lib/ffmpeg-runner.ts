/**
 * Shared FFmpeg runner.
 *
 * Spawns FFmpeg without a shell, keeps it off the critical CPU path, and
 * surfaces the real error when it fails.
 */
import { spawn } from 'child_process';
import os from 'os';
// @ts-ignore
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

export const FFMPEG_PATH: string = ffmpegInstaller.path;

// A 1080p encode saturates roughly 2.7 of 4 cores. Nudging FFmpeg down the
// scheduler keeps it from starving the Node event loop (and any other service
// on the box) while a merge runs.
const FFMPEG_NICE = parseInt(process.env.FFMPEG_NICE || '10', 10);

// FFmpeg writes a progress line per frame, so a long encode emits megabytes of
// stderr. Only the tail matters: the actual error is always last.
const STDERR_TAIL_BYTES = 16 * 1024;

const DEFAULT_TIMEOUT_MS = 600_000;

export interface RunFfmpegOptions {
  timeoutMs?: number;
  label?: string;
}

export function runFfmpeg(args: string[], options: RunFfmpegOptions = {}): Promise<void> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, label = 'FFmpeg' } = options;

  return new Promise<void>((resolve, reject) => {
    const child = spawn(FFMPEG_PATH, args);

    if (child.pid !== undefined) {
      try {
        os.setPriority(child.pid, FFMPEG_NICE);
      } catch (err) {
        console.warn(`[${label}] could not lower priority:`, err);
      }
    }

    let stderrTail = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_TAIL_BYTES);
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);

      if (timedOut) {
        return reject(new Error(`${label} timed out after ${timeoutMs}ms\n${stderrTail.trim()}`));
      }
      if (code === 0) {
        return resolve();
      }
      reject(new Error(`${label} exited with code ${code}\n${stderrTail.trim()}`));
    });
  });
}

export default runFfmpeg;
