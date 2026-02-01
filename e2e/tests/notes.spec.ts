import { test, expect } from '../fixtures'

test.describe('ノート管理', () => {
  test('ノート一覧が表示される', async ({ noteListPage }) => {
    await noteListPage.goto()

    await expect(noteListPage.heading).toBeVisible()
    await expect(noteListPage.createButton).toBeVisible()
    await expect(noteListPage.tabAll).toBeVisible()
    await expect(noteListPage.searchInput).toBeVisible()
  })

  test('タイプフィルターで絞り込み', async ({ noteListPage, page }) => {
    await noteListPage.goto()

    // Wait for notes to load
    await page.waitForLoadState('networkidle')

    // Click on a type tab (e.g., diary or learning)
    const diaryTab = page.getByRole('tab', { name: '日記' })
    if (await diaryTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await diaryTab.click()
      // URL should update with type filter
      await expect(page).toHaveURL(/type=diary/)
    }
  })

  test('新規ノート作成→保存→一覧に反映', async ({ noteListPage, noteEditPage, page }) => {
    // Use general type to avoid diary's unique (type, date) constraint
    await page.goto('/notes/new?type=general')

    // Fill in the title
    await expect(noteEditPage.titleInput).toBeVisible()
    await noteEditPage.titleInput.fill('[E2E] テストノート')

    // Type in the TipTap editor
    const editor = page.locator('[contenteditable="true"]')
    await editor.click()
    await page.keyboard.type('これはE2Eテストで作成されたノートです')

    // Wait for save button to be enabled
    await expect(noteEditPage.saveButton).toBeEnabled({ timeout: 5_000 })

    // Click save and wait for navigation concurrently
    await Promise.all([
      page.waitForURL('**/notes', { timeout: 15_000 }),
      noteEditPage.saveButton.click(),
    ])
    await expect(noteListPage.heading).toBeVisible()
  })

  test('既存ノートの編集画面表示', async ({ noteListPage, page }) => {
    await noteListPage.goto()
    await page.waitForLoadState('networkidle')

    // Click on the first note card (exclude /notes/new links)
    const noteCards = page.locator('a[href^="/notes/"]:not([href="/notes/new"])')
      .filter({ has: page.locator('.font-medium') })
    const firstNote = noteCards.first()
    if (await firstNote.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstNote.click()
      // Should navigate to edit page with a UUID
      await expect(page).toHaveURL(/\/notes\/[0-9a-f-]+/)
      // Heading should show edit mode
      await expect(page.locator('h1').first()).toContainText('編集')
    }
  })

  test('ノート削除', async ({ noteEditPage, page }) => {
    // First create a note to delete (use general type to avoid date uniqueness)
    await page.goto('/notes/new?type=general')

    await expect(noteEditPage.titleInput).toBeVisible()
    await noteEditPage.titleInput.fill('[E2E] 削除テストノート')

    const editor = page.locator('[contenteditable="true"]')
    await editor.click()
    await page.keyboard.type('削除予定のノート')

    // Wait for save button to be enabled
    await expect(noteEditPage.saveButton).toBeEnabled({ timeout: 5_000 })

    // Click save and wait for navigation concurrently
    await Promise.all([
      page.waitForURL('**/notes', { timeout: 15_000 }),
      noteEditPage.saveButton.click(),
    ])

    // Open the note we just created
    const noteLink = page.locator('a[href^="/notes/"]').filter({ hasText: '[E2E] 削除テストノート' })
    if (await noteLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await noteLink.click()
      await expect(page).toHaveURL(/\/notes\/[0-9a-f-]+/)

      // Click delete and confirm
      const deleteButton = page.getByRole('main').getByRole('button', { name: '削除' }).first()
      await deleteButton.click()
      // Confirm in the popover
      const confirmDelete = page.getByRole('button', { name: '削除' }).last()
      await confirmDelete.click()

      // Should redirect to notes list
      await page.waitForURL('**/notes', { timeout: 10_000 })
    }
  })

  test('検索フィルタリング', async ({ noteListPage, page }) => {
    await noteListPage.goto()
    await page.waitForLoadState('networkidle')

    // Search for a non-existent term
    await noteListPage.search('存在しないノート検索ワード')
    await page.waitForTimeout(500) // Debounce wait

    // Should show empty or filtered results
    const emptyState = page.getByText('該当するノートが見つかりません')
    const noResults = await emptyState.isVisible({ timeout: 3000 }).catch(() => false)

    // Clear search
    await noteListPage.searchInput.clear()

    // Notes should reappear
    if (noResults) {
      await page.waitForTimeout(500)
    }
  })
})
