import React, { useRef, useCallback, useEffect, useState } from 'react'
import { View, PanResponder, StyleSheet } from 'react-native'
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl'
import * as THREE from 'three'
import { Renderer } from 'expo-three'
import VoxelCharacter from './VoxelCharacter'

const GL_HEIGHT = 460

const SKIN_TONES: Record<string, string> = {
  'tone-1': '#F5CBA7', 'tone-2': '#F0B97D',
  'tone-3': '#E59866', 'tone-4': '#C0784A', 'tone-5': '#8B5230',
}
const HAIR_COLORS: Record<string, string> = {
  'black': '#1A1A1A', 'dark-brown': '#2C1A0E', 'brown': '#5C3317',
  'light-brown': '#A0724F', 'blonde': '#C9A96E', 'auburn': '#7B3F20',
  'ash-grey': '#9E9E9E', 'silver': '#E8E8E8', 'deep-black': '#0D0D0D',
  'medium-brown': '#5C3317', 'dirty-blonde': '#BF9B5A', 'platinum': '#DCDCDC',
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}
function clamp(v: number): number { return Math.max(0, Math.min(255, v)) }
function darken(rgb: [number, number, number], amt: number): [number, number, number] {
  return [clamp(rgb[0] - amt), clamp(rgb[1] - amt), clamp(rgb[2] - amt)]
}

function getTierColors(tier: number): { shirt: string; pants: string; shoe: string } {
  const sets: Record<number, { shirt: string; pants: string; shoe: string }> = {
    1: { shirt: '#F5F5F5', pants: '#9A9AA8', shoe: '#3A2A1A' },
    2: { shirt: '#4A4A5A', pants: '#3A3A4A', shoe: '#1A1A1A' },
    3: { shirt: '#3A4050', pants: '#2A3040', shoe: '#1A1A1A' },
    4: { shirt: '#3D5166', pants: '#2C3E50', shoe: '#1A1A1A' },
  }
  return sets[tier] ?? sets[4]
}

function buildFaceTexture(skinHex: string, hairHex: string): THREE.DataTexture {
  const S = 64
  const data = new Uint8Array(S * S * 4)
  const sk = hexToRgb(skinHex)
  const hr = hexToRgb(hairHex)

  for (let i = 0; i < S * S; i++) {
    data[i * 4] = sk[0]; data[i * 4 + 1] = sk[1]; data[i * 4 + 2] = sk[2]; data[i * 4 + 3] = 255
  }

  function px(x: number, y: number, r: number, g: number, b: number) {
    if (x < 0 || x >= S || y < 0 || y >= S) return
    const i = (y * S + x) * 4
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255
  }
  function rect(x0: number, y0: number, w: number, h: number, r: number, g: number, b: number) {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) px(x0 + dx, y0 + dy, r, g, b)
  }

  const skD = darken(sk, 20)
  const skN = darken(sk, 12)
  const hrD = darken(hr, 10)
  const iris: [number, number, number] = [70, 42, 18]
  const pupil: [number, number, number] = [12, 8, 5]
  const eyeW: [number, number, number] = [238, 238, 236]
  const eyeRim: [number, number, number] = [18, 10, 5]
  const lip: [number, number, number] = [clamp(sk[0] - 35), clamp(sk[1] - 45), clamp(sk[2] - 40)]
  const lipHi: [number, number, number] = [clamp(sk[0] - 15), clamp(sk[1] - 20), clamp(sk[2] - 18)]

  rect(0, 0, S, 14, hr[0], hr[1], hr[2])
  rect(14, 18, 13, 3, hrD[0], hrD[1], hrD[2])
  rect(37, 18, 13, 3, hrD[0], hrD[1], hrD[2])
  rect(13, 22, 16, 9, eyeW[0], eyeW[1], eyeW[2])
  rect(35, 22, 16, 9, eyeW[0], eyeW[1], eyeW[2])
  for (let dx = 0; dx < 16; dx++) {
    px(13 + dx, 21, eyeRim[0], eyeRim[1], eyeRim[2])
    px(13 + dx, 31, eyeRim[0], eyeRim[1], eyeRim[2])
    px(35 + dx, 21, eyeRim[0], eyeRim[1], eyeRim[2])
    px(35 + dx, 31, eyeRim[0], eyeRim[1], eyeRim[2])
  }
  rect(17, 23, 8, 7, iris[0], iris[1], iris[2])
  rect(39, 23, 8, 7, iris[0], iris[1], iris[2])
  rect(19, 24, 4, 5, pupil[0], pupil[1], pupil[2])
  rect(41, 24, 4, 5, pupil[0], pupil[1], pupil[2])
  rect(29, 33, 4, 6, skD[0], skD[1], skD[2])
  rect(27, 38, 4, 3, skN[0], skN[1], skN[2])
  rect(33, 38, 4, 3, skN[0], skN[1], skN[2])
  rect(21, 43, 22, 3, lipHi[0], lipHi[1], lipHi[2])
  rect(21, 46, 22, 2, lip[0], lip[1], lip[2])

  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat)
  tex.needsUpdate = true
  tex.flipY = true
  return tex
}

