import type { ShellEnv } from './contract'

interface Variable {
  name: string
  value: string
  session?: string
}

export const shellEnv = () => {
  const variables = new Set<Variable>()
  const service: ShellEnv = {
    set(name, value, session) {
      const variable = { name, value, session }
      variables.add(variable)
      return () => {
        variables.delete(variable)
      }
    },
  }
  const values = (session: string) =>
    Object.fromEntries([...variables].filter(variable => !variable.session || variable.session === session).map(({ name, value }) => [name, value]))
  return { service, values }
}
