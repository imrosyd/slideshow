// pages/api/active-image-status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { activeImages, ActiveImageInfo } from '../../lib/state-manager';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ActiveImageInfo | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { deviceId } = req.query;

  if (typeof deviceId !== 'string' || !deviceId) {
    return res.status(400).json({ error: 'Device ID is required' });
  }

  const activeImage = activeImages.get(deviceId) || null;

  return res.status(200).json(activeImage);
}