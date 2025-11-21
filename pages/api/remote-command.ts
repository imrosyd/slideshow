// pages/api/remote-command.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { commandQueue } from '../../lib/state-manager';

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
  if (!commandQueue.has(targetDeviceId)) {
    commandQueue.set(targetDeviceId, []);
    console.log(`[API /remote-command] Initialized command queue for new device: ${targetDeviceId}`);
  }

  const queue = commandQueue.get(targetDeviceId);
  queue.push(command);

  console.log(`[API /remote-command] Queued command '${command.type}' for device ${targetDeviceId}. Command data:`, command.data, `Queue size: ${queue.length}`);

  res.status(200).json({ message: 'Command queued successfully' });
}