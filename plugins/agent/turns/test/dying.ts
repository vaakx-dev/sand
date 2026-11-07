import { llmEvent } from '@sand/accounts/contract'
import { startSand } from '@sand/harness'
import { tools } from '@sand/tools/contract'
import { z } from 'zod'

const [home, script] = process.argv.slice(2)
const { replies, after } = JSON.parse(script!)
const sand = await startSand([{ id: 'fake', models: ['m'], replies }], { home })
const chat = sand.chat('fake/m')

const ready = () => console.log(JSON.stringify({ chat: chat.id, turn: sand.turns.current(chat)?.id }))

const hang = (name: string) => () => {
  if (after === name) ready()
  return new Promise<string>(() => {})
}

sand.tool('echo', ({ word }) => String(word))
sand.tool('gate', (_input, { progress }) => {
  progress('halfway')
  return hang('gate')()
})
sand.app.get(tools)!.register({ name: 'look', description: 'look', input: z.object({}), effect: 'read', run: hang('look') })
const stop = sand.app.on(llmEvent, event => {
  if (after !== 'text' || event.type !== 'text') return
  stop()
  setTimeout(ready, 2_500)
})
void sand.turns.run(chat, 'go')
