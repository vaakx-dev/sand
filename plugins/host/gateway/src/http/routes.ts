import { devicePaths } from '@sand/devices-contract'
import type { Reply, Visitor } from './peer'

export interface Route {
  method: 'GET' | 'POST'
  handle(request: Request, visitor: Visitor): Reply
}

export interface RoutesOptions {
  identity(request: Request): Promise<Response>
  ticket(request: Request, visitor: Visitor): Promise<Response>
  socket(request: Request, visitor: Visitor): Reply
}

export const createRoutes = ({ identity, ticket, socket }: RoutesOptions) =>
  new Map<string, Route>([
    [devicePaths.identity, { method: 'GET', handle: identity }],
    [devicePaths.ticket, { method: 'POST', handle: ticket }],
    [devicePaths.socket, { method: 'GET', handle: socket }],
  ])
