import type { SessionSettings, SettingsPatch } from '@sand/model/contract'

export interface WorkerModel {
  get(): SessionSettings
}

declare module 'drydock' {
  interface Services {
    workerModel: WorkerModel
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'workerModel.get': {}
    'workerModel.save': SettingsPatch
  }

  interface WireEvents {
    'workerModel.change': [settings: SessionSettings]
  }
}
