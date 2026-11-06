import { expect, test } from 'bun:test'
import { createApp, definePlugin, service } from 'drydock'
import { startOrder } from '../src/order'

const database = service<{ open: boolean }>('database')

test('plugins stop in reverse of when they started, so a plugin stops before the service it uses', async () => {
  const app = createApp()
  const latestStartedFirst = startOrder(app)
  const seen: boolean[] = []
  const user = app.plugin(
    definePlugin({
      name: 'user',
      inject: { database },
      apply(ctx) {
        ctx.effect(() => () => void seen.push(ctx.database.open))
      },
    }),
  )
  const provider = app.plugin(
    definePlugin({
      name: 'provider',
      apply(ctx) {
        const db = { open: true }
        ctx.provide(database, db)
        ctx.effect(() => () => void (db.open = false))
      },
    }),
  )
  await app.settled()
  for (const [, scope] of latestStartedFirst([['provider', provider], ['user', user]])) await scope.dispose()
  expect(seen).toEqual([true])
  await app.dispose()
})
