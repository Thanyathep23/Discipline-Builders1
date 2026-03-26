import React, { useRef, useEffect, useCallback, useState } from 'react'
import { PanResponder, useWindowDimensions, View } from 'react-native'
import Svg, { Rect, G } from 'react-native-svg'

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface VoxelCharacter3DProps {
  skinTone?: string
  hairColor?: string
  outfitTier?: number
}

// ─── Color look-ups ────────────────────────────────────────────────────────────

const SKIN_TONES: Record<string, string> = {
  'tone-1': '#F5CBA7',
  'tone-2': '#F0B97D',
  'tone-3': '#E59866',
  'tone-4': '#C0784A',
  'tone-5': '#8B5230',
}
const HAIR_COLORS: Record<string, string> = {
  'black': '#1A1A1A',
  'dark-brown': '#2C1A0E',
  'brown': '#5C3317',
  'light-brown': '#A0724F',
  'blonde': '#C9A96E',
  'auburn': '#7B3F20',
  'ash-grey': '#9E9E9E',
  'silver': '#E8E8E8',
  'deep-black': '#0D0D0D',
  'medium-brown': '#5C3317',
  'dirty-blonde': '#BF9B5A',
  'platinum': '#DCDCDC',
}

// ─── Shading helpers ───────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

function shade(hex: string, mult: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `#${((1 << 24) | (clamp255(r * mult) << 16) | (clamp255(g * mult) << 8) | clamp255(b * mult)).toString(16).slice(1)}`
}

function darkenHex(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `#${[r, g, b].map(c => clamp255(c - Math.round(255 * amt)).toString(16).padStart(2, '0')).join('')}`
}

function lightenHex(hex: string, amt: number): string {
  return shade(hex, 1 + amt)
}

// Face multipliers — exact spec values
const TOP_MULT   = 1.30
const FRONT_MULT = 1.00
const LEFT_MULT  = 0.80
const RIGHT_MULT = 0.65

// ─── Sprite maps ───────────────────────────────────────────────────────────────
// Legend (resolved at parse time based on skin/hair props):
//   S = skin tone      s = light skin     d = dark skin      z = darkest skin
//   H = hair color     h = light hair     B = dark hair
//   W = white shirt    w = shirt shadow   E = shirt dark
//   K = black trouser  k = dark trouser
//   O = brown shoe     o = dark shoe      P = medium shoe
//   e = sclera white   i = iris (#2A5080) r = pupil (dark)
//   a = eyelid shadow  l = lower lid highlight
//   b = eyebrow (dark hair)
//   M = nose/bridge    n = nostril (dark skin)
//   U = upper lip      V = lower lip      c = lip corner shadow
//   j = jaw shadow     . = transparent

