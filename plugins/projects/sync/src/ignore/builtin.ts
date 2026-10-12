const secretPatterns = ['.env', '.env.*', '*.pem', '*.key', 'id_rsa*', 'id_ed25519*']

export const junkPatterns = ['node_modules/', '.DS_Store', 'Thumbs.db', '__pycache__/', '.venv/']

const secretNames = new RegExp(`^(?:${secretPatterns.map(pattern => pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')).join('|')})$`)

export const isSecret = (name: string) => secretNames.test(name)

export const isAlwaysSkipped = (name: string) => name === '.git' || isSecret(name)
