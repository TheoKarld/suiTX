// /api/sui.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const suiResponse = await fetch('https://fullnode.mainnet.sui.io:443', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Optional: forward client IP if you want rate-limiting on Sui side
                // 'X-Forwarded-For': req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '',
            },
            body: JSON.stringify(req.body),
        });

        const data = await suiResponse.json();
        res.status(suiResponse.status).json(data);
    } catch (err: any) {
        console.error('Proxy error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}