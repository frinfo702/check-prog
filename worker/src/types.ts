export interface Env {
  CLASSROOM: DurableObjectNamespace;
  SEATMAP_SECRET: string;
  /** 自動取り下げまでの時間。未設定なら5分。スモークテストだけが短く設定する。 */
  HAND_TTL_MS?: string;
}
