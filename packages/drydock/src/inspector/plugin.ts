import type { TraceRecord } from '../events/bus'
import { scopeOf } from '../context/create'
import { definePlugin } from '../plugin/define'
import { hooks, services, tree } from './snapshot'
import './types'

const limit = 1000

export const inspector = definePlugin({
  name: 'inspector',
  apply(ctx) {
    const { app } = scopeOf(ctx)
    const records: TraceRecord[] = []
    ctx.effect(() =>
      app.bus.observe(record => {
        records.push(record)
        if (records.length > limit) records.shift()
      }),
    )
    ctx.provide('inspector', {
      tree: () => tree(app.root),
      services: () => services(app),
      hooks: () => hooks(app),
      trace: () => [...records],
    })
  },
})
