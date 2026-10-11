import { expect, test } from './test'

test('the interface is Dutch by default and English with ?lang=en', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Digibord' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl')

  await page.goto('/?lang=en')
  await expect(page.getByRole('button', { name: 'Whiteboard' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})
