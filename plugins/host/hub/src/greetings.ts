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

  const values = (client: Client): HelloValues => {
    const found: HelloValues = {}
    for (const [id, source] of sources) {
      const value = source(client.caller, client.socket)
      if (value !== undefined) found[id] = value
    }
    return found
  }

  return { greet, values }
}

export type Greetings = ReturnType<typeof createGreetings>