// FRONT_MAP — 32 cols × 56 rows — front facing
// Head: 12 cols wide (cols 10-21), ears at 9 & 22 (eye-level only)
// Eyes: left cols 13-14, right cols 17-18 (2-voxel nose-bridge gap at cols 15-16)
//   6 voxels per eye: eyelid shadow row 8, sclera+iris row 9, lower-lid+pupil row 10
// Nose bridge: MM at cols 15-16 (inside the eye gap), nostrils n at cols 14 & 17
// Mouth: upper lip UUU cols 14-16 row 12, lower lip VVVV cols 13-16 row 13
// Jaw tapers rows 14-16, neck 4 wide cols 14-17 rows 15-16
const FRONT_MAP: string[] = [
  '..........HhHhHhHhHhHh..........',
  '.........HhHhHhHhHhHhHH.........',
  '.........hHhHhHhHhHhHhH.........',
  '.........HHhHhHhHhHhHHH.........',
  '.........SHhHhHhHhHhHhs.........',
  '.........SSSSSSSSSSSSSs.........',
  '.........SSSSSbSSbSSSSS.........',
  '.........SSSbbSSSSbbSSS.........',
  '.........SSSSaaSSaaSSSS.........',
  '.........dSSSeiSSieSSSd.........',
  '.........dSSSlrMMrlSSSd.........',
  '..........SSSdnMMndSSS..........',
  '..........SSScUUUcSSSS..........',
  '...........SSVVVVSSSS...........',
  '...........jSSSSSSSSj...........',
  '............jdSSSSdj............',
  '.............dSzzSd.............',
  '....SSSSSSwWWWWWWWWWWWWwSSSSS...',
  '...SSSSSSwWWWWWWWWWWWWWWwSSSSSs.',
  '..SSSSSSSwWWWWWWWWWWWWWWwSSSSSSs',
  '..SSSSSSwWWWWWWWWWWWWWWWwSSSSSS.',
  '..SSSSSSwWWWWWWWWWWWWWWWwSSSSSS.',
  '..SSSSSSwWWWWWWWWWWWWWWWwSSSSSS.',
  '..SSSSSSEWWWWWWWWWWWWWWWESSSSSS.',
  '..SSSSSSEwWWWWWWWWWWWWWwESSSSSS.',
  '...SSSSSSEEEEEEEEEEEEEEESSSSSSs.',
  '....SSSSSSSSSSSSSSSSSSSSSSSSSSs.',
  '..SSSSSSSwWWWWWWWWWWWWWwSSSSSSS.',
  '..SSSSSSSwWWWWWWWWWWWWWwSSSSSSS.',
  '..........KKKKKKKKKKKKkk........',
  '..........KKKKKKKKKKKKkk........',
  '..........KkKKKKKKKKKkKk........',
  '..........KkKKKKKKKKKkKk........',
  '..........KkKKKKKKKKKkKk........',
  '..........KkKKKKKKKKKkKk........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......OOOOOOOo.oOOOOOOO........',
  '.......OOOPOOOo.oOOOPOOO........',
  '.......OOOOOOOo.oOOOOOOO........',
  '......oOOOOOOOo.oOOOOOOOo.......',
  '......oOOOOOOOo.oOOOOOOOo.......',
  '......oooooooooo.ooooooooo......',
  '......oooooooooo.ooooooooo......',
  '......oooooooooo.ooooooooo......',
]

// SIDE_MAP — 24 cols × 56 rows — right-side facing
// Cols map front-to-back (col 6 = front of face, col 20 = back of head)
// Ear at back (cols 18-20), nose protrudes (col 5), eye at cols 7-8
const SIDE_MAP: string[] = [
  '.......HHhHhHHHHh.......',
  '......HhHhHhHhHhHH......',
  '......HHhHhHhHhHhHH.....',
  '......HHHhHhHhHhHHH.....',
  '.....SHHHHHHHHHHHHHs....',
  '.....SSSSSSSSSSSSSSd....',
  '.....SSbSSSSSSSSSSSSd...',
  '.....SaaSSSSSSSSdSSS....',
  '.....SeiSSSSSSSSSdSS....',
  '.....SlrSSSSSSSSSdSS....',
  '......MSSSSSSSSSSSSd....',
  '......nSSSSSSSSSSSSSd...',
  '......cUSSSSSSSSSSSd....',
  '.......VSSSSSSSSSSd.....',
  '........jSSSSSSSjS......',
  '.........dSSSSSdS.......',
  '..........zSSzSS........',
  '........SSwWWWWWWwS.....',
  '.......SSSwWWWWWWWwSs...',
  '......SSSSwWWWWWWWwSs...',
  '......SSSSwWWWWWWWwSs...',
  '......SSSSwWWWWWWWwSs...',
  '......SSSSwWWWWWWWwSs...',
  '......SSSSEWWWWWWWESs...',
  '......SSSSwWWWWWWwSSs...',
  '.......SSSSEEEEEESSs....',
  '........SSSSSSSSSs......',
  '........SSwWWWWwSSs.....',
  '........SSwWWWWwSSs.....',
  '..........KKKKKKKk......',
  '..........KKKKKKKk......',
  '..........KkKKKKkK......',
  '..........KkKKKKkK......',
  '..........KkKKKKkK......',
  '..........KkKKKKkK......',
  '..........KKKKKKKk......',
  '..........KKKKKKKk......',
  '..........KKKKKKKk......',
  '..........KKKKKKKk......',
  '..........KKKKKKKk......',
  '..........KKKKKKKk......',
  '..........KKKKKKKk......',
  '..........KKKKKKKk......',
  '..........KKKKKKKk......',
  '..........KKKKKKKk......',
  '..........KKKKKKKk......',
  '..........KKKKKKKk......',
  '..........KKKKKKkk......',
  '..........OOOOOOOo......',
  '..........OOOPOOOo......',
  '..........OOOOOOOo......',
  '.........oOOOOOOOo......',
  '.........oOOOOOOOo......',
  '.........ooooooooo......',
  '.........ooooooooo......',
  '.........ooooooooo......',
]