function buildCharacter(skinHex: string, hairHex: string, tier: number): THREE.Group {
  const group = new THREE.Group()
  const { shirt, pants, shoe } = getTierColors(tier)

  const mat = (hex: string) => new THREE.MeshLambertMaterial({ color: new THREE.Color(hex) })

  function box(
    w: number, h: number, d: number,
    x: number, y: number, z: number,
    material: THREE.Material | THREE.Material[],
  ) {
    const geo = new THREE.BoxGeometry(w, h, d)
    const mesh = new THREE.Mesh(geo, material)
    mesh.position.set(x, y, z)
    group.add(mesh)
  }

  const skinMat = mat(skinHex)
  const hairMat = mat(hairHex)
  const shirtMat = mat(shirt)
  const pantsMat = mat(pants)
  const shoeMat = mat(shoe)

  box(0.9, 0.5, 1.15, -0.5,  0.25, 0.1, shoeMat)
  box(0.9, 0.5, 1.15,  0.5,  0.25, 0.1, shoeMat)

  box(0.78, 1.55, 0.78, -0.5, 1.28, 0, pantsMat)
  box(0.78, 1.55, 0.78,  0.5, 1.28, 0, pantsMat)

  box(0.84, 1.65, 0.84, -0.47, 2.83, 0, pantsMat)
  box(0.84, 1.65, 0.84,  0.47, 2.83, 0, pantsMat)

  box(2.2, 2.8, 1.12, 0, 5.0, 0, shirtMat)

  const upperArmMat = tier >= 2 ? mat(shirt) : skinMat
  box(0.66, 1.45, 0.66, -1.5, 5.5, 0, upperArmMat)
  box(0.66, 1.45, 0.66,  1.5, 5.5, 0, upperArmMat)

  box(0.62, 1.35, 0.62, -1.5, 4.12, 0, skinMat)
  box(0.62, 1.35, 0.62,  1.5, 4.12, 0, skinMat)

  box(0.6, 0.38, 0.58, 0, 6.57, 0, skinMat)

  const faceTex = buildFaceTexture(skinHex, hairHex)
  const headSkin = new THREE.MeshLambertMaterial({ color: new THREE.Color(skinHex) })
  const headFace = new THREE.MeshLambertMaterial({ map: faceTex })
  const headMats: THREE.Material[] = [headSkin, headSkin, headSkin, headSkin, headFace, headSkin]
  box(1.42, 1.65, 1.42, 0, 7.3, 0, headMats)

  box(1.45, 0.55, 1.45, 0, 8.18, 0, hairMat)
  box(1.45, 0.9, 0.2,  0, 7.65, -0.63, hairMat)
  box(0.38, 0.28, 1.45, -0.57, 7.82, 0, hairMat)
  box(0.38, 0.28, 1.45,  0.57, 7.82, 0, hairMat)

  return group
}

interface VoxelCharacter3DProps {
  skinTone?: string
  hairColor?: string
  outfitTier?: number
}

