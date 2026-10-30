import { backoffBase, backoffMax } from '../timing'

export const backoffDelay = (failures: number) => Math.min(backoffMax, backoffBase * 2 ** failures) * (0.5 + Math.random() * 0.5)
