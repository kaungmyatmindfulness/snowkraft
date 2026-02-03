'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { startQuiz, EXAM_QUESTION_SETS, type ExamQuestionSet } from '@/lib/quiz/client'
import { DOMAINS, type DomainId } from '@/types'
import { Button, Card, CardHeader, CardTitle, CardContent, Icons } from '@/components/ui'
import { cn, getModifierKey, isModifierKeyPressed } from '@/lib/utils'

const QUESTION_COUNT_OPTIONS = [10, 25, 50, 100, 0] as const // 0 = No limit
const QUESTION_COUNT_KEYS: Record<string, number> = {
  '1': 10,
  '2': 25,
  '3': 50,
  '4': 100,
  '5': 0, // No limit
}
const KEY_FOR_COUNT: Record<number, string> = {
  10: '1',
  25: '2',
  50: '3',
  100: '4',
  0: '5', // No limit
}
const COUNT_LABELS: Record<number, string> = {
  10: '10',
  25: '25',
  50: '50',
  100: '100',
  0: 'All', // No limit display label
}

interface QuizConfigFormProps {
  domains: { domain: string; count: number }[]
  totalQuestions: number
}

export function QuizConfigForm({ totalQuestions }: QuizConfigFormProps): React.JSX.Element {
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)
  const [questionCount, setQuestionCount] = useState(10)
  const [selectedDomains, setSelectedDomains] = useState<DomainId[]>([])
  const [modifierSymbol, setModifierSymbol] = useState('Alt+')
  const [selectedExamSet, setSelectedExamSet] = useState<ExamQuestionSet>(1)
  const [selectedPracticeSet, setSelectedPracticeSet] = useState<ExamQuestionSet | null>(null)

  // Detect OS on mount for modifier key display
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: need to detect OS on client
    setModifierSymbol(getModifierKey().symbol)
  }, [])

  const handleStartPractice = useCallback((): void => {
    setIsStarting(true)
    const result = startQuiz({
      type: 'practice',
      questionCount,
      ...(selectedDomains.length > 0 && { domains: selectedDomains.map(String) }),
      ...(selectedPracticeSet !== null && { practiceQuestionSet: selectedPracticeSet }),
    })
    router.push(`/quiz/${result.sessionId}`)
  }, [router, questionCount, selectedDomains, selectedPracticeSet])

  const handleStartExam = useCallback((): void => {
    setIsStarting(true)
    const result = startQuiz({
      type: 'exam',
      questionCount: 100,
      examQuestionSet: selectedExamSet,
    })
    router.push(`/quiz/${result.sessionId}`)
  }, [router, selectedExamSet])

  const toggleDomain = (domain: DomainId): void => {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    )
  }

  // Calculate max questions based on selection (0 = "All" means use total)
  const effectiveQuestionCount = questionCount === 0 ? totalQuestions : questionCount
  const maxQuestions = Math.min(effectiveQuestionCount, totalQuestions)

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent): void => {
      // Don't handle if typing in an input or textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Don't interfere if already starting a quiz
      if (isStarting) {
        return
      }

      // Cmd+1-6 (Mac) or Alt+1-6 (Windows/Linux): Toggle domains
      if (isModifierKeyPressed(e)) {
        const domainNum = parseInt(e.key, 10)
        if (domainNum >= 1 && domainNum <= 6) {
          e.preventDefault()
          toggleDomain(domainNum as DomainId)
          return
        }
      }

      // Don't process other shortcuts if modifier keys are held
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return
      }

      // 1-4: Select question count
      const questionCountForKey = QUESTION_COUNT_KEYS[e.key]
      if (questionCountForKey !== undefined) {
        if (questionCountForKey <= totalQuestions) {
          e.preventDefault()
          setQuestionCount(questionCountForKey)
        }
        return
      }

      // P: Start Practice quiz
      if (e.key.toLowerCase() === 'p') {
        if (maxQuestions > 0) {
          e.preventDefault()
          handleStartPractice()
        }
        return
      }

      // E: Start Exam Simulation
      if (e.key.toLowerCase() === 'e') {
        if (totalQuestions >= 100) {
          e.preventDefault()
          handleStartExam()
        }
        return
      }
    },
    [isStarting, totalQuestions, maxQuestions, handleStartPractice, handleStartExam]
  )

  // Set up keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return (
    <div className="animate-slide-up stagger-2 grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Practice Quiz Card */}
      <Card variant="elevated" className="relative overflow-hidden dark:bg-slate-800">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 size-32 rounded-full bg-linear-to-br from-sky-100 to-cyan-100 opacity-50 dark:from-sky-900/30 dark:to-cyan-900/30" />
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-100 p-2 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400">
              <Icons.BookOpen size={24} />
            </div>
            <div>
              <CardTitle className="text-xl dark:text-gray-100">Practice Quiz</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">Immediate feedback mode</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-gray-600 dark:text-gray-300">
            Learn at your own pace with instant explanations after each question.
          </p>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Number of Questions
            </label>
            <div className="flex gap-2">
              {QUESTION_COUNT_OPTIONS.map((count) => {
                // "All" (0) is never disabled; other options disabled if exceeding total
                const isDisabled = count !== 0 && count > totalQuestions
                return (
                  <button
                    key={count}
                    onClick={() => {
                      setQuestionCount(count)
                    }}
                    disabled={isDisabled}
                    aria-pressed={questionCount === count}
                    className={cn(
                      'flex flex-1 flex-col items-center gap-1 rounded-lg px-4 py-2.5 font-medium transition-[background-color,color,transform] duration-200',
                      questionCount === count
                        ? 'scale-[1.02] bg-sky-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600',
                      isDisabled && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <span>{COUNT_LABELS[count]}</span>
                    <kbd
                      className={cn(
                        'flex h-5 min-w-[20px] items-center justify-center rounded-sm border px-1 font-mono text-xs',
                        questionCount === count
                          ? 'border-sky-400/50 bg-sky-400/50 text-white/90'
                          : 'border-gray-300 bg-gray-200 text-gray-500 dark:border-slate-500 dark:bg-slate-600 dark:text-gray-400'
                      )}
                    >
                      {KEY_FOR_COUNT[count]}
                    </kbd>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Filter by Domain
              <span className="ml-1 font-normal text-gray-400 dark:text-gray-500">(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(DOMAINS) as [string, string][]).map(([id, name]) => {
                const isSelected = selectedDomains.includes(Number(id) as DomainId)
                return (
                  <button
                    key={id}
                    onClick={() => {
                      toggleDomain(Number(id) as DomainId)
                    }}
                    title={name}
                    aria-pressed={isSelected}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-200',
                      isSelected
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                    )}
                  >
                    <kbd
                      className={cn(
                        'flex h-5 min-w-[40px] shrink-0 items-center justify-center rounded-sm border px-1 font-mono text-xs',
                        isSelected
                          ? 'border-sky-400/50 bg-sky-400/50 text-white/90'
                          : 'border-gray-300 bg-gray-200 text-gray-500 dark:border-slate-500 dark:bg-slate-600 dark:text-gray-400'
                      )}
                    >
                      {modifierSymbol}
                      {id}
                    </kbd>
                    <span className="truncate">
                      <span className="font-semibold">D{id}:</span>{' '}
                      <span className="opacity-90">{name}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Filter by Question Set
              <span className="ml-1 font-normal text-gray-400 dark:text-gray-500">(optional)</span>
            </label>
            <div className="grid grid-cols-6 gap-2">
              <button
                onClick={() => {
                  setSelectedPracticeSet(null)
                }}
                aria-pressed={selectedPracticeSet === null}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg p-2 font-medium transition-[background-color,color,transform] duration-200',
                  selectedPracticeSet === null
                    ? 'scale-[1.02] bg-sky-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600'
                )}
              >
                <span className="text-xs font-semibold">All</span>
                <span className="text-[10px] opacity-80">1-{totalQuestions}</span>
              </button>
              {EXAM_QUESTION_SETS.map(({ set, range }) => (
                <button
                  key={set}
                  onClick={() => {
                    setSelectedPracticeSet(set)
                  }}
                  aria-pressed={selectedPracticeSet === set}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-lg p-2 font-medium transition-[background-color,color,transform] duration-200',
                    selectedPracticeSet === set
                      ? 'scale-[1.02] bg-sky-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600'
                  )}
                >
                  <span className="text-xs font-semibold">Set {set}</span>
                  <span className="text-[10px] opacity-80">{range}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleStartPractice}
            isLoading={isStarting}
            disabled={maxQuestions === 0}
            className="w-full"
            size="lg"
          >
            <Icons.Play size={18} />
            Start Practice
            <kbd className="ml-2 flex h-6 min-w-[24px] items-center justify-center rounded-sm border border-sky-400/50 bg-sky-400/50 px-1.5 font-mono text-xs text-white/90">
              P
            </kbd>
          </Button>
        </CardContent>
      </Card>

      {/* Exam Simulation Card */}
      <Card variant="elevated" className="relative overflow-hidden dark:bg-slate-800">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 size-32 rounded-full bg-linear-to-br from-amber-100 to-orange-100 opacity-50 dark:from-amber-900/30 dark:to-orange-900/30" />
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
              <Icons.Timer size={24} />
            </div>
            <div>
              <CardTitle className="text-xl dark:text-gray-100">Exam Simulation</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">Real exam conditions</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-gray-600 dark:text-gray-300">
            Test yourself under real exam conditions with timed questions and deferred feedback.
          </p>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-100 p-1.5 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                <Icons.AlertCircle size={18} />
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-amber-800 dark:text-amber-300">
                  Exam Conditions
                </h3>
                <ul className="space-y-1.5 text-sm text-amber-700 dark:text-amber-400">
                  <li className="flex items-center gap-2">
                    <Icons.Hash size={14} />
                    100 multiple choice questions
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.Clock size={14} />
                    115 minutes time limit
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.XCircle size={14} />
                    No feedback until completion
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.Target size={14} />
                    75% required to pass
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Question Set
            </label>
            <div className="grid grid-cols-5 gap-2">
              {EXAM_QUESTION_SETS.map(({ set, range }) => (
                <button
                  key={set}
                  onClick={() => {
                    setSelectedExamSet(set)
                  }}
                  aria-pressed={selectedExamSet === set}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-lg p-2 font-medium transition-[background-color,color,transform] duration-200',
                    selectedExamSet === set
                      ? 'scale-[1.02] bg-amber-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600'
                  )}
                >
                  <span className="text-xs font-semibold">Set {set}</span>
                  <span className="text-[10px] opacity-80">{range}</span>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleStartExam}
            isLoading={isStarting}
            disabled={totalQuestions < 100}
            variant="primary"
            className="w-full bg-amber-500 hover:bg-amber-600 focus:ring-amber-500"
            size="lg"
          >
            <Icons.Zap size={18} />
            Start Exam (Set {selectedExamSet})
            <kbd className="ml-2 flex h-6 min-w-[24px] items-center justify-center rounded-sm border border-amber-400/50 bg-amber-400/50 px-1.5 font-mono text-xs text-white/90">
              E
            </kbd>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
