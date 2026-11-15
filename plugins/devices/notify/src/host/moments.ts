import { readState, writeAtomic } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import { type MomentKind, momentKindSchema } from '../contract'

const savedSchema = z.object({ off: z.array(momentKindSchema()) })

export const loadMoments = async (home: string) => {
  const file = join(home, 'notify', 'moments.json')
  let off = (await readState(file, data => savedSchema.safeParse(data).data?.off)) ?? []

  const set = async (kind: MomentKind, on: boolean) => {
    const rest = off.filter(other => other !== kind)
    off = on ? rest : [...rest, kind]
    await mkdir(dirname(file), { recursive: true })
    await writeAtomic(file, JSON.stringify({ off }))
  }

  return { off: () => off, wanted: (kind: MomentKind) => !off.includes(kind), set }
}
