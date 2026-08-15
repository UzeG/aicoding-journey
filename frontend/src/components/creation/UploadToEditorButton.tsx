import { useRef, useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'

interface Props {
  disabled: boolean
  /** 确认后回调：file 为选中的 html/htm 文件（由上层创建草稿并覆盖编辑器） */
  onLoaded: (file: File) => void
}

/** 创作页上传入口：读文件 → 确认覆盖 → 交上层处理。 */
export default function UploadToEditorButton({ disabled, onLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [pending, setPending] = useState<File | null>(null)

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // allow re-selecting the same file
    setReading(true)
    try {
      // 预读一次验证内容可解析，确认时直接交上层
      await file.text()
      setPending(file)
    } catch {
      // 读取失败则不弹确认
    } finally {
      setReading(false)
    }
  }

  const handleConfirm = () => {
    if (pending) onLoaded(pending)
    setPending(null)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm"
        hidden
        onChange={handleSelect}
      />
      <Button
        variant="outline"
        disabled={disabled || reading}
        onClick={() => inputRef.current?.click()}
      >
        {reading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
        上传 HTML
      </Button>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>覆盖编辑器内容？</DialogTitle>
            <DialogDescription>
              上传「{pending?.name}」将覆盖当前编辑器内容（当前页面未发布的生成内容会丢失）。发布或存草稿时才需要登录。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              取消
            </Button>
            <Button onClick={handleConfirm}>
              确认上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
