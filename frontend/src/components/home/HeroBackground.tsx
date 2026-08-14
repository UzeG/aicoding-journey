import { useEffect, useRef } from 'react'
import type * as THREE from 'three'

/**
 * Hero 背景动效（Three.js，懒加载）：克制版。
 * - 稀疏的细点（不是字形碎片），低不透明度，纯背景
 * - 鼠标移动：整体视差倾斜 + 光标一圈柔和的推开涟漪
 * - 点击：在点击处扩散一枚青色圆环（干净、受控、不挡内容）
 * - 颜色跟随当前 --primary（个人主题色）
 * - 降级：reduced-motion → 静态一帧；WebGL 不可用 → 纯纸面
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
      const isMobile = host.clientWidth < 768
      const DOT_COUNT = isMobile ? 24 : 55

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(55, host.clientWidth / host.clientHeight, 0.1, 100)
      camera.position.set(0, 0, 12)

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
      let themeColor = css('--primary') || '#0E7A6C'
      const inkColor = css('--foreground') || '#20221F'

      // 柔和圆点纹理（白色，颜色由 SpriteMaterial.color 叠加）
      const dotTex = (() => {
        const c = document.createElement('canvas')
        c.width = c.height = 32
        const g = c.getContext('2d')
        if (g) {
          const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16)
          grad.addColorStop(0, 'rgba(255,255,255,1)')
          grad.addColorStop(0.35, 'rgba(255,255,255,0.55)')
          grad.addColorStop(1, 'rgba(255,255,255,0)')
          g.fillStyle = grad
          g.fillRect(0, 0, 32, 32)
        }
        const tex = new THREE.CanvasTexture(c)
        tex.colorSpace = THREE.SRGBColorSpace
        return tex
      })()

      const group = new THREE.Group()
      scene.add(group)

      const rand = (a: number, b: number) => a + Math.random() * (b - a)
      const dots: THREE.Sprite[] = []
      const homes: THREE.Vector3[] = []
      const meta: Array<{ speed: number; phase: number; isTheme: boolean; radius: number }> = []
      const spreadX = 21
      const spreadY = 13
      const spreadZ = 6

      for (let i = 0; i < DOT_COUNT; i++) {
        const isTheme = Math.random() < 0.55
        const mat = new THREE.SpriteMaterial({
          map: dotTex,
          color: isTheme ? themeColor : inkColor,
          transparent: true,
          opacity: rand(0.06, 0.14),
          depthWrite: false,
        })
        const s = new THREE.Sprite(mat)
        const scale = rand(0.05, 0.13)
        s.position.set(rand(-spreadX / 2, spreadX / 2), rand(-spreadY / 2, spreadY / 2), rand(-spreadZ, 1))
        s.scale.set(scale, scale, 1)
        s.frustumCulled = false
        group.add(s)
        dots.push(s)
        homes.push(s.position.clone())
        meta.push({ speed: rand(0.4, 1.1), phase: rand(0, Math.PI * 2), isTheme, radius: rand(1.4, 3) })
      }

      // 点击扩散圆环（3 个复用，各自独立材质）
      const ringGeo = new THREE.RingGeometry(0.96, 1, 64)
      const rings: Array<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>> = []
      for (let i = 0; i < 3; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: themeColor,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
        const m = new THREE.Mesh(ringGeo, mat)
        m.visible = false
        scene.add(m)
        rings.push(m)
      }
      let ringCursor = 0

      // 鼠标 → 视差 + 排斥中心（映射到 z=0 平面）
      let nx = 0
      let ny = 0
      const repelPt = new THREE.Vector3(9999, 9999, 0)
      const ndc = new THREE.Vector3()
      const rayDir = new THREE.Vector3()
      const setRepel = (cx: number, cy: number) => {
        nx = (cx / host.clientWidth) * 2 - 1
        ny = -((cy / host.clientHeight) * 2 - 1)
        ndc.set(nx, ny, 0.5).unproject(camera)
        rayDir.copy(ndc).sub(camera.position).normalize()
        if (Math.abs(rayDir.z) > 1e-6) {
          const t = -camera.position.z / rayDir.z
          repelPt.copy(camera.position).addScaledVector(rayDir, t)
        } else {
          repelPt.set(9999, 9999, 0)
        }
      }

      const onMove = (e: PointerEvent) => {
        const r = host.getBoundingClientRect()
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
          nx = 0
          ny = 0
          repelPt.set(9999, 9999, 0)
          return
        }
        setRepel(e.clientX - r.left, e.clientY - r.top)
      }

      const onClick = (e: MouseEvent) => {
        const r = host.getBoundingClientRect()
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1), 0.5).unproject(camera)
        rayDir.copy(ndc).sub(camera.position).normalize()
        if (Math.abs(rayDir.z) < 1e-6) return
        const pt = camera.position.clone().addScaledVector(rayDir, -camera.position.z / rayDir.z)
        const ring = rings[ringCursor]
        ringCursor = (ringCursor + 1) % rings.length
        ring.visible = true
        ring.position.copy(pt)
        ring.scale.set(0.1, 0.1, 1)
        ring.userData.life = 0
        ring.material.opacity = 0.32
      }

      const onTheme = () => {
        const c = css('--primary') || '#0E7A6C'
        if (c === themeColor) return
        themeColor = c
        for (let i = 0; i < dots.length; i++) {
          if (meta[i].isTheme) dots[i].material.color.set(c)
        }
        rings.forEach((m) => (m.material as THREE.MeshBasicMaterial).color.set(c))
      }

      let raf = 0
      const t0 = performance.now()
      const tick = (now: number) => {
        if (disposed) return
        const t = (now - t0) / 1000
        group.rotation.y = Math.sin(t * 0.03) * 0.06 + nx * 0.03
        group.rotation.x = -ny * 0.03
        camera.position.x += (nx * 0.8 - camera.position.x) * 0.04
        camera.position.y += (-ny * 0.5 - camera.position.y) * 0.04
        camera.lookAt(0, 0, 0)

        for (let i = 0; i < dots.length; i++) {
          const sp = dots[i]
          const home = homes[i]
          const m = meta[i]
          let tx = home.x + Math.sin(t * 0.4 * m.speed + m.phase) * 0.22
          let ty = home.y + Math.cos(t * 0.35 * m.speed + m.phase) * 0.18
          const dx = sp.position.x - repelPt.x
          const dy = sp.position.y - repelPt.y
          const d2 = dx * dx + dy * dy
          if (d2 < m.radius * m.radius && d2 > 1e-6) {
            const d = Math.sqrt(d2)
            const f = (1 - d / m.radius) * 0.9
            tx += (dx / d) * f
            ty += (dy / d) * f
          }
          sp.position.x += (tx - sp.position.x) * 0.05
          sp.position.y += (ty - sp.position.y) * 0.05
        }

        for (const ring of rings) {
          if (!ring.visible) continue
          ring.userData.life += 1 / 60
          const life = ring.userData.life
          if (life >= 0.65) {
            ring.visible = false
            continue
          }
          const s = 0.1 + life * 5.5
          ring.scale.set(s, s, 1)
          ring.material.opacity = Math.max(0, 0.32 * (1 - life * 1.5))
        }

        renderer.render(scene, camera)
        raf = requestAnimationFrame(tick)
      }

      if (reduced) {
        renderer.render(scene, camera)
      } else {
        window.addEventListener('pointermove', onMove, { passive: true })
        window.addEventListener('click', onClick)
        window.addEventListener('themechange', onTheme)
        raf = requestAnimationFrame(tick)
      }

      const ro = new ResizeObserver(() => {
        if (!host) return
        const w = host.clientWidth
        const h = host.clientHeight
        if (w === 0 || h === 0) return
        renderer.setSize(w, h)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        if (reduced) renderer.render(scene, camera)
      })
      ro.observe(host)

      cleanups.push(() => {
        cancelAnimationFrame(raf)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('click', onClick)
        window.removeEventListener('themechange', onTheme)
        ro.disconnect()
        dotTex.dispose()
        ringGeo.dispose()
        dots.forEach((s) => s.material.dispose())
        rings.forEach((r) => r.material.dispose())
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
