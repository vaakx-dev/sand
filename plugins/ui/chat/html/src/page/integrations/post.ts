export const post = (method: string, params?: object, id?: number) => window.parent.postMessage({ jsonrpc: '2.0', id, method, params }, '*')
