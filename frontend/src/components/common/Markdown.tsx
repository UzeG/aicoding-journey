import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** GitHub-flavored Markdown renderer. Safe by default — raw HTML is not rendered. */
export default function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
