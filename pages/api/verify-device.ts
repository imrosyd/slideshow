import type { NextApiRequest, NextApiResponse } from 'next';
import { liveClients, activeImages } from '../../lib/state-manager';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { deviceId } = req.query;

    if (!deviceId || typeof deviceId !== 'string') {
        return res.status(400).json({ error: 'Device ID is required' });
    }

    const client = liveClients.get(deviceId);

    if (client) {
        const activeImage = activeImages.get(deviceId);
        return res.status(200).json({
            valid: true,
            lastSeen: client.lastSeen,
            activeImage: activeImage || null
        });
    } else {
        return res.status(200).json({ valid: false });
    }
}
