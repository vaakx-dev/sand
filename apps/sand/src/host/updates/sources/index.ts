import type { UpdateSource } from '../types'
import { pcSources } from './pc'

export const updateSources = async (home: string): Promise<UpdateSource[]> => [...(await pcSources(home))]

export const findSource = async (home: string, id: string): Promise<UpdateSource | undefined> =>
  (await updateSources(home)).find(source => source.id === id)
