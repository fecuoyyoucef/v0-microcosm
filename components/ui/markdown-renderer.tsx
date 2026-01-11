"use client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={`text-sm leading-relaxed ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,

          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-500 underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),

          code: ({ inline, children }) =>
            inline ? (
              <code className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-sm font-mono">{children}</code>
            ) : (
              <pre className="bg-gray-900 text-white p-3 rounded-lg overflow-x-auto mb-2">
                <code className="text-sm font-mono">{children}</code>
              </pre>
            ),

          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-sm">{children}</li>,

          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-400 pl-3 italic text-gray-600 dark:text-gray-400 mb-2">
              {children}
            </blockquote>
          ),

          h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,

          hr: () => <hr className="my-3 border-gray-300 dark:border-gray-600" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
