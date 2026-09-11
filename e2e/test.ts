import { test as base, expect } from '@playwright/test'

/**
 * Every spec imports from here, never from @playwright/test. The fixture is
 * automatic: any request leaving localhost is aborted and remembered, and the
 * test fails at teardown if there were any — a leaked external image is a
 * failure with a URL in it rather than a flake.
 */
export const test = base.extend<{ leaks: string[] }>({
  leaks: [
    async ({ page }, use) => {
      const leaks: string[] = []
      await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => {
        leaks.push(route.request().url())
        return route.abort()
      })
      await use(leaks)
      expect(leaks, 'requests that left localhost').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
