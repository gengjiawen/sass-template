import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

async function readLocale(name: string): Promise<Record<string, string>> {
  const file = await readFile(new URL(`./${name}.json`, import.meta.url), 'utf8')
  return JSON.parse(file) as Record<string, string>
}

describe('locale dictionaries', () => {
  it('keeps all locale keys in sync', async () => {
    const en = await readLocale('en-US')
    const zh = await readLocale('zh-CN')

    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort())
  })

  it('keeps locale values non-empty strings', async () => {
    const locales = {
      'en-US': await readLocale('en-US'),
      'zh-CN': await readLocale('zh-CN'),
    }

    for (const [locale, messages] of Object.entries(locales)) {
      for (const [key, value] of Object.entries(messages)) {
        expect(value, `${locale}: ${key}`).toEqual(expect.any(String))
        expect(value.trim(), `${locale}: ${key}`).not.toBe('')
      }
    }
  })
})
