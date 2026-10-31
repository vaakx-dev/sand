import type { RowDecoration } from '../contract'

export const attempt = <T>(decoration: RowDecoration, run: () => T): T | undefined => {
  try {
    return run()
  } catch (error) {
    console.error(`sidebar decoration "${decoration.id}" failed`, error)
    return undefined
  }
}