export default function VoxelCharacter3D({
  skinTone = 'tone-3',
  hairColor = 'dark-brown',
  outfitTier = 1,
}: VoxelCharacter3DProps) {
  const [glFailed, setGlFailed]   = useState(false)
  const fallbackTimerRef           = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rotYRef                    = useRef(0)
  const velocityRef                = useRef(0)
  const draggingRef                = useRef(false)
  const prevDxRef                  = useRef(0)
  const cancelRef                  = useRef<(() => void) | null>(null)
  const characterRef               = useRef<THREE.Group | null>(null)
  const sceneRef                   = useRef<THREE.Scene | null>(null)

  const skinHex = SKIN_TONES[skinTone] ?? SKIN_TONES['tone-3']
  const hairHex = HAIR_COLORS[hairColor] ?? HAIR_COLORS['dark-brown']

  useEffect(() => {
    if (!sceneRef.current || !characterRef.current) return
    const scene = sceneRef.current
    const oldChar = characterRef.current
    scene.remove(oldChar)
    oldChar.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach(m => m.dispose())
        mesh.geometry.dispose()
      }
    })
    const newChar = buildCharacter(skinHex, hairHex, outfitTier)
    newChar.position.set(0, -4.2, 0)
    newChar.rotation.y = rotYRef.current
    scene.add(newChar)
    characterRef.current = newChar
  }, [skinHex, hairHex, outfitTier])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        draggingRef.current = true
        prevDxRef.current   = 0
        velocityRef.current = 0
      },
      onPanResponderMove: (_, gs) => {
        const delta = (gs.dx - prevDxRef.current) * 0.012
        rotYRef.current    += delta
        velocityRef.current = delta
        prevDxRef.current   = gs.dx
      },
      onPanResponderRelease:   () => { draggingRef.current = false },
      onPanResponderTerminate: () => { draggingRef.current = false },
    }),
  ).current

  const onContextCreate = useCallback(
    (gl: ExpoWebGLRenderingContext) => {
      try {
        const { drawingBufferWidth: w, drawingBufferHeight: h } = gl

        const renderer = new Renderer({ gl, alpha: false })
        renderer.setSize(w, h)
        renderer.setPixelRatio(1)
        renderer.setClearColor(0x07071A, 1)

        const scene  = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100)
        camera.position.set(0, 0, 11)
        camera.lookAt(0, 0, 0)

        scene.add(new THREE.AmbientLight(0xffffff, 0.55))
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9)
        dirLight.position.set(2, 4, 3)
        scene.add(dirLight)
        const fillLight = new THREE.DirectionalLight(0x8899CC, 0.25)
        fillLight.position.set(-2, 2, -1)
        scene.add(fillLight)

        const character = buildCharacter(skinHex, hairHex, outfitTier)
        character.position.set(0, -4.2, 0)
        scene.add(character)

        sceneRef.current    = scene
        characterRef.current = character

        let rafId: number
        const tick = () => {
          rafId = requestAnimationFrame(tick)
          if (!draggingRef.current) {
            if (Math.abs(velocityRef.current) > 0.0005) {
              velocityRef.current *= 0.93
              rotYRef.current     += velocityRef.current
            } else {
              velocityRef.current = 0
            }
          }
          if (characterRef.current) {
            characterRef.current.rotation.y = rotYRef.current
          }
          renderer.render(scene, camera)
          gl.endFrameEXP()
        }
        tick()

        cancelRef.current = () => {
          cancelAnimationFrame(rafId)
          renderer.dispose()
          sceneRef.current     = null
          characterRef.current = null
        }
      } catch (err) {
        console.warn('[VoxelCharacter3D] GL init failed, falling back to 2D', err)
        setGlFailed(true)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    fallbackTimerRef.current = setTimeout(() => {
      if (!sceneRef.current) {
        console.warn('[VoxelCharacter3D] GL context never fired, falling back to 2D')
        setGlFailed(true)
      }
    }, 5000)
    return () => {
      cancelRef.current?.()
      if (fallbackTimerRef.current !== null) clearTimeout(fallbackTimerRef.current)
    }
  }, [])

  if (glFailed) {
    return (
      <VoxelCharacter skinTone={skinTone} hairColor={hairColor} outfitTier={outfitTier} />
    )
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />
      <View style={styles.spotlight} pointerEvents="none" />
      <View style={styles.groundShadow} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  glView: {
    width: '100%',
    height: GL_HEIGHT,
  },
  spotlight: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 200,
    height: 280,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  groundShadow: {
    width: 90,
    height: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.45)',
    marginTop: 0,
  },
})
