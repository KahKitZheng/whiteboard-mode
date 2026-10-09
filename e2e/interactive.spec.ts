import type { Page } from '@playwright/test'
import { expect, test } from './test'

function markers(page: Page) {
  return page.locator('.interactive-stage .boardbook-marker')
}

function pageActions(page: Page) {
  return page.getByRole('group', { name: 'Pagina' })
}

function popupActions(page: Page) {
  return page.getByRole('group', { name: 'Pop-up' })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/interactive/reis-rond-de-wereld')
  await expect(markers(page)).toHaveCount(3)
})

test('a marker shows a card on hover and its content on press', async ({ page }) => {
  await markers(page).first().hover()
  await expect(page.locator('.interactive-card')).toContainText('Noord-Amerika')

  await markers(page).first().click()
  const dialog = page.getByRole('dialog', { name: 'Noord-Amerika' })
  await expect(dialog).toContainText('Grand Canyon')
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
})

test('a pop-up added in the editor is on the page after saving', async ({ page }) => {
  await pageActions(page).getByRole('button', { name: 'Bewerken' }).click()
  await page.getByRole('button', { name: 'Pop-up toevoegen' }).click()
  await expect(page.getByRole('heading', { name: 'Pop-up 4' })).toBeVisible()

  await page.getByRole('textbox', { name: 'Titel' }).fill('Afrika')
  await page.locator('.tiptap').fill('Het op een na grootste continent.')
  await popupActions(page).getByRole('button', { name: 'Opslaan' }).click()
  await expect(popupActions(page).getByRole('button', { name: 'Opslaan' })).toBeDisabled()

  await pageActions(page).getByRole('button', { name: 'Opslaan' }).click()
  await expect(markers(page)).toHaveCount(4)
  await markers(page).nth(3).click()
  await expect(page.getByRole('dialog', { name: 'Afrika' })).toContainText('Het op een na grootste continent.')
})

test('cancelling the page drops every edit', async ({ page }) => {
  await pageActions(page).getByRole('button', { name: 'Bewerken' }).click()
  await page.getByRole('button', { name: 'Pop-up toevoegen' }).click()
  await expect(markers(page)).toHaveCount(4)

  await pageActions(page).getByRole('button', { name: 'Annuleren' }).click()
  await expect(markers(page)).toHaveCount(3)
})

test('a pop-up is dragged to where it is dropped', async ({ page }) => {
  await pageActions(page).getByRole('button', { name: 'Bewerken' }).click()
  const marker = markers(page).first()
  const before = (await marker.boundingBox())!
  const stage = (await page.locator('.interactive-stage').boundingBox())!

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(stage.x + stage.width * 0.5, stage.y + stage.height * 0.5, { steps: 8 })
  await page.mouse.up()

  const after = (await marker.boundingBox())!
  expect(after.x + after.width / 2).toBeCloseTo(stage.x + stage.width * 0.5, 0)
  expect(after.y + after.height / 2).toBeCloseTo(stage.y + stage.height * 0.5, 0)
})
