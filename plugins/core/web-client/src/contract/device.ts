export interface DeviceRecords<T> {
  read(key: string): Promise<T | undefined>
  write(key: string, value: T): void
  remove(key: string): void
}

export interface DeviceCache {
  records<T>(owner: string): DeviceRecords<T>
}
