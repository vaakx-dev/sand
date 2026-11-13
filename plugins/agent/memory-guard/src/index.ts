import { engine } from '@sand/engine/contract'
import type { Memory } from '@sand/machine'
import { machineRead, processes } from '@sand/processes/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { stopChat } from './stop'

const LOW_READINGS = 2
const WORTH_STOPPING_BYTES = 256 * 1024 * 1024
const MB = 1024 * 1024

interface Limits {
  low_percent: number
  low_mb: number
}

const lowBytes = ({ totalBytes }: Memory, { low_percent, low_mb }: Limits) => Math.min((totalBytes * low_percent) / 100, low_mb * MB)

export default definePlugin({
  name: 'memory-guard',
  description: "Watches this PC's free memory readings; when it stays very low, stops the chat whose processes use the most and kills them, never sand itself",
  inject: { engine, processes },
  config: z.object({
    low_percent: z.number().positive().max(100).default(10),
    low_mb: z.number().int().positive().default(2_048),
  }),
  apply(ctx, config) {
    let streak = 0

    const stopHungriest = async (reading: Memory) => {
      const [hungriest] = await ctx.processes.chats()
      if (hungriest && hungriest.bytes >= WORTH_STOPPING_BYTES) stopChat(ctx, ctx.engine, hungriest, reading)
    }

    const check = async (reading: Memory) => {
      streak = reading.freeBytes < lowBytes(reading, config) ? streak + 1 : 0
      if (streak < LOW_READINGS) return
      streak = 0
      await stopHungriest(reading)
    }

    ctx.on(machineRead, reading => void check(reading).catch(error => ctx.report(error)))
  },
})
