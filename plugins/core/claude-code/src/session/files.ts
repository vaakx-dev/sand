import { findFiles } from '@sand/app-plan'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const projectsDir = (config?: string) => join(config ?? (process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')), 'projects')

export const sessionFiles = (id: string, config?: string) => findFiles(projectsDir(config), `*/${id}.jsonl`)
