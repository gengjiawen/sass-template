import { randomBytes } from 'node:crypto'

export function generateUserApiToken(): string {
  return `nss_${randomBytes(32).toString('hex')}`
}
