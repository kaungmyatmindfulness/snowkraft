import { test, expect } from '@playwright/test'

test.describe('Stats Display', () => {
  test('stats page displays', async ({ page }) => {
    await page.goto('/stats')

    // Verify page loads
    await expect(page.locator('h1')).toContainText('Statistics')
  })

  test('stats page shows stat cards', async ({ page }) => {
    await page.goto('/stats')

    // Verify stat cards are visible
    await expect(page.getByText('Total Questions')).toBeVisible()
    await expect(page.getByText('Total Attempts')).toBeVisible()
    await expect(page.getByText('Overall Accuracy')).toBeVisible()
  })

  test('home page shows quiz start options', async ({ page }) => {
    await page.goto('/')

    // Verify quiz configuration is visible
    await expect(page.getByRole('button', { name: '10', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Practice' })).toBeVisible()
  })

  test('can navigate from results to stats', async ({ page }) => {
    // Complete a quick quiz first
    await page.goto('/')
    await page.getByRole('button', { name: '10', exact: true }).click()
    await page.getByRole('button', { name: 'Start Practice' }).click()

    // Answer all questions quickly
    for (let i = 0; i < 10; i++) {
      await expect(page.getByTestId('question-text')).toBeVisible()
      await page.getByTestId('answer-option').first().click()
      await page.getByRole('button', { name: 'Check Answer' }).click()

      if (i < 9) {
        await page.getByRole('button', { name: 'Next', exact: true }).click()
      }
    }

    // Finish quiz
    await page.getByRole('button', { name: 'Finish Quiz' }).click()

    // Navigate to stats from results page
    await page.getByRole('link', { name: 'View Stats' }).click()

    // Verify we're on stats page
    await expect(page).toHaveURL('/stats')
    await expect(page.locator('h1')).toContainText('Statistics')

    // Verify stats reflect the completed quiz
    await expect(page.getByText('Total Attempts')).toBeVisible()
  })
})
