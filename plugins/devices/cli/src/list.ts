import { type DeviceRecord, devicesList, type JoinRequest, pairRequests, type PeerView, peersList } from '@sand/devices-contract'
import type { Daemon } from '@sand/host-daemon/contract'
import { deviceDetails, kindName, statusText } from './describe'
import { withLink } from './link'

const section = (title: string, lines: string[], empty: string) => (lines.length ? [title, ...lines] : [empty])

const pcLine = (record: DeviceRecord, peers: PeerView[]) => {
  const peer = peers.find(candidate => candidate.id === record.id)
  return `  ${record.name}  (${deviceDetails(record)})  ${peer ? statusText(peer.status) : 'not connected'}`
}

const requestLine = (request: JoinRequest) =>
  `  ${request.name}  (${kindName(request.kind)}, from ${request.address}, asked ${request.pcName})  code ${request.code}: sand devices approve ${request.code}`

export const listDevices = (daemon: Daemon) =>
  withLink(daemon, async link => {
    const [records, peers, requests] = await Promise.all([link.call(devicesList, {}), link.call(peersList, {}), link.call(pairRequests, {})])
    const others = records.filter(record => record.id !== link.pc.id)
    const pcs = others.filter(record => record.kind === 'pc')
    const devices = others.filter(record => record.kind !== 'pc')
    const lines = [
      `this PC: ${link.pc.name}  (${link.pc.id})`,
      '',
      ...section('your other PCs:', pcs.map(record => pcLine(record, peers)), 'no other PCs yet; `sand devices join` lists the PCs found nearby'),
      '',
      ...section(
        'phones and browsers:',
        devices.map(record => `  ${record.name}  (${deviceDetails(record)})`),
        'no phones or browsers yet; `sand devices add` shows a QR code that pairs one',
      ),
      ...(requests.length ? ['', 'waiting to join:', ...requests.map(requestLine)] : []),
    ]
    console.log(lines.join('\n'))
  })
