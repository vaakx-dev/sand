import type { ToolSpec } from '@sand/accounts/contract'
import type { Media } from '@sand/media/contract'
import { expect, test } from 'bun:test'
import { toolServer } from '../src/session/tools'

const media: Media = { put: () => ({ hash: 'h', size: 1, mediaType: 'text/plain' }), path: () => '', data: () => undefined, exclude() {}, include() {}, inUse: () => () => {} }

const schema = { type: 'object' }

const tools: ToolSpec[] = [
  { name: 'read', description: 'Read a file', inputSchema: schema },
  { name: 'find_tools', description: 'Load more tools', inputSchema: schema },
  { name: 'calendar', description: 'Read a calendar', inputSchema: schema, deferred: { found: false } },
  { name: 'mail', description: 'Read mail', inputSchema: schema, deferred: { found: true } },
]

test('Claude Code loads on-demand tools with its own tool search, found or not, so finding one never changes the tool list it caches', async () => {
  const serve = toolServer({ tools, media, call: () => Promise.reject(new Error('no calls here')) })

  const listed = await serve({ jsonrpc: '2.0', id: 1, method: 'tools/list' })

  expect(listed).toMatchObject({
    result: {
      tools: [
        { name: 'read', _meta: { 'anthropic/alwaysLoad': true } },
        { name: 'calendar', _meta: { 'anthropic/alwaysLoad': false } },
        { name: 'mail', _meta: { 'anthropic/alwaysLoad': false } },
      ],
    },
  })
})
