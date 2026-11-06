import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import {
  approvalAnswer,
  approvalMode,
  approvalRuleRemove,
  type Approvals,
  approvalSettings,
  approvalSettingsChange,
  approvalSettingsWire,
  approvalsChange,
  approvalsWire,
  helloApprovals,
} from './contract'

export const serveApprovals = (ctx: Context, server: Server, approvals: Approvals) => {
  const settings = () => ({ mode: approvals.mode(), rules: approvals.rules() })
  return joinDisposers(
    server.hello(helloApprovals, approvals.waiting),
    server.handle(approvalAnswer, ({ id, answer }) => approvals.answer(id, answer)),
    server.handle(approvalSettings, settings),
    server.handle(approvalRuleRemove, ({ id }) => {
      approvals.removeRule(id)
      return settings()
    }),
    server.handle(approvalMode, ({ mode }) => {
      approvals.setMode(mode)
      return settings()
    }),
    ctx.on(approvalsChange, waiting => server.broadcast(approvalsWire, waiting)),
    ctx.on(approvalSettingsChange, () => server.broadcast(approvalSettingsWire, settings())),
  )
}