// BACK_MAP — 32 cols × 56 rows — back facing
const BACK_MAP: string[] = [
  '........HHHHhHhHhHhHhHHHH.......',
  '.......HhHhHhHhHhHhHhHhHhH......',
  '......HHhHhHhHhHhHhHhHhHhHH.....',
  '......HHHhHhHhHhHhHhHhHhHHH.....',
  '.....HHHHHHHHHHHHHHHHHHHHHHHHH..',
  '......HHHHHHHHHHHHHHHHHHHHHHh...',
  '......HHHHHHHHHHHHHHHHHHHHHHh...',
  '......HHHHHHHHHHHHHHHHHHHHHHh...',
  '......HHHHHHHHHHHHHHHHHHHHHHh...',
  '......HHHHBBBHHHHHHHHHBBBHHHHh..',
  '......HHHHHHHHHHHHHHHHHHHHHHh...',
  '......HHHHHHHHHHHHHHHHHHHHHHh...',
  '......HHHHHHHHHHHHHHHHHHHHHHh...',
  '.......dSSSSSSSSSSSSSSSSSSd.....',
  '........zzSSSSSSSSSSSSzz........',
  '..........SSSSSSSSSSSSSSs.......',
  '..........SSSSSSSSSSSSSSs.......',
  '....SSSSSSwWWWWWWWWWWWWwSSSSS...',
  '...SSSSSSwWWWWWWWWWWWWWWwSSSSSs.',
  '..SSSSSSSwWWWWWWWWWWWWWWwSSSSSSs',
  '..SSSSSSwWWWWWWWWWWWWWWWwSSSSSS.',
  '..SSSSSSwWWWWWWWWWWWWWWWwSSSSSS.',
  '..SSSSSSwWWWWWWWWWWWWWWWwSSSSSS.',
  '..SSSSSSEWWWWWWWWWWWWWWWESSSSSS.',
  '..SSSSSSEwWWWWWWWWWWWWWwESSSSSS.',
  '...SSSSSSEEEEEEEEEEEEEEESSSSSSs.',
  '....SSSSSSSSSSSSSSSSSSSSSSSSSSs.',
  '..SSSSSSSwWWWWWWWWWWWWWwSSSSSSS.',
  '..SSSSSSSwWWWWWWWWWWWWWwSSSSSSS.',
  '..........KKKKKKKKKKKKkk........',
  '..........KKKKKKKKKKKKkk........',
  '..........KkKKKKKKKKKkKk........',
  '..........KkKKKKKKKKKkKk........',
  '..........KkKKKKKKKKKkKk........',
  '..........KkKKKKKKKKKkKk........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKKk.kKKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......OOOOOOOo.oOOOOOOO........',
  '.......OOOPOOOo.oOOOPOOO........',
  '.......OOOOOOOo.oOOOOOOO........',
  '......oOOOOOOOo.oOOOOOOOo.......',
  '......oOOOOOOOo.oOOOOOOOo.......',
  '......oooooooooo.ooooooooo......',
  '......oooooooooo.ooooooooo......',
  '......oooooooooo.ooooooooo......',
]

