import { findFiles } from '@sand/app-plan'
import { join } from 'node:path'

export const sessionFiles = (home: string, id: string) => findFiles(join(home, 'sessions'), `**/rollout-*-${id}.jsonl`)
