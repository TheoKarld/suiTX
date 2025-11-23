// src/App.tsx
import React, { useState, useCallback } from 'react';
import { Search, Info, Terminal, AlertCircle } from 'lucide-react';
import { fetchSuiTransaction } from './services/suiService';
import { generateTransactionExplanationStream } from './services/geminiService'; // filename stays the same
import { AppState, LoadingState } from './types';
import { Button } from './components/ui';
import { ResultView } from './components/ResultView';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    digest: '',
    transactionData: null,
    explanation: '',
    status: LoadingState.IDLE,
    errorMessage: null,
  });

  // Helper to extract digest from URLs and handle common paste errors
  const cleanAndValidateInput = (input: string): { digest: string; error?: string } => {
    let cleaned = input.trim();

    // Extract digest from URLs (Suiscan, Sui Explorer, etc.)
    if (cleaned.includes('/') || cleaned.includes('http')) {
      try {
        const segments = cleaned.split(/[/?#]/).filter(Boolean);
        if (segments.length > 0) {
          cleaned = segments[segments.length - 1];
        }
      } catch (e) {
        // ignore
      }
    }

    if (cleaned.startsWith('0x')) {
      return {
        digest: cleaned,
        error: "It looks like you pasted an Object ID or Address (starts with '0x'). Please enter a Transaction Digest."
      };
    }

    if (cleaned.length < 20) {
      return { digest: cleaned, error: "The digest seems too short. Please check your input." };
    }

    return { digest: cleaned };
  };

  const handleFetchAndExplain = useCallback(async (digestOverride?: string) => {
    const rawInput = digestOverride || state.digest;

    if (!rawInput) {
      setState(prev => ({ ...prev, errorMessage: 'Please enter a valid transaction digest.' }));
      return;
    }

    const { digest, error } = cleanAndValidateInput(rawInput);

    if (digest !== rawInput && !error) {
      setState(prev => ({ ...prev, digest }));
    }

    if (error) {
      setState(prev => ({ ...prev, status: LoadingState.ERROR, errorMessage: error }));
      return;
    }

    setState(prev => ({
      ...prev,
      digest,
      status: LoadingState.FETCHING_DATA,
      errorMessage: null,
      explanation: '',
      transactionData: null,
    }));

    try {
      const txData = await fetchSuiTransaction(digest);

      setState(prev => ({
        ...prev,
        transactionData: txData,
        status: LoadingState.GENERATING_EXPLANATION,
      }));

      // GROQ STREAMING (works perfectly now)
      const stream = await generateTransactionExplanationStream(txData);
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const textChunk = decoder.decode(value, { stream: true });
          setState(prev => ({
            ...prev,
            explanation: prev.explanation + textChunk
          }));
        }
      } finally {
        reader.releaseLock();
      }

      setState(prev => ({ ...prev, status: LoadingState.SUCCESS }));

    } catch (error: any) {
      console.error('Transaction decode error:', error);
      setState(prev => ({
        ...prev,
        status: LoadingState.ERROR,
        errorMessage: error.message || 'Failed to decode transaction. Please try again.',
      }));
    }
  }, [state.digest]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFetchAndExplain();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-4xl mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-4">
          <Terminal size={32} className="text-blue-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-3">
          Sui Transaction Decoder
        </h1>
        <p className="text-slate-400 text-lg max-w-lg mx-auto">
          Paste a transaction digest (or URL) and get an instant plain-English explanation.
        </p>
      </header>

      <main className="w-full max-w-3xl space-y-8">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative flex items-center bg-slate-800 rounded-lg p-2 shadow-xl border border-slate-700">
            <Search className="text-slate-400 ml-3 mr-2" size={20} />
            <input
              type="text"
              placeholder="Paste Digest or URL (e.g. AAA...)"
              className="bg-transparent border-none outline-none flex-1 text-white placeholder-slate-500 p-2 w-full"
              value={state.digest}
              onChange={(e) => setState(prev => ({ ...prev, digest: e.target.value, errorMessage: null }))}
              onKeyDown={handleKeyDown}
            />
            <Button
              onClick={() => handleFetchAndExplain()}
              isLoading={state.status === LoadingState.FETCHING_DATA || state.status === LoadingState.GENERATING_EXPLANATION}
              disabled={!state.digest.trim()}
            >
              Decode
            </Button>
          </div>
        </div>

        {state.status === LoadingState.ERROR && state.errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg flex items-start gap-3 animate-fade-in">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <p className="text-sm md:text-base">{state.errorMessage}</p>
          </div>
        )}

        {!state.transactionData && state.status !== LoadingState.FETCHING_DATA && (
          <div className="text-center mt-12">
            <p className="text-slate-500 text-sm mb-4">
              Don't have a digest? Find one on{' '}
              <a href="https://suiscan.xyz/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                Suiscan
              </a>{' '}
              or in your wallet history.
            </p>
          </div>
        )}

        {state.transactionData && (
          <ResultView
            data={state.transactionData}
            explanation={state.explanation}
            isStreaming={state.status === LoadingState.GENERATING_EXPLANATION}
          />
        )}

        <footer className="pt-12 pb-6 text-center text-slate-600 text-sm">
          <p className="flex items-center justify-center gap-2">
            <Info size={14} />
            Powered by Groq (Llama 3.1) & Sui Mainnet RPC
          </p>
        </footer>
      </main>
    </div>
  );
};

export default App;