// ─── Palette (resolved per render from skin/hair props) ───────────────────────
// All outfit colors are FIXED: white shirt, black trousers, brown shoes.

type Palette = Record<string, string | null>

function buildPalette(skinHex: string, hairHex: string): Palette {
  const sk = skinHex
  const hc = hairHex
  return {
    '.': null,
    // skin
    'S': sk,
    's': lightenHex(sk, 0.08),
    'd': darkenHex(sk, 0.10),
    'z': darkenHex(sk, 0.22),
    // hair
    'H': hc,
    'h': lightenHex(hc, 0.15),
    'B': darkenHex(hc, 0.12),
    // eyes — sclera, iris, pupil, eyelid shadow, lower lid highlight
    'e': '#F0F0F0',
    'i': '#2A5080',
    'r': '#1A0A00',
    'a': darkenHex(sk, 0.15),
    'l': lightenHex(sk, 0.10),
    // eyebrows (darkened hair)
    'b': darkenHex(hc, 0.20),
    // nose/bridge
    'M': darkenHex(sk, 0.08),
    'n': darkenHex(sk, 0.18),
    // lips
    'U': '#8B4030',
    'V': '#9B5038',
    'c': darkenHex(sk, 0.20),
    // jaw and chin shadows
    'j': darkenHex(sk, 0.12),
    // white shirt
    'W': '#F8F8F8',
    'w': '#E4E4E4',
    'E': '#C8C8C8',
    // black slim trousers
    'K': '#1C1C1C',
    'k': '#0E0E0E',
    // brown shoes
    'O': '#7A4E2D',
    'o': '#3E2518',
    'P': '#A0724F',
  }
}

// ─── Voxel types ───────────────────────────────────────────────────────────────

interface Voxel {
  x: number
  y: number
  z: number
  color: string
  topColor: string
  rightColor: string
  leftColor: string
}

function makeVoxel(x: number, y: number, z: number, color: string): Voxel {
  return {
    x, y, z, color,
    topColor: shade(color, TOP_MULT),
    rightColor: shade(color, RIGHT_MULT),
    leftColor: shade(color, LEFT_MULT),
  }
}

// ─── Parse sprite maps into 3D voxel arrays ────────────────────────────────────

function parseMap(lines: string[], pal: Palette, offsetX: number, offsetY: number, z: number): Voxel[] {
  const result: Voxel[] = []
  for (let row = 0; row < lines.length; row++) {
    const line = lines[row]
    for (let col = 0; col < line.length; col++) {
      const ch = line[col]
      if (!ch || ch === '.') continue
      const color = pal[ch]
      if (!color) continue
      result.push(makeVoxel(col + offsetX, -(row + offsetY), z, color))
    }
  }
  return result
}

// ─── Build unified voxel model ─────────────────────────────────────────────────

const MODEL_DEPTH = 12

