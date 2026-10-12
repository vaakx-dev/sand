import type { Pc, Pcs } from '@sand/pc-link/contract'

export const folderOn = async (pcs: Pcs, pc: Pc, name: string) => {
  const { root, sep } = await pcs.projects(pc)
  return { root, path: `${root.replace(/[\\/]+$/, '')}${sep}${name}` }
}
