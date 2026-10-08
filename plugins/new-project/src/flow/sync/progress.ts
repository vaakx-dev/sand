import type { SyncProgress } from '@sand/protocol'

export const progressText = ({ phase, sent, total, text }: SyncProgress) => ((phase === 'history' || phase === 'files') && total > 0 ? `${text} ${sent} of ${total}` : text)