function buildVoxelModel(pal: Palette): Voxel[] {
  const frontRows = FRONT_MAP.length
  const frontCols = FRONT_MAP[0].length
  const sideRows  = SIDE_MAP.length
  const sideCols  = SIDE_MAP[0].length
  const backRows  = BACK_MAP.length
  const backCols  = BACK_MAP[0].length

  const frontOffX = -frontCols / 2
  const backOffX  = -backCols  / 2
  const frontOffY = -frontRows / 2
  const backOffY  = -backRows  / 2
  const sideOffY  = -sideRows  / 2

  // Front plane at z = +half depth
  const frontVoxels = parseMap(FRONT_MAP, pal, frontOffX, frontOffY,  MODEL_DEPTH / 2)
  // Back plane at z  = -half depth
  const backVoxels  = parseMap(BACK_MAP,  pal, backOffX,  backOffY,  -MODEL_DEPTH / 2)

  // Side walls: each column in SIDE_MAP maps to a z position front→back
  // Right side: x = +frontCols/2, left side: x = -frontCols/2 (mirror z)
  const sideVoxelsRight: Voxel[] = []
  const sideVoxelsLeft:  Voxel[] = []
  const sideXRight = frontCols / 2
  const sideXLeft  = -frontCols / 2

  for (let row = 0; row < sideRows; row++) {
    const line = SIDE_MAP[row]
    for (let col = 0; col < line.length; col++) {
      const ch = line[col]
      if (!ch || ch === '.') continue
      const color = pal[ch]
      if (!color) continue
      const y = -(row + sideOffY)
      const z = MODEL_DEPTH / 2 - (col / sideCols) * MODEL_DEPTH
      sideVoxelsRight.push(makeVoxel(sideXRight, y,  z, color))
      sideVoxelsLeft.push( makeVoxel(sideXLeft,  y, -z, color))
    }
  }

  // ── Nose tip: extra voxel(s) at z+1 (in front of the front plane) ──────────
  // Nose tip at face center, rows 10-11 in FRONT_MAP (nose bridge area)
  // Map row r → world y = -(r + frontOffY) = -(r - frontRows/2) = frontRows/2 - r
  const noseZ  = MODEL_DEPTH / 2 + 1  // z+1 forward-offset
  const noseTipColor = pal['M'] ?? ''
  const noseExtraVoxels: Voxel[] = noseTipColor ? [
    makeVoxel(frontOffX + 15, -(10 + frontOffY), noseZ, noseTipColor),
    makeVoxel(frontOffX + 16, -(11 + frontOffY), noseZ, noseTipColor),
  ] : []

  // ── Ears: 3 voxels per ear at eye level ─────────────────────────────────────
  // Outer ear (2 voxels): skin color, x just beyond head edge, z at face level
  // Inner ear (1 voxel): darkened ~12%, same outer-x position, z-1 (recessed)
  const earSkin  = pal['S'] ?? ''
  const earInner = darkenHex(earSkin, 0.12)  // 12% darkened inner ear
  const earFaceZ = MODEL_DEPTH / 2           // front face z

  const earVoxels: Voxel[] = []
  if (earSkin) {
    // FRONT_MAP rows 9 and 10 correspond to eye level for ear outer voxels
    const eyR9 = -(9 + frontOffY)   // world y for FRONT_MAP row 9
    const eyR10 = -(10 + frontOffY) // world y for FRONT_MAP row 10
    // Left ear (3 voxels): outer x = col 8 in map coords = frontOffX + 8
    earVoxels.push(makeVoxel(frontOffX + 8, eyR9,  earFaceZ,     earSkin))   // outer top
    earVoxels.push(makeVoxel(frontOffX + 8, eyR10, earFaceZ,     earSkin))   // outer bottom
    earVoxels.push(makeVoxel(frontOffX + 8, eyR10, earFaceZ - 1, earInner))  // inner recessed z-1
    // Right ear (3 voxels): outer x = col 23 in map coords = frontOffX + 23
    earVoxels.push(makeVoxel(frontOffX + 23, eyR9,  earFaceZ,     earSkin))  // outer top
    earVoxels.push(makeVoxel(frontOffX + 23, eyR10, earFaceZ,     earSkin))  // outer bottom
    earVoxels.push(makeVoxel(frontOffX + 23, eyR10, earFaceZ - 1, earInner)) // inner recessed z-1
  }

  return [...frontVoxels, ...backVoxels, ...sideVoxelsRight, ...sideVoxelsLeft, ...noseExtraVoxels, ...earVoxels]
}

// ─── 3D rotation ───────────────────────────────────────────────────────────────

function rotateY(v: Voxel, cos: number, sin: number): Voxel {
  return { ...v, x: v.x * cos - v.z * sin, z: v.x * sin + v.z * cos }
}

