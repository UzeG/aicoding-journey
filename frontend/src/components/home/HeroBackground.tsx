import { useEffect, useRef } from 'react'
import type * as THREE from 'three'

/**
 * Hero 背景（Three.js，懒加载）：平铺网格（线段留空隙 + 交叉处圆点），鼠标驱动鼓起。
 * - 网格平铺在页面（正对相机），铺满整个 section
 * - 线段端点内缩留一小段空隙，交叉处是圆点（DeepSeek 原版样式）
 * - 无时间动画：鼠标不动 → 完全静止；鼠标移动 → 光标附近网格线与点一起鼓起（离开复原）
 * - 颜色跟随当前 --primary（个人主题色）
 * - 降级：reduced-motion → 静态平面网格；WebGL 不可用 → 纯纸面
 */
export default function HeroBackground() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    const cleanups: Array<() => void> = []

    void (async () => {
      if (disposed) return
      const THREE = await import('three')
      if (disposed || !host || host.clientWidth === 0) return

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(55, host.clientWidth / host.clientHeight, 0.1, 100)
      camera.position.set(0, 0, 10)
      camera.lookAt(0, 0, 0)

      let renderer: THREE.WebGLRenderer
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      } catch {
        return
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.setSize(host.clientWidth, host.clientHeight)
      renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
      host.appendChild(renderer.domElement)

      const css = (name: string) =>
        getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      // 网格线/点色 = 主色与墨色混合（避免浅主色在浅纸上看不见）
      const hexMix = (a: string, b: string, t: number) => {
        const pa = parseInt(a.slice(1), 16)
        const pb = parseInt(b.slice(1), 16)
        const r = Math.round(((pa >> 16) & 255) * t + ((pb >> 16) & 255) * (1 - t))
        const g = Math.round(((pa >> 8) & 255) * t + ((pb >> 8) & 255) * (1 - t))
        const bl = Math.round((pa & 255) * t + (pb & 255) * (1 - t))
        return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)
      }
      let themeHex = hexMix(css('--primary') || '#3D5A80', css('--foreground') || '#20221F', 0.72)

      // ── 网格：线段端点内缩留空隙 + 交叉处圆点 ──
      const CELL = 0.8
      const GAP = 0.2
      const GRID_W = 40 * CELL
      const GRID_H = 24 * CELL
      const SEGS_X = 40
      const SEGS_Y = 24
      const NX = SEGS_X + 1
      const NY = SEGS_Y + 1

      const lineVerts: Array<{ x: number; y: number }> = []
      for (let iy = 0; iy < NY; iy++) {
        const y = -GRID_H / 2 + iy * CELL
        for (let ix = 0; ix < NX - 1; ix++) {
          const x1 = -GRID_W / 2 + ix * CELL + GAP / 2
          const x2 = -GRID_W / 2 + (ix + 1) * CELL - GAP / 2
          lineVerts.push({ x: x1, y }, { x: x2, y })
        }
      }
      for (let ix = 0; ix < NX; ix++) {
        const x = -GRID_W / 2 + ix * CELL
        for (let iy = 0; iy < NY - 1; iy++) {
          const y1 = -GRID_H / 2 + iy * CELL + GAP / 2
          const y2 = -GRID_H / 2 + (iy + 1) * CELL - GAP / 2
          lineVerts.push({ x, y: y1 }, { x, y: y2 })
        }
      }

      const V = lineVerts.length
      const linePos = new Float32Array(V * 3)
      const lineBaseX = new Float32Array(V)
      const lineBaseY = new Float32Array(V)
      for (let v = 0; v < V; v++) {
        linePos[v * 3] = lineVerts[v].x
        linePos[v * 3 + 1] = lineVerts[v].y
        lineBaseX[v] = lineVerts[v].x
        lineBaseY[v] = lineVerts[v].y
      }
      const lineGeo = new THREE.BufferGeometry()
      lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage))
      const lineMat = new THREE.LineBasicMaterial({ color: themeHex, transparent: true, opacity: 0.1 })
      scene.add(new THREE.LineSegments(lineGeo, lineMat))

      // 交叉处圆点
      const dotCount = NX * NY
      const dotPos = new Float32Array(dotCount * 3)
      const dotBaseX = new Float32Array(dotCount)
      const dotBaseY = new Float32Array(dotCount)
      let di = 0
      for (let iy = 0; iy < NY; iy++) {
        const y = -GRID_H / 2 + iy * CELL
        for (let ix = 0; ix < NX; ix++) {
          const x = -GRID_W / 2 + ix * CELL
          dotPos[di * 3] = x
          dotPos[di * 3 + 1] = y
          dotBaseX[di] = x
          dotBaseY[di] = y
          di++
        }
      }
      const dotTex = (() => {
        const c = document.createElement('canvas')
        c.width = c.height = 32
        const g = c.getContext('2d')
        if (g) {
          const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16)
          grad.addColorStop(0, 'rgba(255,255,255,1)')
          grad.addColorStop(0.4, 'rgba(255,255,255,0.6)')
          grad.addColorStop(1, 'rgba(255,255,255,0)')
          g.fillStyle = grad
          g.fillRect(0, 0, 32, 32)
        }
        const tex = new THREE.CanvasTexture(c)
        tex.colorSpace = THREE.SRGBColorSpace
        return tex
      })()
      const dotGeo = new THREE.BufferGeometry()
      dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3).setUsage(THREE.DynamicDrawUsage))
      const dotMat = new THREE.PointsMaterial({
        size: 0.12,
        map: dotTex,
        transparent: true,
        opacity: 0.4,
        color: themeHex,
        depthWrite: false,
        sizeAttenuation: true,
      })
      scene.add(new THREE.Points(dotGeo, dotMat))

      // ── 鼠标（映射到 z=0 平面）──
      const mousePt = new THREE.Vector3(9999, 9999, 0)
      const ndc = new THREE.Vector3()
      const rayDir = new THREE.Vector3()
      const mouseActive = () => mousePt.x < 9000

      const applyBulge = () => {
        const mx = mousePt.x
        const my = mousePt.y
        const R = 3.4
        for (let v = 0; v < V; v++) {
          const bx = lineBaseX[v]
          const by = lineBaseY[v]
          let px = bx
          let py = by
          if (mouseActive()) {
            const dx = bx - mx
            const dy = by - my
            const d2 = dx * dx + dy * dy
            if (d2 < R * R) {
              const d = Math.sqrt(d2)
              const fall = 1 - d / R
              const ux = dx / d
              const uy = dy / d
              px = bx + ux * fall * 0.45
              py = by + uy * fall * 0.45
            }
          }
          linePos[v * 3] = px
          linePos[v * 3 + 1] = py
        }
        for (let d = 0; d < dotCount; d++) {
          const bx = dotBaseX[d]
          const by = dotBaseY[d]
          let px = bx
          let py = by
          if (mouseActive()) {
            const dx = bx - mx
            const dy = by - my
            const d2 = dx * dx + dy * dy
            if (d2 < R * R) {
              const dist = Math.sqrt(d2)
              const fall = 1 - dist / R
              const ux = dx / dist
              const uy = dy / dist
              px = bx + ux * fall * 0.45
              py = by + uy * fall * 0.45
            }
          }
          dotPos[d * 3] = px
          dotPos[d * 3 + 1] = py
        }
        lineGeo.attributes.position.needsUpdate = true
        dotGeo.attributes.position.needsUpdate = true
        renderer.render(scene, camera)
      }

      const onMove = (e: PointerEvent) => {
        const r = host.getBoundingClientRect()
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
          mousePt.set(9999, 9999, 0)
        } else {
          ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1), 0.5).unproject(camera)
          rayDir.copy(ndc).sub(camera.position).normalize()
          if (Math.abs(rayDir.z) > 1e-6) {
            mousePt.copy(camera.position).addScaledVector(rayDir, -camera.position.z / rayDir.z)
          }
        }
        applyBulge()
      }
      const onTheme = () => {
        const c = hexMix(css('--primary') || '#3D5A80', css('--foreground') || '#20221F', 0.72)
        if (c !== themeHex) {
          themeHex = c
          lineMat.color.set(c)
          ;(dotMat.color as THREE.Color).set(c)
          renderer.render(scene, camera)
        }
      }

      applyBulge()

      if (!reduced) {
        window.addEventListener('pointermove', onMove, { passive: true })
        window.addEventListener('themechange', onTheme)
      }

      const ro = new ResizeObserver(() => {
        if (!host) return
        const w = host.clientWidth
        const h = host.clientHeight
        if (w === 0 || h === 0) return
        renderer.setSize(w, h)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        applyBulge()
      })
      ro.observe(host)

      cleanups.push(() => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('themechange', onTheme)
        ro.disconnect()
        dotTex.dispose()
        lineGeo.dispose()
        lineMat.dispose()
        dotGeo.dispose()
        dotMat.dispose()
        renderer.dispose()
        if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
      })
    })()

    return () => {
      disposed = true
      cleanups.forEach((fn) => fn())
    }
  }, [])

  return <div ref={hostRef} className="absolute inset-0" aria-hidden />
}
