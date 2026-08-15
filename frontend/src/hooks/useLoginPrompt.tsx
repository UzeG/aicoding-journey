import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'

/**
 * 创作页需要登录的操作（生成/发布/存草稿）：先弹窗提示，确认后跳登录。
 * 返回 askLogin()（触发弹窗）+ loginModal（渲染在组件 JSX 中）。
 */
export function useLoginPrompt() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const askLogin = () => setOpen(true)

  const goLogin = () => {
    setOpen(false)
    navigate(`/login?redirect=${encodeURIComponent('/creation')}`)
  }

  const loginModal = (
    <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>需要登录</DialogTitle>
          <DialogDescription>登录后才能执行该操作（生成 / 发布 / 保存草稿）。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={goLogin}>去登录</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { askLogin, loginModal }
}
