import React from 'react';
import { SuiTransactionBlockResponse } from '../types';
import { Badge, Card } from './ui';
import ReactMarkdown from 'react-markdown';
import { Activity, CheckCircle, XCircle, Fuel, Box } from 'lucide-react';

interface ResultViewProps {
  data: SuiTransactionBlockResponse;
  explanation: string;
  isStreaming: boolean;
}

export const ResultView: React.FC<ResultViewProps> = ({ data, explanation, isStreaming }) => {
  // Helper to calculate total gas safely
  const getGasTotal = () => {
    if (!data.effects?.gasUsed) return '0';
    const { computationCost, storageCost, storageRebate } = data.effects.gasUsed;
    // Simple calculation: Comp + Storage - Rebate
    const total = (BigInt(computationCost) + BigInt(storageCost) - BigInt(storageRebate));
    // Convert MIST to SUI (1 SUI = 1,000,000,000 MIST)
    const totalSui = Number(total) / 1_000_000_000;
    return totalSui.toFixed(6);
  };

  const status = data.effects?.status.status === 'success' ? 'Success' : 'Failed';
  const statusColor = status === 'Success' ? 'green' : 'red';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg ${status === 'Success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {status === 'Success' ? <CheckCircle size={24} /> : <XCircle size={24} />}
            </div>
            <div>
                <p className="text-sm text-slate-400">Status</p>
                <p className="font-semibold text-lg text-slate-100">{status}</p>
            </div>
        </Card>

        <Card className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400">
                <Fuel size={24} />
            </div>
            <div>
                <p className="text-sm text-slate-400">Net Gas Fee</p>
                <p className="font-semibold text-lg text-slate-100">{getGasTotal()} SUI</p>
            </div>
        </Card>

        <Card className="flex items-center space-x-4">
            <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
                <Box size={24} />
            </div>
            <div>
                <p className="text-sm text-slate-400">Epoch</p>
                <p className="font-semibold text-lg text-slate-100">{data.effects?.executedEpoch || 'Unknown'}</p>
            </div>
        </Card>
      </div>

      {/* AI Explanation Section */}
      <Card className="relative overflow-hidden border-blue-500/30 shadow-[0_0_40px_-15px_rgba(59,130,246,0.2)]">
        <div className="flex items-center space-x-2 mb-4">
            <Activity className="text-blue-400 animate-pulse" size={20} />
            <h2 className="text-xl font-semibold text-blue-100">Gemini Analysis</h2>
            {isStreaming && <Badge color="blue">Generating...</Badge>}
        </div>
        
        <div className="prose prose-invert prose-blue max-w-none">
            {explanation ? (
                <ReactMarkdown 
                    components={{
                        // Override some default markdown styles to match Tailwind
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold text-white mb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-blue-200 mt-4 mb-2" {...props} />,
                        strong: ({node, ...props}) => <strong className="text-blue-300 font-semibold" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 text-slate-300" {...props} />,
                        li: ({node, ...props}) => <li className="marker:text-blue-500" {...props} />,
                        p: ({node, ...props}) => <p className="text-slate-300 leading-relaxed mb-2" {...props} />
                    }}
                >
                    {explanation}
                </ReactMarkdown>
            ) : (
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                    <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                </div>
            )}
        </div>
      </Card>

      {/* Raw JSON Toggler (Optional for power users) */}
      <details className="group">
          <summary className="list-none cursor-pointer text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-2">
              <span className="group-open:rotate-90 transition-transform">▶</span>
              Show Raw JSON Data
          </summary>
          <div className="mt-4 p-4 bg-black/30 rounded-lg border border-slate-800 overflow-x-auto">
              <pre className="text-xs text-emerald-400 font-mono">
                  {JSON.stringify(data, null, 2)}
              </pre>
          </div>
      </details>
    </div>
  );
};