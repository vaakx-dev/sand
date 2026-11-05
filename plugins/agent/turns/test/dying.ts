import { llmEvent } from '@sand/accounts/contract'
import { startSand } from '@sand/harness'

const [home, script] = process.argv.slice(2)
const { replies, after } = JSON.parse(script!)
const sand = await startSand([{ id: 'fake', models: ['m'], replies }], home)
const chat = sand.chat('fake/m')

const ready = () => console.log(JSON.stringify({ chat: chat.id, turn: sand.turns.current(chat)?.id }))

sand.tool('echo', ({ word }) => String(word))
sand.tool('gate', () => {
  if (after === 'gate') ready()
  return new Promise(() => {})
})
const stop = sand.app.on(llmEvent, event => {
  if (after !== 'text' || event.type !== 'text') return
  stop()
  setTimeout(ready, 2_500)
})
void sand.turns.run(chat, 'go')
