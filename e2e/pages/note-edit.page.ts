import type { Page, Locator } from '@playwright/test'

export class NoteEditPage {
  readonly page: Page
  readonly heading: Locator
  readonly saveButton: Locator
  readonly deleteButton: Locator
  readonly archiveButton: Locator
  readonly closeButton: Locator
  readonly editor: Locator
  readonly titleInput: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.locator('h1').first()
    // Scope save button to the header area (not the floating memo button)
    this.saveButton = page.getByRole('main').getByRole('button', { name: '保存' })
    this.deleteButton = page.getByRole('main').getByRole('button', { name: '削除' })
    this.archiveButton = page.getByRole('button', { name: 'アーカイブ' })
    this.closeButton = page.getByRole('button', { name: '閉じる' })
    this.editor = page.locator('[contenteditable="true"]')
    this.titleInput = page.getByPlaceholder('タイトルを入力')
  }

  async goto(id?: string) {
    if (id) {
      await this.page.goto(`/notes/${id}`)
    } else {
      await this.page.goto('/notes/new')
    }
  }

  async gotoNew(type?: string) {
    const url = type ? `/notes/new?type=${type}` : '/notes/new'
    await this.page.goto(url)
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title)
  }

  async fillContent(content: string) {
    await this.editor.click()
    await this.page.keyboard.type(content)
  }

  async save() {
    await this.saveButton.click()
  }

  async confirmDelete() {
    await this.deleteButton.click()
    // ConfirmPopover shows a confirmation button
    await this.page.getByRole('button', { name: '削除' }).nth(1).click()
  }
}
