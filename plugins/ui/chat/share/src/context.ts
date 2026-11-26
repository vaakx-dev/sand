import { composer } from '@sand/composer/contract'
import { newThreads, threadRows } from '@sand/threads-home/contract'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { projects, threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'

const inject = { kit, shell, threads, projects, composer, threadRows, newThreads }

type ShareContext = Context<typeof inject>

export { inject, type ShareContext }
