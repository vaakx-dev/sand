import type { McpGroup } from '@sand/mcp-server/contract'
import { z } from 'zod'

const group: McpGroup = {
  name: 'login-manage',
  label: 'Manage logins',
  summary: 'add, change and remove saved logins, choose which bots and threads may use each, connect password managers and answer secret and code requests',
}

const loginId = z.string().trim().min(1).describe('The id of a login from login_list')
const name = z.string().trim().min(1).max(100).describe("What to call it, such as 'GitHub token' or 'Northbank'")
const site = z.string().trim().min(1).max(253).describe("A website login's domain, such as bank.com")
const secret = z.string().min(1).max(4000)
const session = z.string().trim().min(1).describe('The thread or bot id the request waits in, from login_waiting')
const requestId = z.string().trim().min(1).describe('The request id from login_waiting')

export { group, loginId, name, requestId, secret, session, site }
