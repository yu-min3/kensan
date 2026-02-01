import { chromium, type FullConfig } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const AUTH_DIR = path.join(import.meta.dirname, '.auth')
const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'user.json')

async function globalSetup(_config: FullConfig) {
  fs.mkdirSync(AUTH_DIR, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:5173/login')
  await page.locator('#email').fill('test@kensan.dev')
  await page.locator('#password').fill('password123')
  await page.getByRole('button', { name: 'ログイン' }).click()

  // Wait for redirect to home page after login
  await page.waitForURL('http://localhost:5173/')

  await page.context().storageState({ path: STORAGE_STATE_PATH })
  await browser.close()
}

export default globalSetup
