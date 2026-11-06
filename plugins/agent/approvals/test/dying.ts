import { approvals } from '../src/contract'
import { nextAsk, shellReplies, start } from './fixture'

const [home] = process.argv.slice(2)
const sand = await start(shellReplies, { home, plugins: ['agent/shell'] })
sand.app.get(approvals)!.setMode('careful')
const chat = sand.chat('fake/m')
const asked = nextAsk(sand)
void sand.turns.run(chat, 'check')
const decision = await asked
await sand.turns.wait(decision.turn, 'attention')
console.log(JSON.stringify({ chat: chat.id, turn: decision.turn, decision: decision.id }))
