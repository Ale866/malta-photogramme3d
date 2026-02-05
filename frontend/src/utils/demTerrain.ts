import * as T from 'three'
import { fromArrayBuffer } from 'geotiff'

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function lerpColor(a: T.Color, b: T.Color, t: number) {
  return new T.Color(
    lerp(a.r, b.r, t),
    lerp(a.g, b.g, t),
    lerp(a.b, b.b, t),
  )
}

function heightToColor(h01: number) {
  const sand = new T.Color(0xcdbb8a)
  const grass = new T.Color(0x2f7d32)
  const rock = new T.Color(0x6d6a63)

  if (h01 < 0.18) return lerpColor(sand, grass, h01 / 0.18)
  if (h01 < 0.75) return lerpColor(grass, rock, (h01 - 0.18) / (0.75 - 0.18))
  return rock
}

export type DemResult = {
  mesh: T.Mesh
  bbox: { minX: number; minY: number; maxX: number; maxY: number }
  nodata: number
  width: number
  height: number
  zRange: { min: number; max: number }
}

export async function makeTerrainFromGeoTIFF(options: {
  url: string
  origin: T.Vector2
  segments?: number
  zScale?: number
  seaLevel?: number
}): Promise<DemResult> {
  const {
    url,
    origin,
    segments = 256,
    zScale = 2.2,
    seaLevel = 0,
  } = options

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch DEM: ${url} (${res.status})`)
  const buf = await res.arrayBuffer()

  const tiff = await fromArrayBuffer(buf)
  const image = await tiff.getImage()

  const [minX, minY, maxX, maxY] = image.getBoundingBox() as [number, number, number, number]
  const width = image.getWidth()
  const height = image.getHeight()

  const raster = (await image.readRasters({ interleave: true })) as any // TypedArray
  const nodata = image.getGDALNoData() ?? 0

  const sizeX = maxX - minX
  const sizeY = maxY - minY
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  origin.set(centerX, centerY)

  const sample = (x: number, y: number) => {
    const u = (x - minX) / (maxX - minX) 
    const v = (y - minY) / (maxY - minY) 

    const px = u * (width - 1)
    const py = (1 - v) * (height - 1)

    const x0 = Math.floor(px), y0 = Math.floor(py)
    const x1 = x0 + 1, y1 = y0 + 1

    const fx = px - x0, fy = py - y0

    const X0 = clamp(x0, 0, width - 1)
    const X1 = clamp(x1, 0, width - 1)
    const Y0 = clamp(y0, 0, height - 1)
    const Y1 = clamp(y1, 0, height - 1)

    const idx = (xx: number, yy: number) => yy * width + xx

    const z00 = Number(raster[idx(X0, Y0)])
    const z10 = Number(raster[idx(X1, Y0)])
    const z01 = Number(raster[idx(X0, Y1)])
    const z11 = Number(raster[idx(X1, Y1)])

    const fix = (z: number) => (z === nodata ? seaLevel : z)

    const a = fix(z00) * (1 - fx) + fix(z10) * fx
    const b = fix(z01) * (1 - fx) + fix(z11) * fx
    return (a * (1 - fy) + b * fy) * zScale
  }

  const geom = new T.PlaneGeometry(sizeX, sizeY, segments, segments)
  const pos = geom.attributes.position as T.BufferAttribute

  let zMin = Infinity
  let zMax = -Infinity

  for (let i = 0; i < pos.count; i++) {
    const xLocal = pos.getX(i)
    const yLocal = pos.getY(i)

    const xUtm = centerX + xLocal
    const yUtm = centerY + yLocal

    const z = sample(xUtm, yUtm)
    pos.setZ(i, z)

    if (z < zMin) zMin = z
    if (z > zMax) zMax = z
  }

  pos.needsUpdate = true

  const colors = new Float32Array(pos.count * 3)
  const denom = Math.max(1e-6, zMax - zMin)
  const tmp = new T.Color()

  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i)
    const h01 = clamp((z - zMin) / denom, 0, 1)
    tmp.copy(heightToColor(h01))

    colors[i * 3 + 0] = tmp.r
    colors[i * 3 + 1] = tmp.g
    colors[i * 3 + 2] = tmp.b
  }

  geom.setAttribute('color', new T.BufferAttribute(colors, 3))
  geom.computeVertexNormals()
  geom.computeBoundingBox()

  const mesh = new T.Mesh(
    geom,
    new T.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.0,
      side: T.DoubleSide,
    })
  )

  mesh.receiveShadow = true
  mesh.castShadow = true

  return {
    mesh,
    bbox: { minX, minY, maxX, maxY },
    nodata,
    width,
    height,
    zRange: { min: zMin, max: zMax },
  }
}

export async function makeAlphaMaskFromGeoJSON(options: {
  url: string
  bbox: { minX: number; minY: number; maxX: number; maxY: number }
  size?: number
}) {
  const { url, bbox, size = 2048 } = options

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch GeoJSON mask: ${url} (${res.status})`)
  const geojson = await res.json()

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)

  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, size, size)

  const toPx = (x: number, y: number) => {
    const u = (x - bbox.minX) / (bbox.maxX - bbox.minX)
    const v = (y - bbox.minY) / (bbox.maxY - bbox.minY)
    const px = u * size
    const py = (1 - v) * size
    return [px, py] as const
  }

  const drawRing = (ring: number[][]) => {
    if (!ring?.length) return
    ctx.beginPath()
    for (let i = 0; i < ring.length; i++) {
      const [x, y] = ring[i]
      const [px, py] = toPx(x, y)
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
  }

  ctx.fillStyle = 'white'

  for (const feature of geojson.features ?? []) {
    const g = feature.geometry
    if (!g) continue

    if (g.type === 'Polygon') {
      const rings = g.coordinates as number[][][]
      drawRing(rings[0])

      for (let i = 1; i < rings.length; i++) {
        ctx.save()
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = 'black'
        drawRing(rings[i])
        ctx.restore()
      }
    }

    if (g.type === 'MultiPolygon') {
      const polys = g.coordinates as number[][][][]
      for (const rings of polys) {
        drawRing(rings[0])

        for (let i = 1; i < rings.length; i++) {
          ctx.save()
          ctx.globalCompositeOperation = 'destination-out'
          ctx.fillStyle = 'black'
          drawRing(rings[i])
          ctx.restore()
        }
      }
    }
  }

  const tex = new T.CanvasTexture(canvas)
  tex.wrapS = T.ClampToEdgeWrapping
  tex.wrapT = T.ClampToEdgeWrapping
  tex.minFilter = T.LinearMipmapLinearFilter
  tex.magFilter = T.LinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true

  return tex
}