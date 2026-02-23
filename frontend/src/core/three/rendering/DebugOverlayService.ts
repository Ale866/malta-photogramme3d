import Stats from 'three/examples/jsm/libs/stats.module.js'

export class DebugOverlayService {
  private host: HTMLDivElement | null = null
  private statsPanels: Stats[] = []

  initialize() {
    if (typeof document === 'undefined') return
    if (this.host) return

    const existingHost = document.getElementById('debug-overlay')
    if (existingHost?.parentNode) {
      existingHost.parentNode.removeChild(existingHost)
    }

    const host = document.createElement('div')
    host.id = 'debug-overlay'
    host.style.position = 'fixed'
    host.style.top = '12px'
    host.style.right = '12px'
    host.style.zIndex = '3000'
    host.style.display = 'flex'
    host.style.gap = '6px'
    host.style.pointerEvents = 'none'

    const fpsStats = new Stats()
    fpsStats.showPanel(0)
    fpsStats.dom.style.position = 'static'

    const frameTimeStats = new Stats()
    frameTimeStats.showPanel(1)
    frameTimeStats.dom.style.position = 'static'

    host.appendChild(fpsStats.dom)
    host.appendChild(frameTimeStats.dom)
    this.statsPanels = [fpsStats, frameTimeStats]

    const supportsMemoryPanel =
      typeof performance !== 'undefined' && 'memory' in performance
    if (supportsMemoryPanel) {
      const memoryStats = new Stats()
      memoryStats.showPanel(2)
      memoryStats.dom.style.position = 'static'
      host.appendChild(memoryStats.dom)
      this.statsPanels.push(memoryStats)
    }

    document.body.appendChild(host)
    this.host = host
  }

  beginFrame() {
    this.statsPanels.forEach((panel) => panel.begin())
  }

  endFrame() {
    this.statsPanels.forEach((panel) => panel.end())
  }

  setVisible(visible: boolean) {
    if (this.host) {
      this.host.style.display = visible ? 'flex' : 'none'
    }
  }

  getHost() {
    return this.host
  }

  dispose() {
    this.statsPanels = []
    if (this.host?.parentNode) {
      this.host.parentNode.removeChild(this.host)
    }
    this.host = null
  }
}
