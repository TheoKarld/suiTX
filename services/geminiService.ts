// src/services/geminiService.ts  → now powered by Groq (keep filename if you want)
import { SuiTransactionBlockResponse } from '../types';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

if (!GROQ_API_KEY) {
  throw new Error('Missing VITE_GROQ_API_KEY – add it to your .env file');
}

const createPrompt = (data: SuiTransactionBlockResponse) => `
You are a Sui blockchain expert. Explain this transaction in simple, plain English for a non-technical user.

Use this exact Markdown structure:

### Summary
One-sentence summary (e.g., "You swapped 12 SUI for 450 USDC on Cetus")

### Key Actions
- Bullet points of transfers, mints, burns, etc.

### Gas Fee
How much SUI was used for gas

### Under the Hood
Package + function called (e.g., Cetus::swap, DeepBook::place_limit_order)

Transaction JSON:
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
`.trim();

export const generateTransactionExplanationStream = async (
  transactionData: SuiTransactionBlockResponse
): Promise<ReadableStream<string>> => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',   // Fast + high quality
      messages: [{ role: 'user', content: createPrompt(transactionData) }],
      temperature: 0.6,
      max_tokens: 1024,
      stream: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq error ${response.status}: ${err}`);
  }

  if (!response.body) {
    throw new Error('No response body from Groq');
  }

  // Transform OpenAI-style SSE → clean text stream
  const transformer = new TransformStream({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const json = JSON.parse(line.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) controller.enqueue(content);
          } catch (e) {
            // ignore parse errors
          }
        }
      }
    },
  });

  return response.body.pipeThrough(transformer);
};