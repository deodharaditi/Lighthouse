export type Platform = "Meta" | "Google" | "TikTok" | "LinkedIn" | "Display";

export type PipelineEvent =
  | { event: "generator_start"; attempt: number }
  | { event: "generator_done"; attempt: number; ad: string }
  | { event: "critic_done"; attempt: number; status: "PASS" | "FAIL"; violations: string[]; suggestions: string[]; reasoning: string[] }
  | { event: "pipeline_done"; outcome: "APPROVED" | "HUMAN_REVIEW"; attempts: number; final_ad: string }
  | { event: "error"; message: string };

export interface AttemptState {
  attempt: number;
  generatorStatus: "idle" | "thinking" | "done";
  ad: string;
  criticStatus: "idle" | "thinking" | "pass" | "fail";
  violations: string[];
  suggestions: string[];
  reasoning: string[];
  generatorLatency?: number;
  criticLatency?: number;
}

export interface PipelineResult {
  outcome: "APPROVED" | "HUMAN_REVIEW";
  attempts: number;
  final_ad: string;
}
