// /api/sui.ts (Node.js on Vercel)
export default async function handler(req, res) {
    try {
        const suiResponse = await fetch("https://fullnode.mainnet.sui.io/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body)
        });

        const data = await suiResponse.json();
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: "Sui RPC error", details: err });
    }
}
