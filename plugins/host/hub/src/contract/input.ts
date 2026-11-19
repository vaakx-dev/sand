import type { Request } from '.'

type Issue = { message: string; path?: ReadonlyArray<PropertyKey | { key: PropertyKey }> }

const describe = (issue: Issue) => {
  const path = issue.path?.map(part => String(typeof part === 'object' ? part.key : part)).join('.')
  return path ? `${path}: ${issue.message}` : issue.message
}

const prefix = 'Invalid input for '

export const parseInput = async <I>(request: Request<I, unknown>, input: unknown) => {
  const result = await request.input()['~standard'].validate(input)
  if (result.issues) throw new Error(`${prefix}${request.id}: ${result.issues.map(describe).join('; ')}`)
  return result.value as I
}

export const rejectedInput = (error: unknown) => (error instanceof Error ? error.message : String(error)).startsWith(prefix)
