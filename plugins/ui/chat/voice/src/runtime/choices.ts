import { writeAtomic } from '@sand/util/fs'
import { openVault, type Vault } from '@sand/vault'
import { join } from 'node:path'
import { z } from 'zod'
import { type Choice, type Cloud, type CloudService, cloudServices, destinations, type Destination, services } from '../contract'

interface Saved {
  destination: Destination
  cloud?: Cloud
}

type Keys = Partial<Record<CloudService, string>>

const savedSchema = z.object({
  destination: z.enum(destinations),
  cloud: z.object({ service: z.enum(cloudServices), url: z.string(), model: z.string() }).optional(),
})

const keychain = () => (Bun.env.SAND_KEYCHAIN === 'off' ? undefined : Bun.secrets)

const readSaved = async (file: string): Promise<Saved> => {
  const parsed = savedSchema.safeParse(
    await Bun.file(file)
      .json()
      .catch(() => undefined),
  )
  return parsed.success ? parsed.data : { destination: 'off' }
}

class Choices {
  readonly #file: string
  readonly #vault: Vault<Keys>
  #saved: Saved
  #keys: Keys

  private constructor(file: string, vault: Vault<Keys>, saved: Saved, keys: Keys) {
    this.#file = file
    this.#vault = vault
    this.#saved = saved
    this.#keys = keys
  }

  static async open(folder: string) {
    const file = join(folder, 'choice.json')
    const vault = await openVault<Keys>(folder, 'keys', keychain())
    return new Choices(file, vault, await readSaved(file), (await vault.read()) ?? {})
  }

  saved() {
    return this.#saved
  }

  keys() {
    return cloudServices.filter(service => this.#keys[service])
  }

  key(service: CloudService) {
    return this.#keys[service]
  }

  async choose(choice: Choice) {
    if (choice.destination === 'cloud') await this.#keep(choice.service, choice.key)
    this.#saved = choice.destination === 'cloud' ? { destination: 'cloud', cloud: { service: choice.service, url: choice.url, model: choice.model } } : { ...this.#saved, destination: choice.destination }
    await writeAtomic(this.#file, JSON.stringify(this.#saved))
  }

  async #keep(service: CloudService, key: string | undefined) {
    if (!key && !this.#keys[service]) throw new Error(`Enter your ${services[service].label} key`)
    if (!key) return
    this.#keys = { ...this.#keys, [service]: key }
    await this.#vault.write(this.#keys)
  }
}

export { Choices }
