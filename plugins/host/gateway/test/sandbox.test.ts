import { markSandbox } from '@sand/boot'
import { startHost, type TestHost } from '@sand/harness'
import { hostOptions } from '@sand/host-daemon/contract'
import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hostHttp } from '../src/contract'

let home: string
let host: TestHost

beforeEach(async () => {
  home = mkdtempSync(join(tmpdir(), 'sand-gateway-'))
  await markSandbox(home)
  host = await startHost(home, ['devices/registry', 'host/gateway'])
  host.app.provide(hostOptions, { home, main: '', port: 0, watch: false, drainTimeout: 0 })
  await host.app.settled()
})

afterEach(async () => {
  await host.stop()
  rmSync(home, { recursive: true, force: true })
})

test('the gateway of a sandbox stays on the loopback address when asked to open to the network', async () => {
  const http = host.app.get(hostHttp)
  if (!http) throw new Error('the gateway did not start')
  await http.bind('network')
  expect(http.scope()).toBe('local')
  expect(http.addresses()).toEqual(['127.0.0.1'])
})
