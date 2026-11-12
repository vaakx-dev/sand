import type { WireHost } from '@sand/host-hub/contract'
import { joinDisposers } from '@sand/util'
import { terminalAck, terminalAttach, terminalBusy, terminalClose, terminalDetach, terminalInput, terminalList, terminalOpen, terminalResize } from '../contract'
import type { Terminals } from './terminals'

export const serveTerminals = (host: Pick<WireHost, 'handle'>, terminals: Terminals) =>
  joinDisposers(
    host.handle(terminalList, input => terminals.list(input)),
    host.handle(terminalOpen, (input, caller) => terminals.open(input, caller)),
    host.handle(terminalAttach, (input, caller) => terminals.attach(input, caller)),
    host.handle(terminalInput, (input, caller) => terminals.input(input, caller)),
    host.handle(terminalAck, (input, caller) => terminals.ack(input, caller)),
    host.handle(terminalResize, (input, caller) => terminals.resize(input, caller)),
    host.handle(terminalDetach, (input, caller) => terminals.detach(input, caller)),
    host.handle(terminalBusy, input => terminals.busy(input)),
    host.handle(terminalClose, input => terminals.close(input)),
  )
