// Enums
export enum LoadingState {
  IDLE = 'IDLE',
  FETCHING_DATA = 'FETCHING_DATA',
  GENERATING_EXPLANATION = 'GENERATING_EXPLANATION',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

// Sui RPC Types (Simplified for what we need)
export interface SuiTransactionBlockResponse {
  digest: string;
  timestampMs?: string;
  effects?: {
    status: {
      status: 'success' | 'failure';
      error?: string;
    };
    gasUsed?: {
      computationCost: string;
      storageCost: string;
      storageRebate: string;
      nonRefundableStorageFee: string;
    };
  };
  balanceChanges?: Array<{
    owner: { AddressOwner: string } | string;
    coinType: string;
    amount: string;
  }>;
  // We keep the raw object flexible as we pass it to Gemini
  [key: string]: any;
}

export interface AppState {
  digest: string;
  transactionData: SuiTransactionBlockResponse | null;
  explanation: string;
  status: LoadingState;
  errorMessage: string | null;
}