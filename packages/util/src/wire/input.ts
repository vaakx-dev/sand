import type { Request } from '@sand/host-hub/contract'

type Issue = { message: string; path?: ReadonlyArray<PropertyKey | { key: PropertyKey }> }

const describe = (issue: Issue) => {
  const path = issue.path?.map(part => String(typeof part === 'object' ? part.key : part)).join('.')
  return path ? `${path}: ${issue.message}` : issue.message
}

export const parseInput = async <I>(request: Request<I, unknown>, input: unknown) => {
  const result = await request.input['~standard'].validate(input)
  if (result.issues) throw new Error(`Invalid input for ${request.id}: ${result.issues.map(describe).join('; ')}`)
  return result.value as I
}
