import { useCallback, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import { useGenerationStore } from '../stores/generation'
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
 * 创作页离开守卫：有未保存内容（dirty）时，切换其他页面弹窗确认；刷新/关页走 beforeunload。
 * 排除 /login——创作页自身的登录/注册跳转不提示，登录返回内容保留（SPA navigate，store 存活）。
 * 返回 leaveGuardModal 渲染在组件 JSX 中。
 */
export function useUnsavedLeaveGuard(dirty: boolean) {
  // useBlocker 的 shouldBlock 必须是稳定引用（否则每次渲染重注册 blocker，可能放行已拦截的导航）——
  // 用 ref 读最新 dirty，函数体用 useCallback 固定。
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  // SPA 内导航拦截（useBlocker 拿到 nextLocation，可精确排除 /login）
  const blocker = useBlocker(
    useCallback(
      ({ nextLocation }: { nextLocation: { pathname: string } }) =>
        dirtyRef.current && nextLocation.pathname !== '/login',
      []
    )
  )

  // 整页卸载（刷新/关闭/跳发布页整页加载）兜底——beforeunload 无法区分目标，正常登录是 SPA 跳转不触发
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // 现代浏览器忽略自定义文案，仅用于触发原生确认框
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const stay = () => blocker.reset?.()
  const confirmLeave = () => {
    // 确认离开 → 丢弃未保存内容（否则 store 存活，返回 /creation 内容还在）
    useGenerationStore.getState().reset()
    blocker.proceed?.()
  }

  const leaveGuardModal = (
    <Dialog open={blocker.state === 'blocked'} onOpenChange={(o) => !o && stay()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>内容未保存</DialogTitle>
          <DialogDescription>离开后，当前编辑器里未保存的内容将丢失。确定要离开吗？</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={stay}>
            留在本页
          </Button>
          <Button variant="destructive" onClick={confirmLeave}>
            离开
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { leaveGuardModal }
}
