'use client'

import { memo, useMemo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import he from 'he'
import { cn } from '@/lib/utils'

interface ExplanationTextProps {
  text: string
  className?: string
}

/**
 * Custom components for react-markdown to style markdown elements
 * with the sky theme and dark mode support.
 */
const markdownComponents: Components = {
  // Headers
  h2: ({ children }) => (
    <h2 className="mt-4 mb-3 text-lg font-bold text-sky-900 first:mt-0 dark:text-sky-200">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-2 text-base font-semibold text-sky-800 dark:text-sky-300">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-2 mb-1 text-sm font-semibold text-sky-700 dark:text-sky-400">{children}</h4>
  ),

  // Paragraphs
  p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,

  // Lists
  ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  // Blockquotes (for Exam Tips)
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-amber-400 bg-amber-50 py-2 pr-3 pl-4 italic dark:border-amber-500 dark:bg-amber-900/20">
      {children}
    </blockquote>
  ),

  // Code blocks
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-slate-800 p-3 text-sm dark:bg-slate-900">
      {children}
    </pre>
  ),
  code: ({ children, className }) => {
    // Check if this is an inline code or a code block (className is set for code blocks like language-sql)
    const isInline = className === undefined || className === ''
    if (isInline) {
      return (
        <code className="rounded-sm bg-slate-200 px-1 py-0.5 font-mono text-sm text-slate-800 dark:bg-slate-700 dark:text-slate-200">
          {children}
        </code>
      )
    }
    // Code block (inside pre)
    return <code className="font-mono text-emerald-400">{children}</code>
  },

  // Tables
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-sky-100 dark:bg-sky-900/40">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-sky-200 dark:border-sky-800">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-sky-900 dark:text-sky-200">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-sky-800 dark:text-sky-300">{children}</td>,

  // Strong and emphasis
  strong: ({ children }) => (
    <strong className="font-semibold text-sky-900 dark:text-sky-100">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-sky-600 underline hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),

  // Horizontal rule
  hr: () => <hr className="my-4 border-sky-200 dark:border-sky-700" />,
}

export const ExplanationText = memo(function ExplanationText({
  text,
  className = '',
}: ExplanationTextProps): React.JSX.Element {
  // Decode HTML entities and convert bullet characters to markdown list syntax
  const decodedText = useMemo(() => {
    const decoded = he.decode(text)
    // Convert lines starting with • to markdown list items (- )
    return decoded.replace(/^• /gm, '- ').replace(/\n• /g, '\n- ')
  }, [text])

  return (
    <div className={cn('min-w-0 overflow-hidden', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {decodedText}
      </ReactMarkdown>
    </div>
  )
})

ExplanationText.displayName = 'ExplanationText'

/**
 * Extracts plain text from explanation, stripping markdown formatting.
 * Useful for copying to clipboard.
 */
export function getPlainExplanation(text: string): string {
  const decoded = he.decode(text)
  // Remove markdown formatting but keep the content
  return decoded
    .replace(/```\w*\n?/g, '') // Remove code block markers
    .replace(/```/g, '')
    .replace(/`/g, '') // Remove inline code markers
    .replace(/#{1,6}\s*/g, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/>\s*/g, '') // Remove blockquote markers
    .replace(/\|/g, ' ') // Replace table pipes with spaces
    .replace(/-{3,}/g, '') // Remove horizontal rules
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .trim()
}
