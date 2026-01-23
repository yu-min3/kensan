import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo,
  Redo,
  Link as LinkIcon,
  Code2,
} from 'lucide-react'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function ToolbarButton({
  onClick,
  icon: Icon,
  title,
  isActive = false,
  disabled = false,
}: {
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  title: string
  isActive?: boolean
  disabled?: boolean
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-8 w-8 ${isActive ? 'bg-muted' : ''}`}
      onClick={onClick}
      title={title}
      type="button"
      disabled={disabled}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}

export function MarkdownEditor({ value, onChange, placeholder }: MarkdownEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Markdownで記述...',
      }),
      Link.configure({
        openOnClick: false,
      }),
      Markdown,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storage = editor.storage as any
      const markdown = storage.markdown.getMarkdown()
      onChange(markdown)
    },
  })

  // 外部からvalueが変更された場合に同期
  useEffect(() => {
    if (!editor) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = editor.storage as any
    if (value !== storage.markdown.getMarkdown()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) {
    return null
  }

  const addLink = () => {
    const url = window.prompt('URLを入力:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          icon={Heading1}
          title="見出し1"
          isActive={editor.isActive('heading', { level: 1 })}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          icon={Heading2}
          title="見出し2"
          isActive={editor.isActive('heading', { level: 2 })}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          icon={Heading3}
          title="見出し3"
          isActive={editor.isActive('heading', { level: 3 })}
        />
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          icon={Bold}
          title="太字"
          isActive={editor.isActive('bold')}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          icon={Italic}
          title="斜体"
          isActive={editor.isActive('italic')}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          icon={Strikethrough}
          title="取り消し線"
          isActive={editor.isActive('strike')}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          icon={Code}
          title="インラインコード"
          isActive={editor.isActive('code')}
        />
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          icon={List}
          title="箇条書き"
          isActive={editor.isActive('bulletList')}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          icon={ListOrdered}
          title="番号付きリスト"
          isActive={editor.isActive('orderedList')}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          icon={Quote}
          title="引用"
          isActive={editor.isActive('blockquote')}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          icon={Code2}
          title="コードブロック"
          isActive={editor.isActive('codeBlock')}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          icon={Minus}
          title="水平線"
        />
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton
          onClick={addLink}
          icon={LinkIcon}
          title="リンク"
          isActive={editor.isActive('link')}
        />
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          icon={Undo}
          title="元に戻す"
          disabled={!editor.can().undo()}
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          icon={Redo}
          title="やり直す"
          disabled={!editor.can().redo()}
        />
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">Markdown</span>
      </div>
      <EditorContent editor={editor} className="tiptap-editor min-h-[300px] p-4" />
    </Card>
  )
}