function rotateX(v: Voxel, cos: number, sin: number): Voxel {
  return { ...v, y: v.y * cos - v.z * sin, z: v.y * sin + v.z * cos }
}

// ─── Projection ────────────────────────────────────────────────────────────────

const FOV = 300
const CAMERA_Z = 80
const VOXEL_SCALE = 8

interface RenderedVoxel {
  sx: number
  sy: number
  depth: number
  s: number
  topColor: string
  frontColor: string
  sideColor: string
  sideRight: boolean
  key: string
}

function projectVoxels(
  voxels: Voxel[],
  rotY: number,
  rotXAngle: number,
  cx: number,
  cy: number,
): RenderedVoxel[] {
  const cosY = Math.cos(rotY)
  const sinY = Math.sin(rotY)
  const cosX = Math.cos(rotXAngle)
  const sinX = Math.sin(rotXAngle)

  return voxels.map((v, i) => {
    const ry = rotateY(v, cosY, sinY)
    const rx = rotateX(ry, cosX, sinX)
    const perspective = FOV / (FOV + rx.z + CAMERA_Z)
    const sx = cx + rx.x * VOXEL_SCALE * perspective
    const sy = cy - rx.y * VOXEL_SCALE * perspective

    return {
      sx,
      sy,
      depth: rx.z,
      s: VOXEL_SCALE * perspective,
      topColor: v.topColor,
      frontColor: v.color,
      sideColor: rx.x > 0 ? v.rightColor : v.leftColor,
      sideRight: rx.x > 0,
      key: `${i}`,
    }
  })
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function VoxelCharacter3D({
  skinTone = 'tone-3',
  hairColor = 'dark-brown',
  outfitTier: _outfitTier = 1,
}: VoxelCharacter3DProps) {
  const { width: SW } = useWindowDimensions()
  const CH = SW * 0.65
  const cx = SW / 2
  const cy = CH / 2

  const rotYRef       = useRef(0.3)
  const rotXRef       = useRef(-0.05)
  const velocityYRef  = useRef(0)
  const velocityXRef  = useRef(0)
  const draggingRef   = useRef(false)
  const lastDxRef     = useRef(0)
  const lastDyRef     = useRef(0)
  const recentDxRef   = useRef<number[]>([])
  const recentDyRef   = useRef<number[]>([])
  const rafRef        = useRef<number | null>(null)
  const idleRafRef    = useRef<number | null>(null)
  const [, setTick]   = useState(0)
  const runInertiaRef = useRef<(() => void) | null>(null)
  const startIdleRef  = useRef<(() => void) | null>(null)

  const skinHex = SKIN_TONES[skinTone] ?? SKIN_TONES['tone-3']
  const hairHex = HAIR_COLORS[hairColor] ?? HAIR_COLORS['dark-brown']

  const palRef    = useRef<Palette>(buildPalette(skinHex, hairHex))
  const voxelsRef = useRef<Voxel[]>(buildVoxelModel(palRef.current))

  useEffect(() => {
    palRef.current    = buildPalette(skinHex, hairHex)
    voxelsRef.current = buildVoxelModel(palRef.current)
    setTick(t => t + 1)
  }, [skinHex, hairHex])

  const redraw = useCallback(() => { setTick(t => t + 1) }, [])

  const stopAll = useCallback(() => {
    if (rafRef.current     !== null) { cancelAnimationFrame(rafRef.current);     rafRef.current     = null }
    if (idleRafRef.current !== null) { cancelAnimationFrame(idleRafRef.current); idleRafRef.current = null }
  }, [])

  const startIdleRotate = useCallback(() => {
    if (idleRafRef.current !== null) return
    const step = () => {
      if (draggingRef.current) { idleRafRef.current = null; return }
      rotYRef.current += 0.005
      redraw()
      idleRafRef.current = requestAnimationFrame(step)
    }
    idleRafRef.current = requestAnimationFrame(step)
  }, [redraw])

  const runInertia = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    const step = () => {
      if (draggingRef.current) { rafRef.current = null; return }
      velocityYRef.current *= 0.93
      velocityXRef.current *= 0.93
      rotYRef.current      += velocityYRef.current
      rotXRef.current       = Math.max(-0.4, Math.min(0.3, rotXRef.current + velocityXRef.current))
      redraw()
      if (Math.abs(velocityYRef.current) < 0.001 && Math.abs(velocityXRef.current) < 0.001) {
        velocityYRef.current = 0
        velocityXRef.current = 0
        rafRef.current       = null
        startIdleRotate()
        return
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }, [redraw, startIdleRotate])

  useEffect(() => {
    startIdleRotate()
    return () => { stopAll() }
  }, [startIdleRotate, stopAll])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        draggingRef.current   = true
        lastDxRef.current     = 0
        lastDyRef.current     = 0
        recentDxRef.current   = []
        recentDyRef.current   = []
        if (rafRef.current     !== null) { cancelAnimationFrame(rafRef.current);     rafRef.current     = null }
        if (idleRafRef.current !== null) { cancelAnimationFrame(idleRafRef.current); idleRafRef.current = null }
        velocityYRef.current  = 0
        velocityXRef.current  = 0
      },
      onPanResponderMove: (_, gs) => {
        const dy = (gs.dx - lastDxRef.current) * 0.012
        const dx = (gs.dy - lastDyRef.current) * 0.010
        lastDxRef.current = gs.dx
        lastDyRef.current = gs.dy
        recentDxRef.current.push(dy)
        recentDyRef.current.push(dx)
        if (recentDxRef.current.length > 3) recentDxRef.current.shift()
        if (recentDyRef.current.length > 3) recentDyRef.current.shift()
        rotYRef.current += dy
        rotXRef.current  = Math.max(-0.4, Math.min(0.3, rotXRef.current + dx))
        setTick(t => t + 1)
      },
      onPanResponderRelease: () => {
        draggingRef.current  = false
        const ry = recentDxRef.current
        const rx = recentDyRef.current
        velocityYRef.current = ry.length > 0 ? ry.reduce((a, b) => a + b, 0) / ry.length : 0
        velocityXRef.current = rx.length > 0 ? rx.reduce((a, b) => a + b, 0) / rx.length : 0
        runInertiaRef.current?.()
      },
      onPanResponderTerminate: () => {
        draggingRef.current  = false
        velocityYRef.current = 0
        velocityXRef.current = 0
        startIdleRef.current?.()
      },
    }),
  ).current

  // Keep refs pointing to latest function versions each render
  runInertiaRef.current = runInertia
  startIdleRef.current  = startIdleRotate

  const rendered = projectVoxels(voxelsRef.current, rotYRef.current, rotXRef.current, cx, cy)
  // Painter's algorithm: far (most negative z) drawn first so near voxels occlude them
  rendered.sort((a, b) => b.depth - a.depth)

  return (
    <View style={{ width: SW, height: CH }} {...panResponder.panHandlers}>
      <Svg width={SW} height={CH}>
        {rendered.map((v) => {
          const { sx, sy, s, topColor, frontColor, sideColor, sideRight } = v
          const half  = s / 2
          const topH  = s * 0.38
          const sideW = s * 0.25
          return (
            <G key={v.key}>
              <Rect x={sx - half}                            y={sy - half - topH} width={s}     height={topH}    fill={topColor}   />
              <Rect x={sx - half}                            y={sy - half}        width={s}     height={s}       fill={frontColor} />
              <Rect x={sideRight ? sx + half : sx - half - sideW} y={sy - half - topH} width={sideW} height={s + topH} fill={sideColor}  />
            </G>
          )
        })}
      </Svg>
    </View>
  )
}
