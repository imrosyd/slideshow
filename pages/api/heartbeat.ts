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
    console.error(`❌ [API /heartbeat] Device ID is required in request body.`);
    return res.status(400).json({ error: 'Device ID is required' });
  }

  console.log(`[API /heartbeat] Received heartbeat from device: ${deviceId}`);
  console.log(`[API /heartbeat] Active image reported: ${activeImage ? activeImage.name : 'none'}`);


  // Perform cleanup of old clients first.
  garbageCollectClients();
  console.log(`[API /heartbeat] After garbageCollectClients, liveClients size: ${liveClients.size}, activeImages size: ${activeImages.size}`);

  // Update the heartbeat timestamp for the current client.
  liveClients.set(deviceId, { lastSeen: Date.now() });
  console.log(`[API /heartbeat] Updated liveClients for ${deviceId}. liveClients size: ${liveClients.size}`);


  // Update the active image status for the current client.
  activeImages.set(deviceId, activeImage as ActiveImageInfo); // Store activeImage
  console.log(`[API /heartbeat] Updated activeImages for ${deviceId} to ${activeImage ? activeImage.name : 'none'}. activeImages size: ${activeImages.size}`);


  // Check for pending commands for this device.
  const commands = commandQueue.get(deviceId) || [];

  if (commands.length > 0) {
    // Clear the queue for this device after retrieving the commands.
    commandQueue.set(deviceId, []);
    console.log(`[API /heartbeat] Sending ${commands.length} command(s) to ${deviceId}. Commands:`, commands);
    return res.status(200).json({ commands });
  }

  // If no commands, just return a success response.
  console.log(`[API /heartbeat] No commands for ${deviceId}.`);
  return res.status(200).json({ commands: [] });
}
