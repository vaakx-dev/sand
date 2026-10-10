import type { Context } from 'drydock'

export type Names = Record<string, string | null | undefined>

type Wire = Context<'wire'>['wire']

const one = async (wire: Wire, device: string, cwd: string) =>
  [cwd, (await wire.call<string | null | undefined>({ type: 'git.branch', cwd }, device)) ?? null] as const

export const askBranches = async (wire: Wire, device: string, cwds: string[]): Promise<Names> => {
  try {
    return await wire.call<Names>({ type: 'git.branches', cwds }, device)
  } catch (error) {
    if (!device) throw error
    return Object.fromEntries(await Promise.all(cwds.map(cwd => one(wire, device, cwd))))
  }
}
