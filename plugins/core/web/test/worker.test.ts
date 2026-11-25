import { expect, test } from 'bun:test'
import { workerResponse } from '../src/pwa/worker'

type Answer = (request: Request) => Promise<Response>

interface FetchEvent {
  request: Request
  respondWith(response: Promise<Response>): void
}

const ORIGIN = 'https://sand.localhost'

const cacheStorage = () => {
  const entries = new Map<string, Response>()
  const pathOf = (key: Request | string) => new URL(typeof key === 'string' ? key : key.url, ORIGIN).pathname
  const cache = {
    keys: async () => [...entries.keys()].map(path => new Request(ORIGIN + path)),
    match: async (key: Request | string) => entries.get(pathOf(key))?.clone(),
    put: async (key: Request | string, response: Response) => void entries.set(pathOf(key), response),
    addAll: async () => {},
    delete: async (key: Request | string) => entries.delete(pathOf(key)),
  }
  return { open: async () => cache, keys: async () => ['sand-shell-v2'], delete: async () => true }
}

const startWorker = async (answer: { current: Answer }) => {
  const listeners = new Map<string, (event: FetchEvent) => void>()
  const self = { addEventListener: (type: string, listener: (event: FetchEvent) => void) => listeners.set(type, listener) }
  const script = await workerResponse({ entry: '', preload: [], assets: new Map(), bundled: [], problems: [], failed: {} }).text()
  new Function('self', 'caches', 'fetch', 'location', script)(self, cacheStorage(), (request: Request) => answer.current(request), new URL(ORIGIN))
  return (path: string) =>
    new Promise<Response>(resolve => {
      const request = new Request(ORIGIN + path)
      Object.defineProperty(request, 'mode', { value: 'navigate' })
      listeners.get('fetch')?.({ request, respondWith: response => void response.then(resolve) })
    })
}

const page = (body: string, status = 200) => async () => Object.defineProperty(new Response(body, { status }), 'type', { value: 'basic' })

test('a page the PC cannot serve opens the cached shell, while real answers pass through', async () => {
  const answer = { current: page('fresh shell') }
  const navigate = await startWorker(answer)
  await navigate('/')

  answer.current = page('', 503)
  expect(await (await navigate('/?view=thread&id=garden')).text()).toBe('fresh shell')

  answer.current = () => Promise.reject(new TypeError('offline'))
  expect(await (await navigate('/')).text()).toBe('fresh shell')

  answer.current = page('Update sand on your PC', 426)
  const outdated = await navigate('/')
  expect([outdated.status, await outdated.text()]).toEqual([426, 'Update sand on your PC'])
})
