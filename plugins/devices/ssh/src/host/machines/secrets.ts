import { serial } from '@sand/util'
import { openVault } from '@sand/vault'

type Saved = Record<string, Record<string, string>>

const keychain = () => (Bun.env.SAND_KEYCHAIN === 'off' ? undefined : Bun.secrets)

const without = <T>(record: Record<string, T>, key: string) => Object.fromEntries(Object.entries(record).filter(([found]) => found !== key))

const same = (a: Record<string, string> | undefined, b: Record<string, string>) => JSON.stringify(a ?? {}) === JSON.stringify(b)

export const openSecrets = async (home: string) => {
  const vault = await openVault<Saved>(home, 'ssh', keychain())
  let saved: Saved = (await vault.read()) ?? {}
  const queue = serial()

  const set = (pc: string, answers: Record<string, string>) => {
    if (same(saved[pc], answers)) return Promise.resolve()
    const others = without(saved, pc)
    saved = Object.keys(answers).length ? { ...others, [pc]: answers } : others
    const next = saved
    return queue(() => (Object.keys(next).length ? vault.write(next) : vault.clear()))
  }

  return {
    of: (pc: string) => saved[pc] ?? {},
    keep: set,
    drop: (pc: string, text: string) => set(pc, without(saved[pc] ?? {}, text)),
    forget: (pc: string) => set(pc, {}),
  }
}

export type Secrets = Awaited<ReturnType<typeof openSecrets>>
