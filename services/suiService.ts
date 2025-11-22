import { SuiTransactionBlockResponse } from '../types';

const SUI_MAINNET_RPC = 'https://fullnode.mainnet.sui.io:443';

/**
 * Fetches transaction details from the Sui Mainnet RPC.
 */
export const fetchSuiTransaction = async (digest: string): Promise<SuiTransactionBlockResponse> => {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'sui_getTransactionBlock',
    params: [
      digest,
      {
        showInput: true,
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
        showBalanceChanges: true,
      },
    ],
  };

  try {
    const response = await fetch(SUI_MAINNET_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`RPC Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      // Handle "Invalid Params" error specifically
      if (data.error.code === -32602) {
         throw new Error('Invalid Transaction Digest format. Ensure you are not pasting an Object ID or Address.');
      }
      throw new Error(data.error.message || 'Failed to fetch transaction');
    }

    if (!data.result) {
      throw new Error('Transaction not found. Please check the digest and try again.');
    }

    return data.result;
  } catch (error) {
    console.error('Sui RPC Fetch Error:', error);
    throw error;
  }
};