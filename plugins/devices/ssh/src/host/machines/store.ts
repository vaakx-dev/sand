import { serial } from '@sand/util'
import { writePrivateJson } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'

const port = z.number().int().min(1).max(65535)

const machineSchema = z.object({
  pc: z.string().min(1),
  host: z.string().min(1),
  name: z.string().min(1),
  target: z.string().min(1),
  platform: z.enum(['linux', 'darwin', 'win32']),
  lport: port,
  rport: port,
})

export type Machine = z.infer<typeof machineSchema>

const fileSchema = z.object({ machines: z.array(machineSchema) })

const readMachines = async (file: string) => {
  const text = await Bun.file(file)
    .text()
    .catch(() => undefined)
  if (text === undefined) return []
  const parsed = fileSchema.safeParse(JSON.parse(text))
  if (!parsed.success) throw new Error(`${file} isn't a list of SSH machines: ${parsed.error.message}`)
  return parsed.data.machines
}

export const openStore = async (home: string) => {
  const folder = join(home, 'ssh')
  const file = join(folder, 'machines.json')
  const machines = new Map((await readMachines(file)).map(machine => [machine.pc, machine]))
  const queue = serial()

  const write = () =>
    queue(async () => {
      await mkdir(folder, { recursive: true })
      await writePrivateJson(file, { machines: [...machines.values()] })
    })

  return {
    list: () => [...machines.values()],
    get: (pc: string) => machines.get(pc),
    put(machine: Machine) {
      machines.set(machine.pc, machine)
      return write()
    },
    remove(pc: string) {
      if (!machines.delete(pc)) return Promise.resolve()
      return write()
    },
  }
}

export type Store = Awaited<ReturnType<typeof openStore>>
