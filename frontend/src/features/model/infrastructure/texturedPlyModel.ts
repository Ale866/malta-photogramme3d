import * as T from 'three'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'

type LoadTexturedPlyModelInput = {
  meshUrl: string
  textureUrl?: string | null
}

export async function loadTexturedPlyModel(input: LoadTexturedPlyModelInput): Promise<T.Group> {
  const geometry = await new PLYLoader().loadAsync(input.meshUrl)
  geometry.computeVertexNormals()

  const materialOptions: ConstructorParameters<typeof T.MeshStandardMaterial>[0] = {
    roughness: 0.92,
    metalness: 0,
    side: T.DoubleSide,
  }

  if (geometry.getAttribute('color')) {
    materialOptions.vertexColors = true
  }

  if (input.textureUrl && geometry.getAttribute('uv')) {
    try {
      const texture = await new T.TextureLoader().loadAsync(input.textureUrl)
      texture.colorSpace = T.SRGBColorSpace
      materialOptions.map = texture
    } catch (error) {
      console.warn(`Failed to load model texture from ${input.textureUrl}`, error)
    }
  }

  const material = new T.MeshStandardMaterial(materialOptions)
  const mesh = new T.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true

  const root = new T.Group()
  root.add(mesh)

  const box = new T.Box3().setFromObject(mesh)
  const center = box.getCenter(new T.Vector3())
  mesh.position.set(-center.x, -box.min.y, -center.z)

  return root
}

export function disposeObject3D(object: T.Object3D) {
  object.traverse((child) => {
    const mesh = child as T.Mesh
    if (!mesh.isMesh) return

    mesh.geometry?.dispose()

    if (Array.isArray(mesh.material)) {
      for (const material of mesh.material) {
        disposeMaterial(material)
      }
      return
    }

    disposeMaterial(mesh.material)
  })
}

function disposeMaterial(material: T.Material) {
  const standardMaterial = material as T.MeshStandardMaterial
  standardMaterial.map?.dispose()
  material.dispose()
}
