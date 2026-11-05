import type { DeviceRecord } from '@sand/devices-contract'
import { expect, test } from 'bun:test'
import { createAuth } from '../src/auth'
import { createRegistry } from '../src/registry'

const thisPc = { id: 'pc', publicKey: 'pc-key', name: () => 'Desk' }

const open = (saved: DeviceRecord[]) => {
  const file = { saved, written: saved, save: async (records: DeviceRecord[]) => void (file.written = records) }
  const registry = createRegistry(file)
  return { file, registry, auth: createAuth(registry, thisPc) }
}

test("an agent's token signs it in after a restart and stops working once the agent is removed, and only its hash is kept", async () => {
  const first = open([])
  const { device, token } = await first.registry.addAgent({ name: 'Claude on the laptop', access: 'read' }, 'phone')
  expect(JSON.stringify(first.file.written)).not.toContain(token)

  const { registry, auth } = open(first.file.written)
  expect(auth.agent(token)).toEqual({ caller: { device: device.id, kind: 'agent' }, name: 'Claude on the laptop', access: 'read' })
  expect(auth.agent(`${token}x`)).toBeUndefined()

  const revoked: string[] = []
  auth.onRevoke(id => void revoked.push(id))
  await registry.remove(device.id, 'phone')
  expect(auth.agent(token)).toBeUndefined()
  expect(revoked).toEqual([device.id])
})
