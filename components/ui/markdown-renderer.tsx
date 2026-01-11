"use client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
      components={{
        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
        strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
        em: ({ node, ...props }) => <em className="italic" {...props} />,
        a: ({ node, ...props }) => (
          <a
            className="text-blue-500 dark:text-blue-400 underline hover:no-underline"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),
        code: ({ node, inline, ...props }) =>
          inline ? (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
          ) : (
            <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-2">
              <code className="text-sm font-mono" {...props} />
            </pre>
          ),
        ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
        li: ({ node, ...props }) => <li className="text-sm" {...props} />,
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-4 border-muted-foreground pl-3 italic text-muted-foreground mb-2"
            {...props}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
