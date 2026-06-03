export type GenerateModuleOptions = {
  domains: string[]
  includeSubdomains: boolean
  collectorEndpoint: string
  token: string
  scriptBaseUrl: string
  maxSize?: number
  timeoutSeconds?: number
  enableMitm?: boolean
  protocol?: 'https' | 'http' | 'both'
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseDomains(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map((d) => d.trim())
    .filter(Boolean)
}

function normalizeDomainToken(raw: string): { patternHost: string; mitmHost: string } {
  const trimmed = raw.trim()
  if (trimmed.startsWith('*.')) {
    const base = trimmed.slice(2)
    return { patternHost: trimmed, mitmHost: trimmed }
  }
  return { patternHost: trimmed, mitmHost: trimmed }
}

function buildUrlPattern(
  host: string,
  includeSubdomains: boolean,
  protocol: 'https' | 'http' | 'both',
): string {
  const { patternHost, mitmHost: _ } = normalizeDomainToken(host)
  let hostPart: string

  if (patternHost.startsWith('*.')) {
    const base = patternHost.slice(2)
    hostPart = includeSubdomains
      ? `(?:[a-z0-9-]+\\.)*${escapeRegex(base)}`
      : escapeRegex(patternHost)
  } else if (includeSubdomains) {
    hostPart = `(?:[a-z0-9-]+\\.)*${escapeRegex(patternHost)}`
  } else {
    hostPart = escapeRegex(patternHost)
  }

  const proto = protocol === 'both' ? '(?:https?|http)' : protocol === 'http' ? 'http' : 'https'

  return `^${proto}:\\/\\/${hostPart}\\/`
}

function slugify(domain: string): string {
  return domain.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function buildMitmHostname(domains: string[], includeSubdomains: boolean): string {
  const hosts: string[] = []
  for (const raw of domains) {
    const { patternHost, mitmHost } = normalizeDomainToken(raw)
    if (patternHost.startsWith('*.')) {
      hosts.push(mitmHost)
      continue
    }
    if (includeSubdomains) {
      hosts.push(mitmHost, `*.${mitmHost}`)
    } else {
      hosts.push(mitmHost)
    }
  }
  return `%APPEND% ${[...new Set(hosts)].join(', ')}`
}

export function generateSurgeModule(
  input: GenerateModuleOptions & { domainsInput: string },
): string {
  const domains = input.domains.length > 0 ? input.domains : parseDomains(input.domainsInput)
  if (domains.length === 0) {
    throw new Error('At least one domain is required')
  }

  const maxSize = input.maxSize ?? 1_048_576
  const timeout = input.timeoutSeconds ?? 1
  const protocol = input.protocol ?? 'https'
  const enableMitm = input.enableMitm ?? true

  const scriptBase = input.scriptBaseUrl.replace(/\/$/, '')
  const endpoint = input.collectorEndpoint.replace(/\/$/, '')
  const argument = `endpoint=${encodeURIComponent(endpoint)}&token=${encodeURIComponent(input.token)}`

  const domainSummary =
    domains.length > 2
      ? `${domains.slice(0, 2).join(', ')} +${domains.length - 2}`
      : domains.join(', ')

  const lines: string[] = [
    `#!name=NSSurge Collector - ${domainSummary}`,
    '#!desc=Capture text request/response bodies to local Next.js + Prisma collector. Binary bodies are skipped.',
    '',
    '[Script]',
  ]

  for (const domain of domains) {
    const slug = slugify(domain)
    const pattern = buildUrlPattern(domain, input.includeSubdomains, protocol)
    const requestName = `nssurge-${slug}-request`
    const responseName = `nssurge-${slug}-response`
    const common = `requires-body=true, binary-body-mode=true, max-size=${maxSize}, timeout=${timeout}`

    lines.push(
      `${requestName} = type=http-request, pattern=${pattern}, ${common}, script-path=${scriptBase}/log-request.js, argument=${argument}`,
      `${responseName} = type=http-response, pattern=${pattern}, ${common}, script-path=${scriptBase}/log-response.js, argument=${argument}`,
    )
  }

  if (enableMitm) {
    lines.push('', '[MITM]', `hostname = ${buildMitmHostname(domains, input.includeSubdomains)}`)
  }

  return `${lines.join('\n')}\n`
}

export { parseDomains }
