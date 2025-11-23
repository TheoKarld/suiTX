import { GoogleGenAI } from "@google/genai";
import { SuiTransactionBlockResponse } from '../types';

// Initialize the Gemini API client
// The API key is injected via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

export const generateTransactionExplanationStream = async (
  transactionData: SuiTransactionBlockResponse
) => {
  const model = 'gemini-2.5-flash';

  // Prepare the prompt
  const prompt = `
    You are a blockchain expert who specializes in the Sui blockchain.
    
    I will provide you with the JSON data of a Sui transaction block. 
    Your goal is to explain exactly what happened in this transaction in plain, easy-to-understand English.
    
    Target Audience: A non-technical user who wants to know "Did I swap tokens?", "Did I mint an NFT?", "Did I just send money?".

    Structure your response using Markdown:
    1. **Summary**: A 1-sentence high-level summary of the action (e.g., "User A swapped 10 SUI for 50 USDC").
    2. **Key Actions**: Bullet points listing specific asset transfers, object creations, or smart contract interactions.
    3. **Gas Fee**: Mention how much SUI was spent on gas.
    4. **Technical Details**: A brief section for "Under the Hood" mentioning the specific function called (e.g., "DeepBook Place Limit Order").

    Here is the Transaction JSON:
    \`\`\`json
    ${JSON.stringify(transactionData, null, 2)}
    \`\`\`
  `;

  try {
    const streamResult = await ai.models.generateContentStream({
      model: model,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    });

    return streamResult;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
};