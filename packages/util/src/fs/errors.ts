import { z } from 'zod'

const coded = z.object({ code: z.string() })

export const errorCode = (error: unknown) => coded.safeParse(error).data?.code

export const isMissing = (error: unknown) => {
  const code = errorCode(error)
  return code === 'ENOENT' || code === 'ENOTDIR'
}
