import type { AppPlan, PlanLimits } from '@sand/llm-accounts/contract'
import { definePlugin } from 'drydock'
import { listModels, readUsage } from './account/probe'
import { signInClaude } from './account/sign-in'
import { readStatus, signOutClaude } from './account/status'
import { installUrl } from './cli/binary'
import { openSession } from './session/session'

const claudePlan = (report: (limits: PlanLimits) => void): AppPlan => ({
  id: 'claude',
  label: 'Claude Code',
  name: 'Claude',
  detail: 'Uses your sign-in from the Claude Code app on this PC',
  logo: 'anthropic',
  app: 'Claude Code',
  install: installUrl,
  family: 'anthropic',
  status: readStatus,
  signIn: signInClaude,
  signOut: signOutClaude,
  models: listModels,
  usage: readUsage,
  open: (setup, output) => openSession(setup, output, report),
})

export default definePlugin({
  name: 'claude-code',
  description: 'Adds Claude Code to Settings → Accounts using the Claude Code app on this PC: sand runs the claude CLI with sand’s own tools and prompt, and the app keeps its own sign-in',
  apply(ctx) {
    ctx.watch('llmPlans', plans => plans?.register(claudePlan(limits => plans.limits('claude', limits))))
  },
})
