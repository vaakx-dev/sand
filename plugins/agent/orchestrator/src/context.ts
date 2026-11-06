import { sessions } from '@sand/chats/contract'
import { ledger } from '@sand/ledger/contract'
import { modelSettings } from '@sand/model/contract'
import { projectFiles } from '@sand/project/contract'
import { turns } from '@sand/turns-contract/contract'
import type { Context } from 'drydock'

export const inject = { sessions, turns, ledger, modelSettings, projectFiles }

export type OrchestratorContext = Context<typeof inject>
