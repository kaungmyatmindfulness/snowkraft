'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Highlight, themes } from 'prism-react-renderer'

interface MarkdownRendererProps {
  content: string
}

// Generate a slug/ID from heading text (matches markdown anchor link format)
function generateHeadingId(children: React.ReactNode): string {
  let text = ''
  if (typeof children === 'string') {
    text = children
  } else if (Array.isArray(children)) {
    text = children.map((child) => (typeof child === 'string' ? child : '')).join('')
  }

  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .trim()
}

export function MarkdownRenderer({ content }: MarkdownRendererProps): React.JSX.Element {
  // Handle anchor link clicks - scroll to element instead of navigation
  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string | undefined
  ): void => {
    if (href?.startsWith('#') === true) {
      e.preventDefault()
      const targetId = href.slice(1)
      const targetElement = document.getElementById(targetId)
      if (targetElement !== null) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        // Update URL hash without triggering navigation
        window.history.pushState(null, '', href)
      }
    }
  }

  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => {
            const id = generateHeadingId(children)
            return (
              <h1
                id={id}
                className="mb-6 border-b border-gray-200 pb-3 text-3xl font-bold text-gray-900 dark:border-slate-700 dark:text-gray-100"
              >
                {children}
              </h1>
            )
          },
          h2: ({ children }) => {
            const id = generateHeadingId(children)
            return (
              <h2
                id={id}
                className="mt-8 mb-4 border-b border-gray-200 pb-2 text-2xl font-semibold text-gray-800 dark:border-slate-700 dark:text-gray-200"
              >
                {children}
              </h2>
            )
          },
          h3: ({ children }) => {
            const id = generateHeadingId(children)
            return (
              <h3
                id={id}
                className="mt-6 mb-3 text-xl font-medium text-gray-800 dark:text-gray-200"
              >
                {children}
              </h3>
            )
          },
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className ?? '')
            const language = match?.[1] ?? null
            const codeString = typeof children === 'string' ? children.replace(/\n$/, '') : ''

            // Check if this is a code block (has language) or inline code
            if (language !== null) {
              const showLineNumbers = codeString.split('\n').length > 3

              return (
                <Highlight theme={themes.oneDark} code={codeString} language={language}>
                  {({
                    className: highlightClassName,
                    style,
                    tokens,
                    getLineProps,
                    getTokenProps,
                  }) => (
                    <div
                      className={`${highlightClassName} my-4 overflow-x-auto rounded-lg text-sm`}
                      style={{
                        ...style,
                        margin: 0,
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        padding: '1rem',
                      }}
                    >
                      <pre style={{ margin: 0, background: 'transparent' }}>
                        {tokens.map((line, i) => {
                          const lineProps = getLineProps({ line })
                          return (
                            <div key={i} {...lineProps}>
                              {showLineNumbers && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: '2em',
                                    userSelect: 'none',
                                    opacity: 0.5,
                                    textAlign: 'right',
                                    marginRight: '1em',
                                  }}
                                >
                                  {i + 1}
                                </span>
                              )}
                              {line.map((token, key) => (
                                <span key={key} {...getTokenProps({ token })} />
                              ))}
                            </div>
                          )
                        })}
                      </pre>
                    </div>
                  )}
                </Highlight>
              )
            }

            // Inline code
            return (
              <code className="rounded-sm bg-sky-100 px-1.5 py-0.5 font-mono text-sm text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                {children}
              </code>
            )
          },
          pre: ({ children }) => {
            // If children is already a SyntaxHighlighter (code block), return as-is
            // Otherwise wrap in pre for plain code blocks
            return <>{children}</>
          },
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="min-w-full rounded-lg border border-gray-200 dark:border-slate-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 dark:bg-slate-800">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-gray-200 px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:border-slate-700 dark:text-gray-100">
              {children}
            </th>
          ),
          tr: ({ children }) => (
            <tr className="even:bg-gray-50 dark:even:bg-slate-800/50">{children}</tr>
          ),
          td: ({ children }) => (
            <td className="border-b border-gray-200 px-4 py-2 text-sm text-gray-700 dark:border-slate-700 dark:text-gray-300">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-4 border-sky-500 bg-sky-50 py-2 pl-4 text-gray-700 italic dark:border-cyan-500 dark:bg-cyan-900/20 dark:text-gray-300">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="my-4 list-inside list-disc space-y-2 text-gray-700 dark:text-gray-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 list-inside list-decimal space-y-2 text-gray-700 dark:text-gray-300">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          p: ({ children }) => (
            <p className="my-3 leading-relaxed text-gray-700 dark:text-gray-300">{children}</p>
          ),
          a: ({ href, children }) => {
            const isExternalLink =
              href !== undefined && (href.startsWith('http://') || href.startsWith('https://'))

            return (
              <a
                href={href}
                className="text-sky-600 hover:underline dark:text-sky-400"
                onClick={(e) => {
                  handleAnchorClick(e, href)
                }}
                {...(isExternalLink ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
