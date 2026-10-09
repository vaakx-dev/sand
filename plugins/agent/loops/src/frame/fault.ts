const external = Symbol('sand.loops.external')

export const markExternal = (error: unknown) => {
  const tagged = error !== null && typeof error === 'object' ? error : new Error(String(error))
  Reflect.set(tagged, external, true)
  return tagged
}

export const outside =
  <A extends unknown[], R>(run: (...args: A) => Promise<R>) =>
  async (...args: A) => {
    try {
      return await run(...args)
    } catch (error) {
      throw markExternal(error)
    }
  }

export const isExternal = (error: unknown) => error !== null && typeof error === 'object' && Reflect.get(error, external) === true

export const isFault = (error: unknown, signal: AbortSignal) => !signal.aborted && !isExternal(error)
