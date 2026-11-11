import { botSend } from '@sand/bot-turns/contract'
import { botCreate } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import { startSand } from '@sand/harness'
import { expect, test } from 'bun:test'
import { type AskAnswer, answerEntry, logins, loginsState, secretEntry, secretSave } from '../src/contract'
import { answer, botEntries, call, idle, models, said } from './fixture'

const offTopLevel = ['threads', 'calendar', 'computers', 'pcs', 'notifications', 'mcp-server', 'updates']

test('with threads off and bots on, logins loads, serves its state and saves a secret a bot asks for to that bot', async () => {
  const replies = [[call('request_secret', { title: 'Deploy token', reason: 'To deploy', once: false })], [said('Saved.')]]
  const sand = await startSand([{ id: 'fake', models: ['m'], replies, api: 'anthropic' }], {
    config: `[features]\n${offTopLevel.map(id => `${id} = false`).join('\n')}`,
  })
  try {
    expect(sand.problems()).toEqual([])
    expect(sand.app.get(sessions)).toBeUndefined()
    expect(sand.app.get(logins)).toBeDefined()
    expect((await sand.ask(loginsState, {})).logins).toEqual([])

    const bot = await sand.ask(botCreate, { name: 'Deployer', models })
    await sand.ask(botSend, { bot: bot.id, prompt: 'Deploy', clientRequestId: 'deploy' })
    const entries = botEntries(sand, bot.id)
    await answer(sand, bot.id, entries, secretEntry, secretSave, id => ({ session: bot.id, id, save: true, value: 'deploy-token-value' }))
    await idle(sand, bot.id)

    const saved = (await entries()).flatMap(entry => (entry.type === answerEntry ? [entry.data as AskAnswer] : []))
    expect(saved.map(found => found.status)).toEqual(['saved'])
    const [login] = (await sand.ask(loginsState, {})).logins
    expect(login).toMatchObject({ id: saved[0]!.login, name: 'Deploy token', bots: [bot.id], threads: [] })
    expect(sand.app.get(logins)!.list({ owner: 'bot', id: bot.id })).toMatchObject([{ id: login!.id, access: 'allowed' }])
  } finally {
    await sand.stop()
  }
}, 60_000)
