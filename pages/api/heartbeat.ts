// pages/api/heartbeat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  liveClients,
  commandQueue,
  activeImages, // Import activeImages
  garbageCollectClients,
  Command,
  ActiveImageInfo, // Import ActiveImageInfo type
} from '../../lib/state-manager';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { deviceId, activeImage } = req.body; // Extract activeImage

  if (!deviceId) {
    return res.status(400).json({ error: 'Device ID is required' });
  }

  // Perform cleanup of old clients first.
  garbageCollectClients();

  // Update the heartbeat timestamp for the current client.
  liveClients.set(deviceId, { lastSeen: Date.now() });

  // Update the active image status for the current client.
  activeImages.set(deviceId, activeImage as ActiveImageInfo); // Store activeImage

  // Check for pending commands for this device.
  const commands = commandQueue.get(deviceId) || [];

  if (commands.length > 0) {
    // Clear the queue for this device after retrieving the commands.
    commandQueue.set(deviceId, []);
    console.log(`[API /heartbeat] Sent ${commands.length} command(s) to ${deviceId}`);
    return res.status(200).json({ commands });
  }

  // If no commands, just return a success response.
  return res.status(200).json({ commands: [] });
}
