import { test, expect } from '@playwright/test'

test.describe('Practice Quiz Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/')
    // Wait for page to be ready
    await expect(page.locator('h1')).toContainText('SnowPro')
  })

  test('can start practice quiz with 10 questions', async ({ page }) => {
    // Select 10 questions (use exact: true to avoid matching 100)
    await page.getByRole('button', { name: '10', exact: true }).click()

    // Start practice quiz
    await page.getByRole('button', { name: 'Start Practice' }).click()

    // Wait for quiz page to load
    await expect(page).toHaveURL(/\/quiz\/[a-f0-9-]+/)

    // Verify question is displayed
    await expect(page.getByTestId('question-text')).toBeVisible()

    // Verify progress shows 1/10
    await expect(page.getByTestId('quiz-progress')).toContainText('1')
    await expect(page.getByTestId('quiz-progress')).toContainText('10')
  })

  test('can answer a question and see feedback', async ({ page }) => {
    // Start quiz
    await page.getByRole('button', { name: '10', exact: true }).click()
    await page.getByRole('button', { name: 'Start Practice' }).click()
    await expect(page).toHaveURL(/\/quiz\/[a-f0-9-]+/)

    // Wait for question to load
    await expect(page.getByTestId('question-text')).toBeVisible()

    // Select first answer option
    await page.getByTestId('answer-option').first().click()

    // Submit answer
    await page.getByRole('button', { name: 'Check Answer' }).click()

    // Verify feedback is shown
    await expect(page.getByTestId('feedback')).toBeVisible()
  })

  test('can navigate to next question after answering', async ({ page }) => {
    // Start quiz
    await page.getByRole('button', { name: '10', exact: true }).click()
    await page.getByRole('button', { name: 'Start Practice' }).click()
    await expect(page).toHaveURL(/\/quiz\/[a-f0-9-]+/)

    // Answer first question
    await page.getByTestId('answer-option').first().click()
    await page.getByRole('button', { name: 'Check Answer' }).click()

    // Navigate to next question (use exact: true to avoid Next.js dev tools button)
    await page.getByRole('button', { name: 'Next', exact: true }).click()

    // Verify progress updated
    await expect(page.getByTestId('quiz-progress')).toContainText('2')
  })

  test('keyboard navigation works', async ({ page }) => {
    // Start quiz
    await page.getByRole('button', { name: '10', exact: true }).click()
    await page.getByRole('button', { name: 'Start Practice' }).click()
    await expect(page).toHaveURL(/\/quiz\/[a-f0-9-]+/)

    // Wait for question to load
    await expect(page.getByTestId('question-text')).toBeVisible()

    // Use keyboard to select answer (press 1)
    await page.keyboard.press('1')

    // Submit with Space
    await page.keyboard.press('Space')

    // Verify feedback shown
    await expect(page.getByTestId('feedback')).toBeVisible()

    // Navigate with Space again
    await page.keyboard.press('Space')

    // Should be on question 2
    await expect(page.getByTestId('quiz-progress')).toContainText('2')
  })

  test('complete practice quiz and view results', async ({ page }) => {
    // Start quiz with 10 questions
    await page.getByRole('button', { name: '10', exact: true }).click()
    await page.getByRole('button', { name: 'Start Practice' }).click()
    await expect(page).toHaveURL(/\/quiz\/[a-f0-9-]+/)

    // Answer all 10 questions
    for (let i = 0; i < 10; i++) {
      await expect(page.getByTestId('question-text')).toBeVisible()

      // Select first answer
      await page.getByTestId('answer-option').first().click()

      // Submit answer
      await page.getByRole('button', { name: 'Check Answer' }).click()

      // Verify feedback shown
      await expect(page.getByTestId('feedback')).toBeVisible()

      if (i < 9) {
        // Navigate to next question (use exact: true)
        await page.getByRole('button', { name: 'Next', exact: true }).click()
      }
    }

    // Finish quiz
    await page.getByRole('button', { name: 'Finish Quiz' }).click()

    // Verify results page
    await expect(page).toHaveURL(/\/quiz\/[a-f0-9-]+\/results/)
    await expect(page.locator('h1')).toContainText('Quiz Results')

    // Verify score is displayed
    await expect(page.getByTestId('score-percentage')).toBeVisible()
  })
})
