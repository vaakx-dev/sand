import type { Slot, SpaceRegion } from '@sand/layout/contract'

export const threadsSpace = 'threads'

export const threadsSlot = (region: SpaceRegion): Slot => ({ space: threadsSpace, region })
