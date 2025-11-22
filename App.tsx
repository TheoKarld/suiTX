import React, { useState, useCallback } from 'react';
import { Search, Info, Terminal, AlertCircle } from 'lucide-react';
import { fetchSuiTransaction } from './services/suiService';
import { generateTransactionExplanationStream } from './services/geminiService';
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

    // 1. If it's a URL, try to extract the last segment
    if (cleaned.includes('/') || cleaned.includes('http')) {
      try {
        // Split by slashes, query params, or hashes
        const segments = cleaned.split(/[/?#]/).filter(Boolean);
        if (segments.length > 0) {
          cleaned = segments[segments.length - 1];
        }
      } catch (e) {
        // If parsing fails, keep original
      }
    }

    // 2. Validate format
    // Sui Object IDs and Addresses start with '0x'. Transaction digests generally do not.
    if (cleaned.startsWith('0x')) {
      return { 
        digest: cleaned, 
        error: "It looks like you pasted an Object ID or Address (starts with '0x'). Please enter a Transaction Digest (typically a 44-character Base58 string found in your wallet history)." 
      };
    }

    // Transaction digests are usually around 32-45 chars
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

    // Sanitize Input
    const { digest, error } = cleanAndValidateInput(rawInput);

    // If we auto-cleaned a URL, update the UI to show the actual digest
    if (digest !== rawInput && !error) {
        setState(prev => ({ ...prev, digest: digest }));
    }

    if (error) {
        setState(prev => ({ ...prev, status: LoadingState.ERROR, errorMessage: error }));
        return;
    }

    // Reset state for new fetch
    setState(prev => ({
      ...prev,
      digest: digest, // Use the cleaned digest
      status: LoadingState.FETCHING_DATA,
      errorMessage: null,
      explanation: '',
      transactionData: null,
    }));

    try {
      // 1. Fetch Data from Sui RPC
      const txData = await fetchSuiTransaction(digest);
      
      setState(prev => ({
        ...prev,
        transactionData: txData,
        status: LoadingState.GENERATING_EXPLANATION,
      }));

      // 2. Stream Explanation from Gemini
      const streamResult = await generateTransactionExplanationStream(txData);
      
      for await (const chunk of streamResult) {
        // Fix: Access .text property directly (not a function)
        const text = chunk.text;
        if (text) {
            // Functional update to append text smoothly
            setState(prev => ({
                ...prev,
                explanation: prev.explanation + text
            }));
        }
      }

      setState(prev => ({ ...prev, status: LoadingState.SUCCESS }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        status: LoadingState.ERROR,
        errorMessage: error.message || 'An unexpected error occurred.',
      }));
    }
  }, [state.digest]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFetchAndExplain();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col items-center p-4 md:p-8">
      
      {/* Header */}
      <header className="w-full max-w-4xl mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-4">
            <Terminal size={32} className="text-blue-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 mb-3">
          Sui Transaction Decoder
        </h1>
        <p className="text-slate-400 text-lg max-w-lg mx-auto">
          Paste a transaction digest (or URL) and let Gemini AI explain exactly what happened in plain English.
        </p>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-3xl space-y-8">
        
        {/* Search Input */}
        <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center bg-slate-800 rounded-lg p-2 shadow-xl border border-slate-700">
                <Search className="text-slate-400 ml-3 mr-2" size={20} />
                <input 
                    type="text"
                    placeholder="Paste Digest or URL (e.g. 8...)"
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

        {/* Error Message */}
        {state.status === LoadingState.ERROR && state.errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg flex items-start gap-3 animate-fade-in">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <p className="text-sm md:text-base">{state.errorMessage}</p>
            </div>
        )}

        {/* Empty State / Examples (Only show if IDLE or Error and no data) */}
        {!state.transactionData && state.status !== LoadingState.FETCHING_DATA && (
             <div className="text-center mt-12">
                <p className="text-slate-500 text-sm mb-4">Don't have a digest? Try finding one on <a href="https://suiscan.xyz/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Suiscan</a> or use your own wallet history.</p>
            </div>
        )}

        {/* Result View */}
        {state.transactionData && (
            <ResultView 
                data={state.transactionData} 
                explanation={state.explanation}
                isStreaming={state.status === LoadingState.GENERATING_EXPLANATION}
            />
        )}

        {/* Footer */}
        <footer className="pt-12 pb-6 text-center text-slate-600 text-sm">
            <p className="flex items-center justify-center gap-2">
                <Info size={14} />
                Powered by Gemini 2.5 Flash & Sui Mainnet RPC
            </p>
        </footer>

      </main>
    </div>
  );
};

export default App;