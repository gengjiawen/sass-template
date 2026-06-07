import { describe, expect, it } from 'vitest'
import { generateSurgeModule, parseDomains, parseDomainHost } from './module'

describe('NSSurge module helpers', () => {
  it('normalizes domain input from URLs, ports, paths, and wildcard hosts', () => {
    expect(parseDomainHost('https://example.com:443/path?q=1')).toBe('example.com')
    expect(parseDomainHost('http://example.com:8080/path')).toBe('example.com:8080')
    expect(parseDomainHost('*.api.example.com/path')).toBe('*.api.example.com')
    expect(parseDomains(' https://one.example/path, two.example\n*.three.example ')).toEqual([
      'one.example',
      'two.example',
      '*.three.example',
    ])
  })

  it('generates request and response scripts with encoded collector arguments', () => {
    const moduleText = generateSurgeModule({
      domainsInput: '',
      domains: ['https://example.com/path', 'api.example.com'],
      includeSubdomains: true,
      collectorEndpoint: 'http://127.0.0.1:3000/api/nssurge/',
      token: 'tok en&?',
      scriptBaseUrl: 'http://127.0.0.1:3000/nssurge/',
      maxSize: 2048,
      timeoutSeconds: 3,
      enableMitm: true,
      protocol: 'both',
    })

    expect(moduleText).toContain('#!name=NSSurge Collector - example.com, api.example.com')
    expect(moduleText).toContain('[Script]')
    expect(moduleText).toContain(
      'pattern=^(?:https?|http):\\/\\/(?:[a-z0-9-]+\\.)*example\\.com\\/',
    )
    expect(moduleText).toContain('max-size=2048, timeout=3')
    expect(moduleText).toContain('script-path=http://127.0.0.1:3000/nssurge/log-request.js')
    expect(moduleText).toContain(
      'argument=endpoint=http%3A%2F%2F127.0.0.1%3A3000%2Fapi%2Fnssurge&token=tok%20en%26%3F',
    )
    expect(moduleText).toContain(
      'hostname = %APPEND% example.com, *.example.com, api.example.com, *.api.example.com',
    )
    expect(moduleText.endsWith('\n')).toBe(true)
  })

  it('requires at least one domain', () => {
    expect(() =>
      generateSurgeModule({
        domainsInput: ' , \n ',
        domains: [],
        includeSubdomains: false,
        collectorEndpoint: 'http://127.0.0.1:3000/api/nssurge',
        token: '',
        scriptBaseUrl: 'http://127.0.0.1:3000/nssurge',
      }),
    ).toThrow('At least one domain is required')
  })
})
