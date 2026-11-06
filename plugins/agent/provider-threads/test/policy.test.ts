import { type ProviderCapabilities, statelessCaps } from '@sand/accounts/contract'
import type { ProviderThreadInfo, Transition } from '../src/contract'
import { expect, test } from 'bun:test'
import { type Candidate, decide, type Target } from '../src/policy'

const api = statelessCaps(['effort', 'speed'], 300_000)
const native: ProviderCapabilities = { ...api, native: true, resume: true, steer: true, reconfigure: [] }

const thread: ProviderThreadInfo = {
  id: 't',
  owner: 'thread',
  conversation: 's',
  source: 'a',
  model: 'a/m',
  generation: 1,
  status: 'idle',
  system: '',
  seen: [],
  effort: 'high',
  speed: 'normal',
  context: 1_000,
  used: 1_000_000,
  created: 0,
}

const target = (patch: Partial<Target> = {}): Target => ({
  available: true,
  caps: api,
  selection: { source: 'a', model: 'a/m', effort: 'high', speed: 'normal' },
  cwd: '/work',
  history: true,
  ...patch,
})

const candidate = (patch: Partial<Candidate> = {}, threadPatch: Partial<ProviderThreadInfo> = {}): Candidate => ({
  thread: { ...thread, ...threadPatch },
  last: true,
  onPath: true,
  compacted: false,
  fits: true,
  now: 1_060_000,
  ...patch,
})

const full: Transition = { type: 'handoff', strategy: 'full' }
const reject = expect.objectContaining({ type: 'reject' })

test.each([
  ['an unavailable source', target({ available: false }), candidate(), reject],
  ['a first model in an empty chat', target({ history: false }), undefined, { type: 'reuse' }],
  ['a first model in a chat with history', target(), undefined, full],
  ['the model used last', target(), candidate(), { type: 'reuse' }],
  ['the model used last after a checkout', target(), candidate({ onPath: false }), { type: 'reuse' }],
  ['a native thread after a checkout', target({ caps: native }), candidate({ onPath: false }), full],
  ['a native thread whose last step is uncertain', target({ caps: native }), candidate({}, { status: 'uncertain' }), full],
  ['a native thread compacted by sand', target({ caps: native }), candidate({ compacted: true }), full],
  ['the model used last after compaction', target(), candidate({ compacted: true }), { type: 'reuse' }],
  ['a native thread in another folder', target({ caps: native }), candidate({}, { native: { id: 'n', cwd: '/elsewhere' } }), full],
  ['a native thread on the PC that shares the account, in its own folder', target({ caps: native }), candidate({}, { native: { id: 'n', cwd: '/elsewhere', pc: 'other' } }), { type: 'reuse' }],
  ['a new effort the source takes per request', target({ selection: { source: 'a', model: 'a/m', effort: 'low', speed: 'normal' } }), candidate(), { type: 'reconfigure' }],
  ['a new effort a native thread needs a restart for', target({ caps: native, selection: { source: 'a', model: 'a/m', effort: 'low', speed: 'normal' } }), candidate(), { type: 'restart_and_resume' }],
  ['a model returned to while its cache is warm', target(), candidate({ last: false }), { type: 'handoff', strategy: 'delta' }],
  ['a model returned to after its cache went cold', target(), candidate({ last: false, now: 2_000_000 }), full],
  ['a model returned to whose context would overflow', target(), candidate({ last: false, fits: false }), full],
  ['a model returned to after a checkout', target(), candidate({ last: false, onPath: false }), full],
  ['a model returned to whose last step is uncertain', target(), candidate({ last: false }, { status: 'uncertain' }), full],
  ['a model returned to on a source without a cache', target({ caps: statelessCaps() }), candidate({ last: false }), full],
] as const)('%s', (_, goal, found, expected) => {
  expect(decide(goal, found)).toEqual(expected)
})
