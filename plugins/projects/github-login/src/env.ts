import type { ShellEnv } from '@sand/tools-shell/contract'
import type { Dispose } from 'drydock'

const helperKey = 'credential.https://github.com.helper'
const helper = '!f() { test "$1" = get && echo username=x-access-token && echo "password=$GH_TOKEN"; }; f'

const configCount = () => {
  const count = Number(process.env.GIT_CONFIG_COUNT ?? 0)
  return Number.isInteger(count) && count > 0 ? count : 0
}

export const tokenEnv = (token: string): Record<string, string> => {
  const first = configCount()
  return {
    GH_TOKEN: token,
    GIT_CONFIG_COUNT: String(first + 2),
    [`GIT_CONFIG_KEY_${first}`]: helperKey,
    [`GIT_CONFIG_VALUE_${first}`]: '',
    [`GIT_CONFIG_KEY_${first + 1}`]: helperKey,
    [`GIT_CONFIG_VALUE_${first + 1}`]: helper,
  }
}

export const applyEnv = (env: ShellEnv, token: string): Dispose => {
  const disposers = Object.entries(tokenEnv(token)).map(([name, value]) => env.set(name, value))
  return () => disposers.forEach(dispose => void dispose())
}
