import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import type { Components } from 'react-markdown'

interface MarkdownContentProps {
  content: string
}

const components: Components = {
  p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-1.5 ml-4 list-disc last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-1.5 ml-4 list-decimal last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className="block my-1.5 rounded bg-muted-foreground/10 px-2 py-1.5 text-xs overflow-x-auto">
          {children}
        </code>
      )
    }
    return (
      <code className="rounded bg-muted-foreground/10 px-1 py-0.5 text-xs">{children}</code>
    )
  },
  pre: ({ children }) => <pre className="my-1.5">{children}</pre>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => <p className="mb-1 font-bold">{children}</p>,
  h2: ({ children }) => <p className="mb-1 font-bold">{children}</p>,
  h3: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="my-1.5 border-l-2 border-muted-foreground/30 pl-2 text-muted-foreground">
      {children}
    </blockquote>
  ),
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
      {content}
    </ReactMarkdown>
  )
}
