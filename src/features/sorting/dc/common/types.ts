/** One entry of the call-stack strip drawn at the top of the divide & conquer canvases. */
export interface CallFrame {
  /** Stable key so chips animate in / out as calls are pushed and popped. */
  key: string;
  label: string;
  kind: "call" | "merge" | "partition";
}
