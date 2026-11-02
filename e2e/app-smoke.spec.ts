import { expect, test } from '@playwright/test'

test('home page renders and can switch languages', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Ship faster with a modern TypeScript stack' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Docs' })).toBeVisible()

  // On a cold `next dev`, on-demand route compiles can push an HMR update that drops the first click.
  const chineseOption = page.getByText('Chinese (Simplified)')
  await expect(async () => {
    await page.getByRole('button', { name: 'Language' }).click()
    await expect(chineseOption).toBeVisible({ timeout: 1_000 })
  }).toPass({ timeout: 15_000 })
  await chineseOption.click()

  await expect(page.getByRole('link', { name: '首页' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '用现代 TypeScript 技术栈更快交付' }),
  ).toBeVisible()
})

test('docs page renders generated MDX content', async ({ page }) => {
  await page.goto('/docs')

  await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible()
  await expect(page.getByText('This is the introduction page.')).toBeVisible()
})

test('NSSurge dashboard renders request and module surfaces', async ({ page }) => {
  await page.goto('/nssurge')

  await expect(page.getByRole('heading', { name: 'NSSurge Collector' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request list' })).toBeVisible()
  await expect(page.getByText('iPhone Surge cannot reach')).toBeVisible()

  await page.getByRole('button', { name: 'Generate Surge module' }).click()

  await expect(page.getByLabel('Domains (comma or newline)')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByLabel('Collector endpoint')).toHaveValue(/\/api\/nssurge$/)
  await expect(page.getByRole('button', { name: 'Generate .sgmodule' })).toBeVisible()
})
