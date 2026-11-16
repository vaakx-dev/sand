import { serial } from '@sand/util'
import { readState, removeFolder, writeAtomic } from '@sand/util/fs'
import { join } from 'node:path'
import { fieldsOf, isText } from './json'

export interface Place {
  id: string
  plan: string
  name: string
}

const ID_LENGTH = 6

const placeOf = (value: unknown): Place[] => {
  const { id, plan, name } = fieldsOf(value)
  return isText(id) && isText(plan) && isText(name) ? [{ id, plan, name }] : []
}

const placesOf = (value: unknown) => (Array.isArray(value) ? value.flatMap(placeOf) : undefined)

const freshId = (plan: string) => `${plan}-${crypto.randomUUID().replaceAll('-', '').slice(0, ID_LENGTH)}`

const nextName = (label: string, taken: Place[]) => {
  const names = new Set(taken.map(place => place.name))
  const number = Array.from({ length: taken.length + 1 }, (_, at) => at + 2).find(count => !names.has(`${label} ${count}`))
  return `${label} ${number}`
}

export type Places = Awaited<ReturnType<typeof readPlaces>>

export const readPlaces = async (apps: string) => {
  const path = join(apps, 'accounts.json')
  const queue = serial()
  let list = (await readState(path, placesOf)) ?? []

  const save = (next: Place[]) => {
    list = next
    return queue(() => writeAtomic(path, JSON.stringify(next, null, 2)))
  }

  const folder = (id: string) => join(apps, 'accounts', id)

  return {
    of: (plan: string) => list.filter(place => place.plan === plan),
    get: (id: string) => list.find(place => place.id === id),
    folder,
    async add(plan: string, label: string) {
      const place: Place = { id: freshId(plan), plan, name: nextName(label, list.filter(found => found.plan === plan)) }
      await save([...list, place])
      return place
    },
    rename: (id: string, name: string) => save(list.map(place => (place.id === id ? { ...place, name } : place))),
    async remove(id: string) {
      await removeFolder(folder(id))
      await save(list.filter(place => place.id !== id))
    },
  }
}
