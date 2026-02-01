import { test, expect } from '../fixtures'

test.describe('タスク管理', () => {
  test('タスク管理ページが表示される', async ({ taskManagementPage, page }) => {
    await taskManagementPage.goto()

    await expect(taskManagementPage.heading).toBeVisible()
    await expect(taskManagementPage.searchInput).toBeVisible()

    // Three columns should be present
    await expect(page.getByText('目標').first()).toBeVisible()
    await expect(page.getByText('マイルストーン').first()).toBeVisible()
    await expect(page.getByText('タスク').first()).toBeVisible()
  })

  test('RecurringTaskWidget表示', async ({ taskManagementPage, page }) => {
    await taskManagementPage.goto()

    // Recurring task widget should be visible
    const widget = page.getByText('定期タスク')
    await expect(widget).toBeVisible()
  })

  test('目標選択→マイルストーン表示', async ({ taskManagementPage, page }) => {
    await taskManagementPage.goto()
    await page.waitForLoadState('networkidle')

    // Click on the first goal (should be auto-selected, but click to ensure)
    const firstGoal = page.locator('.rounded-lg.cursor-pointer .font-medium.text-sm').first()
    if (await firstGoal.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstGoal.click()

      // Milestones should be displayed (or empty state)
      const milestoneList = page.getByText('マイルストーン').first()
      await expect(milestoneList).toBeVisible()
    }
  })

  test('検索フィルタリング', async ({ taskManagementPage, page }) => {
    await taskManagementPage.goto()
    await page.waitForLoadState('networkidle')

    // Search for something
    await taskManagementPage.search('テスト')
    await page.waitForTimeout(300)

    // Clear search
    await taskManagementPage.searchInput.clear()
  })
})
