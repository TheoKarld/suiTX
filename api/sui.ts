// /api/sui.ts
const SUI_RPC_URL = "https://mainnet.sui.rpcpool.com";               // very fast
// or
// const SUI_RPC_URL = "https://sui-mainnet-endpoint.blockvision.org"; // also excellent
// or
// const SUI_RPC_URL = "https://sui-rpc.mainnet.chainbase.online";     // free tier works

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        const response = await fetch(SUI_RPC_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(req.body),
        });

        // Important: copy the exact status code
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        console.error(err);
        res.status(504).json({ error: "Gateway timeout – Sui node unreachable" });
    }
}