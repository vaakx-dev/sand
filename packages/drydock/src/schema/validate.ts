import type { StandardIssue, StandardSchemaV1 } from './standard'

const describe = (issue: StandardIssue) => {
  const path = issue.path?.map(part => String(typeof part === 'object' ? part.key : part)).join('.')
  return path ? `${path}: ${issue.message}` : issue.message
}

export class ConfigError extends Error {
  constructor(readonly issues: ReadonlyArray<StandardIssue>) {
    super(`Invalid config\n${issues.map(describe).join('\n')}`)
  }
}

export const validate = async (schema: StandardSchemaV1 | undefined, value: unknown) => {
  if (!schema) return value
  const result = await schema['~standard'].validate(value)
  if (result.issues) throw new ConfigError(result.issues)
  return result.value
}
