'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownPreviewProps {
  children: string
  className?: string
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ children, className }) => {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <SyntaxHighlighter
                style={tomorrow}
                language={match[1]}
                PreTag="div"
                className="rounded-md"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            )
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0">{children}</p>
          },
          ul({ children }) {
            return <ul className="list-disc list-inside mb-2 ml-4">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-2 ml-4">{children}</ol>
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic mb-2">
                {children}
              </blockquote>
            )
          },
          h1({ children }) {
            return <h1 className="text-2xl font-bold mb-3">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-xl font-semibold mb-2">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-lg font-medium mb-2">{children}</h3>
          },
          strong({ children }) {
            return <strong className="font-semibold">{children}</strong>
          },
          em({ children }) {
            return <em className="italic">{children}</em>
          }
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownPreview