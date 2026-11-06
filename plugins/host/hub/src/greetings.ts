import { errorMessage } from '@sand/util'
import type { Dispose } from 'drydock'
import type { Client } from './client'
import type { HelloField, HelloSource, HelloValues } from './contract'

export const createGreetings = () => {
  const sources = new Map<string, HelloSource<unknown>>()

  const greet = <T>(field: HelloField<T>, value: HelloSource<T>): Dispose => {
    const source = value as HelloSource<unknown>
    sources.set(field.id, source)
    return () => {
      if (sources.get(field.id) === source) sources.delete(field.id)
    }
  }

  const failed = new WeakSet<HelloSource<unknown>>()

  const read = (id: string, source: HelloSource<unknown>, client: Client) => {
    try {
      return source(client.caller, client.socket)
    } catch (error) {
      if (!failed.has(source)) console.error(`hub left the hello field ${id} out: ${errorMessage(error)}`)
      failed.add(source)
      return undefined
    }
  }

  const values = (client: Client): HelloValues => {
    const found: HelloValues = {}
    for (const [id, source] of sources) {
      const value = read(id, source, client)
      if (value !== undefined) found[id] = value
    }
    return found
  }

  return { greet, values }
}

export type Greetings = ReturnType<typeof createGreetings>
