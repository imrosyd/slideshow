// pages/api/remote-command.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { commandQueue, activeImages, ActiveImageInfo } from '../../lib/state-manager';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { targetDeviceId, command } = req.body;

  if (!targetDeviceId || !command) {
    console.error(`❌ [API /remote-command] Missing targetDeviceId or command in request body.`);
    return res.status(400).json({ error: 'Missing targetDeviceId or command' });
  }

  // Get the current queue for the device, or initialize it if it doesn't exist.
  let queue = commandQueue.get(targetDeviceId);
  if (!queue) {
    queue = [];
    commandQueue.set(targetDeviceId, queue);
    console.log(`[API /remote-command] Initialized command queue for new device: ${targetDeviceId}`);
  }

  queue.push(command);

  // Immediately update the server-side state for image commands.
  // This prevents race conditions and makes the remote UI much more responsive.
  if (command.type === 'show-image') {
    activeImages.set(targetDeviceId, command.data as ActiveImageInfo);
    console.log(`[API /remote-command] Immediately set active image for device ${targetDeviceId} to ${command.data.name}.`);
  } else if (command.type === 'hide-image') {
    activeImages.set(targetDeviceId, null);
    console.log(`[API /remote-command] Immediately cleared active image for device ${targetDeviceId} due to 'hide-image' command.`);
  }

  console.log(`[API /remote-command] Queued command '${command.type}' for device ${targetDeviceId}. Command data:`, command.data, `Queue size: ${queue.length}`);

  res.status(200).json({ message: 'Command queued successfully' });
}