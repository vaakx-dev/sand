import { fieldsOf, type Json, type Rpc } from './rpc'

const kept = new Set([
  'content_item_kinds',
  'daemon_auto_start',
  'enable_request_compression',
  'fast_mode',
  'secret_auth_storage',
  'system_proxy_fallback',
  'unbounded_connection_retries',
])

const listed = async (rpc: Rpc, cursor?: string): Promise<Json[]> => {
  const { data, nextCursor } = await rpc.request('experimentalFeature/list', cursor ? { cursor } : {})
  const page = Array.isArray(data) ? data.map(fieldsOf) : []
  return typeof nextCursor === 'string' ? [...page, ...(await listed(rpc, nextCursor))] : page
}

export const unwantedFeatures = async (rpc: Rpc) =>
  (await listed(rpc)).flatMap(({ name, stage }) => (typeof name === 'string' && stage !== 'removed' && !kept.has(name) ? [name] : []))
