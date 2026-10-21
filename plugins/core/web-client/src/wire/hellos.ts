import type { HelloField, HelloValues } from '@sand/host-hub/contract'

export type HelloRead = <T>(field: HelloField<T>) => T | undefined

export const readField = <T>(values: HelloValues | undefined, field: HelloField<T>) => values?.[field.id] as T | undefined

export const createHellos = () => {
  const values = new Map<string, HelloValues>()

  return {
    set: (device: string, next: HelloValues) => void values.set(device, next),
    drop: (device: string) => void values.delete(device),
    get: <T>(field: HelloField<T>, device: string) => readField(values.get(device), field),
  }
}

export type Hellos = ReturnType<typeof createHellos>
