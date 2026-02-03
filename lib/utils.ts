import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins)}:${secs.toString().padStart(2, '0')}`
}

export function formatPercentage(value: number): string {
  return `${String(Math.round(value * 100))}%`
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]
    shuffled[i] = shuffled[j] as T
    shuffled[j] = temp as T
  }
  return shuffled
}

export function getPassingStatus(correctAnswers: number, totalQuestions: number): boolean {
  return correctAnswers / totalQuestions >= 0.75
}

// OS-aware keyboard shortcut utilities
export function isMacOS(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
}

export function getModifierKey(): { key: string; symbol: string } {
  const isMac = isMacOS()
  return {
    key: isMac ? 'Cmd' : 'Alt',
    symbol: isMac ? '⌘' : 'Alt+',
  }
}

export function isModifierKeyPressed(event: KeyboardEvent): boolean {
  return isMacOS() ? event.metaKey : event.altKey
}

/**
 * Check if selected answers match the correct answers exactly
 * Uses Set comparison for multi-answer support
 */
export function isAnswerCorrect(selectedAnswerIds: number[], correctAnswerIds: number[]): boolean {
  const selectedSet = new Set(selectedAnswerIds)
  const correctSet = new Set(correctAnswerIds)
  return selectedSet.size === correctSet.size && [...selectedSet].every((id) => correctSet.has(id))
}
