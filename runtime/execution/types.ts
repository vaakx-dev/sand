export interface StartRequest {
  prompt: string;
  provider?: string;
  model?: string;
  threadId?: string;
}

export interface QueueRequest extends StartRequest {
  threadId: string;
}

export interface SteerRequest {
  threadId: string;
  prompt: string;
}

export type RunFinalStatus = "complete" | "error" | "cancelled";
export type RunFinishListener = (
  threadId: string,
  status: RunFinalStatus,
  error?: string,
) => void | Promise<void>;
