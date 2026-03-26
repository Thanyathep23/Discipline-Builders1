import React, { useRef, useEffect, useState } from 'react'
import { PanResponder, useWindowDimensions, View, Animated, Easing } from 'react-native'
import Svg, { Rect, G, Ellipse, Defs, RadialGradient, LinearGradient, Stop } from 'react-native-svg'

export interface VoxelCharacter3DProps {
  skinTone?: string
  hairColor?: string
  outfitTier?: number
}

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

function brightnessAdjust(hex: string, factor: number): string {
  return shade(hex, factor)
}

// ─── Three-point lighting ──────────────────────────────────────────────────────

const TOP_MULT    = 1.40
const FRONT_MULT  = 1.00
const LEFT_MULT   = 0.78
const RIGHT_MULT  = 0.62

function applyThreePointLight(nx: number, ny: number, nz: number): number {
  const keyDir   = { x: -0.6, y:  0.8, z: 0.5 }
  const fillDir  = { x:  0.8, y:  0.1, z: 0.3 }
  const rimDir   = { x:  0.0, y:  0.0, z: -1.0 }

  const keyLen  = Math.sqrt(keyDir.x**2  + keyDir.y**2  + keyDir.z**2)
  const fillLen = Math.sqrt(fillDir.x**2 + fillDir.y**2 + fillDir.z**2)

  const keyDot  = Math.max(0, (nx * keyDir.x  + ny * keyDir.y  + nz * keyDir.z)  / keyLen)
  const fillDot = Math.max(0, (nx * fillDir.x + ny * fillDir.y + nz * fillDir.z) / fillLen)
  const rimDot  = Math.max(0, (nx * rimDir.x  + ny * rimDir.y  + nz * rimDir.z))

  const combined = keyDot * 1.20 + fillDot * 0.25 + rimDot * 0.10 + 0.25
  return Math.max(0.25, Math.min(1.40, combined))
}

// ─── Sprite maps ───────────────────────────────────────────────────────────────

const FRONT_MAP_BASE: string[] = [
  '..........HhHhHhHhHhHh..........',
  '.........HhHhHhHhHhHhHH.........',
  '.........hHhHhHhHhHhHhH.........',
  '.........HHhHhHhHhHhHHH.........',
  '.........SHhHhHhHhHhHhs.........',
  '.........SSSSSSSSSSSSSs.........',
  '.........SSSSSbSSbSSSSS.........',
  '.........SSSbbSSSSbbSSS.........',
  '.........dSSSaaSSaaSSSd.........',
  '.........dSSSeiSSieSSSd.........',
  '..............dSSSSd............',
  '..............dSSSSd............',
  '....SSSSSSCCCCCCCCCCCCCCSSSSSs..',
  '...SSSSSSwCCCCCCCCCCCCCCwSSSSSs.',
  '..SSSSSSSwWFWWWWWWWWWWFWwSSSSSSs',
  '..SSSSSSwWWFWWTWWWWWWFWWwSSSSSS.',
  '..SSSSSSwWWFWWTWWWWWWFWWwSSSSSS.',
  '..SSSSSSwWWFWWTTWWWWWFWWwSSSSSS.',
  '..SSSSSSEWWFWWTTWWWWWFWWESSSSSSs',
  '..SSSSSSEwWFWWTTWWWWWFWwESSSSSSs',
  '....SSSSSSEEFEEEEEEEEEFEESSSSSSs',
  '..vvSSSSSSSSSSSSSSSSSSSSSSSSSss.',
  '..vvSSSSSwWWWWWWWWWWWWWwSSSSSSS.',
  '..SSSSSSSEEEEEEEEEEEEEEESSSSSSSs',
  '..SSSSSSSEEEEEEEEEEEEEEESSSSSSSs',
  '....SSSSSSSSSSSSSSSSSSSSSSSSSS..',
  '..........XXXXXGGGXXXXX.........',
  '..........XXXXXGGGXXXXx.........',
  '..........AAQAAAAAQAAAAAK.......',
  '..........AAAAAAAAAAAAAAAK......',
  '..........AAQAAAAAQAAAAAQAKK....',
  '..........KJKKKKKKKKKJKKkk......',
  '..........KJKKKKKKKKKJKKkk......',
  '.......KKKKJKKKk.kKKKJKKK.......',
  '.......KKKKJKKKk.kKKKJKKK.......',
  '.......KKQKJKKKk.kKKKJKKK.......',
  '.......KKQKJKKKk.kKKKJKKK.......',
  '.......KKKKJKKKk.kKKKJKKK.......',
  '.......KKKKJKKKk.kKKKJKKK.......',
  '.......KKKKJKKKk.kKKKJKKK.......',
  '.......KKKKJKKKk.kKKKJKKK.......',
  '.......KKKKJKKKk.kKKKJKKK.......',
  '.......KKKKJKKKk.kKKKJKKK.......',
  '.......KKKKJKKKk.kKKKJKKK.......',
  '.......KKKKJKKKk.kKKKJKKK.......',
  '.......KKKKJKKKk.kKKKJKKK.......',
  '.......KKKKJKKKk.kKKKJKKK.......',
  '.......KKKKJKKKk.kKKKJKKK.......',
  '.......KKKKJKKKk.kKKKJKKK.......',
  '.......KKKKkKKKk.kKKKkKKK.......',
  '.......KkKKKKKKk.kKKKKKkK.......',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKkk...kkKKKK.........',
  '........KKKKkk...kkKKKK.........',
  '........PPPPPPo...oPPPPPP.......',
  '.......OOOOOOOo...oOOOOOOO......',
  '.......OOPOOOOo...oOOOOPOO......',
  '.......OOOOOOOo...oOOOOOOO......',
  '......oOOOOOOOo...oOOOOOOOo.....',
  '......oOOOOOOOo...oOOOOOOOo.....',
  '......NNNNNNNNq...qNNNNNNNNq....',
  '......RRRRRRRRp...pRRRRRRRRp....',
  '......oooooooooo..oooooooooo....',
  '......oooooooooo..oooooooooo....',
  '.....ooooooooooo..ooooooooooo...',
  '.....ooooooooooo..ooooooooooo...',
  '.....ooooooooooo..ooooooooooo...',
]

const FRONT_MAP_WATCH: string[] = [
  ...FRONT_MAP_BASE.slice(0, 25),
  '...SSSSSSEEFEEEEEEEEEFEEuuuuss.',  // 25 watch strap visible (u)
  '..vvSSSSSSSSSSSSSSSSSSSSSYYuuss',  // 26 bracelet (vv) + watch face Y + strap (uu)
  '..vvSSSSSwWWWWWWWWWWWWWwSYYuuSs',  // 27 bracelet (vv) + watch lower
  ...FRONT_MAP_BASE.slice(28),
]

const SIDE_MAP_BASE: string[] = [
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
  '........SSSSSSSS........',
  '........SSSSSSSS........',
  '........SSCCCCCCCSs.....',
  '.......SSSCCCCCCCCSs....',
  '......SSSSwWFWWWWWwSs...',
  '......SSSSwWFWWWWWwSs...',
  '......SSSSwWFWWWWWwSs...',
  '......SSSSwWFWWWWWwSs...',
  '......SSSSEWFWWWWWESs...',
  '......SSSSwWFWWWWwSSs...',
  '.......SSSSEFEEEEESSs...',
  '........SSSSSSSSSs......',
  '........vvwWWWWwSSs.....',
  '........SEEEEEEESSs.....',
  '........SEEEEEEESSs.....',
  '.........SSSSSSSSs......',
  '..........XXXXXXXx......',
  '..........XXXXXXXx......',
  '..........AAAAAAAk......',
  '..........AAAAAAAk......',
  '..........AAQAAAAk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKKk......',
  '..........KJKKKKkk......',
  '..........KKJKKKkk......',
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
  '..........KKKKKKKk......',
  '..........KKKKKKKk......',
  '..........KKKKKKkk......',
  '..........KKKKKKkk......',
  '.........PPPPPPPPo......',
  '.........OOOOOOOOo......',
  '.........OOPOOOOOo......',
  '.........OOOOOOOOo......',
  '........oOOOOOOOOo......',
  '........oOOOOOOOOo......',
  '........NNNNNNNNNq......',
  '........RRRRRRRRRp......',
  '........ooooooooooo.....',
  '........ooooooooooo.....',
  '.......oooooooooooo.....',
  '.......oooooooooooo.....',
  '.......oooooooooooo.....',
]

const SIDE_MAP_WATCH: string[] = [
  ...SIDE_MAP_BASE.slice(0, 25),
  '.......SSSSuuuuESSs.....',  // 25 watch strap (u) visible side
    '........SSSuYYuSs......',   // 26 watch face Y + strap
    '........vvwuYYuSs.....',    // 27 bracelet (vv) + watch lower
  ...SIDE_MAP_BASE.slice(28),
]

const BACK_MAP: string[] = [
  '..........HhHhHhHhHhHh..........',
  '.........HhHhHhHhHhHhHH.........',
  '.........hHhHhHhHhHhHhH.........',
  '.........HHhHhHhHhHhHHH.........',
  '.........HHhHhHhHhHhHHH.........',
  '.........HHHHHHHHHHHHHh.........',
  '.........HHHHHHHHHHHHHh.........',
  '.........HHHHBBBHHHBBBHh........',
  '.........HHHHHHHHHHHHHh.........',
  '..........dSSSSSSSSSSSSd........',
  '..............dSSSSd............',
  '..............dSSSSd............',
  '..SSwWWWWWWWWWWWWWWWWWWWWWWwSS..',
  '.SSSwWWWWWWWWWWWWWWWWWWWWWWwSSS.',
  'SSSSSwWWWWWWWWWWWWWWWWWWWWwSSSSS',
  'SSSSSwWWWWWWWWWWWWWWWWWWWWwSSSSS',
  '.SSSSwWWWWWWWWWWWWWWWWWWWWwSSSS.',
  '.SSSSEWWWWWWWWWWWWWWWWWWWWwSSSS.',
  '..SSSEwWWWWWWWWWWWWWWWWWWEwSSS..',
  '...SSEwWWWWWWWWWWWWWWWWWWEwSS...',
  '...SSEEEEEEEEEEEEEEEEEEEEEESS...',
  '....SSSSSSSSSSSSSSSSSSSSSSsS....',
  '..SSSwWWWWWWWWWWWWWWWWWWWWwSSS..',
  '..SSSwWWWWWWWWWWWWWWWWWWWWwSSS..',
  '..SSSEEEEEEEEEEEEEEEEEEEEEESSS..',
  '....SSSSSSSSSSSSSSSSSSSSSSSS....',
  '..SS........................SS..',
  '..SS........................SS..',
  '.SSss......................ssSS.',
  '.dSSd......................dSSd.',
  '..dSd......................dSd..',
  '..........KKKKKKKKKKKKkk........',
  '..........KKKKKKKKKKKKkk........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKKKKKkk.kkKKKKKK........',
  '.......KKkKKKKk.kKKKKkKK........',
  '.......KkKKKKKk.kKKKKKkK........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKKk...kKKKKK.........',
  '........KKKKkk...kkKKKK.........',
  '........KKKKkk...kkKKKK.........',
  '........PPPPPPo...oPPPPPP.......',
  '.......OOOOOOOo...oOOOOOOO......',
  '.......OOOOOOOo...oOOOOOOO......',
  '......oOOOOOOOo...oOOOOOOOo.....',
  '......oOOOOOOOo...oOOOOOOOo.....',
  '......oooooooooo..ooooooooooo...',
  '......oooooooooo..ooooooooooo...',
  '.....ooooooooooo..oooooooooooo..',
  '.....ooooooooooo..oooooooooooo..',
  '.....ooooooooooo..oooooooooooo..',
  '.....ooooooooooo..oooooooooooo..',
]

// ─── Palette ───────────────────────────────────────────────────────────────────

type Palette = Record<string, string | null>

function buildPalette(skinHex: string, hairHex: string): Palette {
  const sk = skinHex
  const hc = hairHex
  return {
    '.': null,
    'S': sk,
    's': lightenHex(sk, 0.08),
    'd': darkenHex(sk, 0.10),
    'z': darkenHex(sk, 0.22),
    'H': hc,
    'h': lightenHex(hc, 0.15),
    'B': darkenHex(hc, 0.12),
    'e': '#F0F0F0',
    'i': '#2A5080',
    'r': '#1A0A00',
    'a': darkenHex(sk, 0.15),
    'l': lightenHex(sk, 0.10),
    'b': darkenHex(hc, 0.20),
    'M': darkenHex(sk, 0.08),
    'n': darkenHex(sk, 0.18),
    'U': '#8B4030',
    'V': '#9B5038',
    'c': darkenHex(sk, 0.20),
    'j': darkenHex(sk, 0.12),
    'W': '#F8F8F8',
    'w': '#E4E4E4',
    'E': '#C8C8C8',
    'C': '#EDE8E0',
    'F': '#D8D8D8',
    'K': '#18181F',
    'k': '#0E0E0E',
    'J': '#2E2E2E',
    'Q': '#080808',
    'A': '#141414',
    'O': '#7A4E2D',
    'o': '#3E2518',
    'P': '#A0724F',
    'N': '#B8967A',
    'q': '#9E7A60',
    'R': '#1A1A1A',
    'p': '#0A0A0A',
    'X': '#1A0E05',
    'x': '#100805',
    'G': '#C8A850',
    'T': '#A8A8B0',
    'v': '#6B3A1F',
    'u': '#2C1A0E',
    'Y': '#1C3A5C',
  }
}

interface Voxel {
  x: number
  y: number
  z: number
  color: string
  topColor: string
  rightColor: string
  leftColor: string
  mapChar?: string
  mapRow?: number
  mapCol?: number
}

function makeVoxel(
  x: number, y: number, z: number, color: string,
  mapChar?: string, mapRow?: number, mapCol?: number
): Voxel {
  return {
    x, y, z, color,
    topColor:   shade(color, TOP_MULT),
    rightColor: shade(color, RIGHT_MULT),
    leftColor:  shade(color, LEFT_MULT),
    mapChar,
    mapRow,
    mapCol,
  }
}

// ─── Face-region shading ───────────────────────────────────────────────────────

function applyFaceShading(color: string, mapChar: string, mapRow: number, mapCol: number): string {
  const isSkin = mapChar === 'S' || mapChar === 's' || mapChar === 'd' || mapChar === 'z'
  if (!isSkin || mapRow > 16) return color

  if (mapRow >= 4 && mapRow <= 6) {
    return brightnessAdjust(color, 1.08)
  }
  if (mapRow === 7 || mapRow === 8) {
    if (mapCol >= 6 && mapCol <= 12) return brightnessAdjust(color, 0.88)
    if (mapCol >= 18 && mapCol <= 24) return brightnessAdjust(color, 0.88)
  }
  if (mapRow === 10) {
    return brightnessAdjust(color, 0.82)
  }
  if (mapRow >= 13 && mapRow <= 14) {
    return brightnessAdjust(color, 0.85)
  }
  if (mapRow >= 9 && mapRow <= 12) {
    if (mapCol <= 8 || mapCol >= 24) return brightnessAdjust(color, 1.05)
  }
  return color
}

// ─── Clothing shading zones ───────────────────────────────────────────────────

function applyClothingZone(
  color: string, mapChar: string, mapRow: number, mapCol: number,
  totalCols: number
): string {
  if (mapChar === 'W' || mapChar === 'w' || mapChar === 'E') {
    const center = totalCols / 2
    const distFromCenter = Math.abs(mapCol - center)
    const relDist = distFromCenter / (totalCols / 2)

    if (mapChar === 'E') return '#BCBCBC'

    if (mapChar === 'w') {
      if (relDist > 0.6) return '#C8C8C8'
      return '#D8D8D8'
    }

    if (relDist < 0.2) return '#F8F8F8'
    if (relDist < 0.5) return '#F0F0F0'
    return '#D8D8D8'
  }

  if (mapChar === 'K' || mapChar === 'k') {
    const center = totalCols / 2
    const distFromCenter = Math.abs(mapCol - center)
    const relDist = distFromCenter / (totalCols / 2)

    if (mapChar === 'k') {
      if (relDist > 0.5) return '#060608'
      return '#0C0C12'
    }

    if (mapRow >= 29 && mapRow <= 34) {
      if (relDist < 0.35) return '#2A2A3A'
    }
    if (relDist < 0.5) return '#18181F'
    return '#0C0C12'
  }

  return color
}

// ─── Ambient occlusion simulation ────────────────────────────────────────────

function applyAmbientOcclusion(
  color: string, mapChar: string, mapRow: number, mapCol: number,
  totalCols: number
): string {
  const center = totalCols / 2
  const distFromCenter = Math.abs(mapCol - center)

  if (mapRow === 17 && (mapChar === 'S' || mapChar === 's' || mapChar === 'W' || mapChar === 'w')) {
    if (distFromCenter < 4) return darkenHex(color, 0.15)
  }

  if ((mapRow === 23 || mapRow === 24) && (mapChar === 'E' || mapChar === 'w' || mapChar === 'W')) {
    if (distFromCenter > totalCols * 0.3) return darkenHex(color, 0.20)
  }

  if ((mapRow === 25 || mapRow === 26) && mapChar === 'E') {
    return darkenHex(color, 0.12)
  }

  if ((mapRow === 29 || mapRow === 30) && (mapChar === 'K' || mapChar === 'k')) {
    if (distFromCenter < 3) return darkenHex(color, 0.25)
  }

  if (mapRow >= 40 && mapRow <= 44 && (mapChar === 'K' || mapChar === 'k')) {
    if (distFromCenter > totalCols * 0.15 && distFromCenter < totalCols * 0.35) {
      return darkenHex(color, 0.15)
    }
  }

  if (mapRow >= 47 && mapRow <= 51 && (mapChar === 'O' || mapChar === 'o' || mapChar === 'K' || mapChar === 'k')) {
    if (distFromCenter > totalCols * 0.2) return darkenHex(color, 0.10)
  }

  return color
}

// ─── Parse sprite maps into 3D voxel arrays ────────────────────────────────────

function parseMap(
  lines: string[], pal: Palette, offsetX: number, offsetY: number, z: number
): Voxel[] {
  const result: Voxel[] = []
  const totalCols = lines[0]?.length ?? 32
  for (let row = 0; row < lines.length; row++) {
    const line = lines[row]
    for (let col = 0; col < line.length; col++) {
      const ch = line[col]
      if (!ch || ch === '.') continue
      const baseColor = pal[ch]
      if (!baseColor) continue

      let color = applyFaceShading(baseColor, ch, row, col)
      color = applyClothingZone(color, ch, row, col, totalCols)
      color = applyAmbientOcclusion(color, ch, row, col, totalCols)

      result.push(makeVoxel(col + offsetX, -(row + offsetY), z, color, ch, row, col))
    }
  }
  return result
}

const MODEL_DEPTH = 12

function buildVoxelModel(pal: Palette, outfitTier: number): Voxel[] {
  const frontMap = outfitTier >= 2 ? FRONT_MAP_WATCH : FRONT_MAP_BASE
  const sideMap  = outfitTier >= 2 ? SIDE_MAP_WATCH  : SIDE_MAP_BASE

  const frontRows = frontMap.length
  const frontCols = frontMap[0].length
  const sideRows  = sideMap.length
  const sideCols  = sideMap[0].length
  const backRows  = BACK_MAP.length
  const backCols  = BACK_MAP[0].length

  const frontOffX = -frontCols / 2
  const backOffX  = -backCols  / 2
  const frontOffY = -frontRows / 2
  const backOffY  = -backRows  / 2
  const sideOffY  = -sideRows  / 2

  const frontVoxels = parseMap(frontMap, pal, frontOffX, frontOffY,  MODEL_DEPTH / 2)
  const backVoxels  = parseMap(BACK_MAP,  pal, backOffX,  backOffY,  -MODEL_DEPTH / 2)

  const sideVoxelsRight: Voxel[] = []
  const sideVoxelsLeft:  Voxel[] = []
  const sideXRight = frontCols / 2
  const sideXLeft  = -frontCols / 2

  for (let row = 0; row < sideRows; row++) {
    const line = sideMap[row]
    const totalCols = line.length
    for (let col = 0; col < line.length; col++) {
      const ch = line[col]
      if (!ch || ch === '.') continue
      const baseColor = pal[ch]
      if (!baseColor) continue

      let color = applyFaceShading(baseColor, ch, row, col)
      color = applyClothingZone(color, ch, row, col, totalCols)
      color = applyAmbientOcclusion(color, ch, row, col, totalCols)

      const y = -(row + sideOffY)
      const z = MODEL_DEPTH / 2 - (col / sideCols) * MODEL_DEPTH
      sideVoxelsRight.push(makeVoxel(sideXRight, y,  z, color, ch, row, col))
      sideVoxelsLeft.push( makeVoxel(sideXLeft,  y, -z, color, ch, row, col))
    }
  }

  const noseZ  = MODEL_DEPTH / 2 + 1
  const noseTipColor = pal['M'] ?? ''
  const noseExtraVoxels: Voxel[] = noseTipColor ? [
    makeVoxel(frontOffX + 15, -(10 + frontOffY), noseZ, noseTipColor),
    makeVoxel(frontOffX + 16, -(11 + frontOffY), noseZ, noseTipColor),
  ] : []

  const earSkin  = pal['S'] ?? ''
  const earInner = darkenHex(earSkin, 0.12)
  const earFaceZ = MODEL_DEPTH / 2

  const earVoxels: Voxel[] = []
  if (earSkin) {
    const eyR9  = -(9  + frontOffY)
    const eyR10 = -(10 + frontOffY)
    earVoxels.push(makeVoxel(frontOffX + 8,  eyR9,  earFaceZ,     earSkin))
    earVoxels.push(makeVoxel(frontOffX + 8,  eyR10, earFaceZ,     earSkin))
    earVoxels.push(makeVoxel(frontOffX + 8,  eyR10, earFaceZ - 1, earInner))
    earVoxels.push(makeVoxel(frontOffX + 23, eyR9,  earFaceZ,     earSkin))
    earVoxels.push(makeVoxel(frontOffX + 23, eyR10, earFaceZ,     earSkin))
    earVoxels.push(makeVoxel(frontOffX + 23, eyR10, earFaceZ - 1, earInner))
  }

  return [...frontVoxels, ...backVoxels, ...sideVoxelsRight, ...sideVoxelsLeft, ...noseExtraVoxels, ...earVoxels]
}

function rotateY(v: Voxel, cos: number, sin: number): Voxel {
  return { ...v, x: v.x * cos - v.z * sin, z: v.x * sin + v.z * cos }
}

function rotateX(v: Voxel, cos: number, sin: number): Voxel {
  return { ...v, y: v.y * cos - v.z * sin, z: v.y * sin + v.z * cos }
}

const FOV = 300
const CAMERA_Z = 80
const VOXEL_SCALE = 8

// Approximate row boundaries for body regions (FRONT_MAP rows):
// Head: rows 0–16   → voxel y range after offset
// Torso: rows 17–28
// Hips: rows 29–33
// Arms: x outside body width (~cols 0–7 and 25–31 in front map, frontCols=32)
// We classify by original mapRow stored in voxel

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

interface AnimState {
  breathPhase: number     // 0..2π
  headYaw: number         // head yaw offset in radians
  hipTilt: number         // hip tilt offset
  armSwingL: number       // arm swing left
  armSwingR: number       // arm swing right
  spotlightOpacity: number
  time: number            // elapsed time in seconds
  idlePauseUntil: number  // timestamp ms when idle pause ends
  idlePhase: number       // 0..2π for idle rotate cycle
}

function projectVoxels(
  voxels: Voxel[],
  rotY: number,
  rotXAngle: number,
  cx: number,
  cy: number,
  anim: AnimState,
): RenderedVoxel[] {
  const cosY = Math.cos(rotY)
  const sinY = Math.sin(rotY)
  const cosX = Math.cos(rotXAngle)
  const sinX = Math.sin(rotXAngle)

  // Head yaw rotation matrix components
  const cosHY = Math.cos(anim.headYaw)
  const sinHY = Math.sin(anim.headYaw)

  return voxels.map((v, i) => {
    let vx = v.x
    let vy = v.y
    let vz = v.z

    const row = v.mapRow ?? -1

    // Breathing: chest/head rise on y (rows 0-28)
    if (row >= 0 && row <= 28) {
      const breathAmt = row <= 16 ? 0.45 : 0.25 // head moves more than chest
      vy += Math.sin(anim.breathPhase) * breathAmt
    }

    // Head yaw: rotate head voxels (rows 0-16) around Y axis
    if (row >= 0 && row <= 16) {
      const nx = vx * cosHY - vz * sinHY
      const nz = vx * sinHY + vz * cosHY
      vx = nx
      vz = nz
    }

    // Hip tilt: slight y offset for hips (rows 29-33)
    if (row >= 29 && row <= 33) {
      vy += anim.hipTilt * vx * 0.05
    }

    // Arm swing: x outside body center (cols 0-7 left arm, cols 25+ right arm for 32-col map)
    const col = v.mapCol ?? 16
    const isLeftArm  = col <= 7  && row >= 17 && row <= 28
    const isRightArm = col >= 25 && row >= 17 && row <= 28
    if (isLeftArm) {
      vy += Math.sin(anim.armSwingL) * 0.3
    }
    if (isRightArm) {
      vy += Math.sin(anim.armSwingR) * 0.3
    }

    // Now apply world rotations
    const rxv: Voxel = { ...v, x: vx, y: vy, z: vz,
      topColor: v.topColor, rightColor: v.rightColor, leftColor: v.leftColor }
    const ry = rotateY(rxv, cosY, sinY)
    const rx = rotateX(ry, cosX, sinX)
    const perspective = FOV / (FOV + rx.z + CAMERA_Z)
    const sx = cx + rx.x * VOXEL_SCALE * perspective
    const sy = cy - rx.y * VOXEL_SCALE * perspective

    const topLightFactor  = applyThreePointLight(0, 1, 0)
    const sideLightFactor = rx.x > 0
      ? applyThreePointLight(1, 0, 0) * 0.9
      : applyThreePointLight(-1, 0, 0)

    return {
      sx,
      sy,
      depth: rx.z,
      s: VOXEL_SCALE * perspective,
      topColor:   shade(v.topColor,   topLightFactor / TOP_MULT),
      frontColor: v.color,
      sideColor:  shade(rx.x > 0 ? v.rightColor : v.leftColor, sideLightFactor),
      sideRight: rx.x > 0,
      key: `${i}`,
    }
  })
}

// ─── Particle types ────────────────────────────────────────────────────────────

interface Particle {
  id: number
  angle: number
  distance: number
  color: string
  anim: Animated.Value
  translateX: Animated.Value
  translateY: Animated.Value
}

const PARTICLE_COLORS = ['#FFD700', '#FFA500', '#FF6B35', '#FFE066', '#FFFACD', '#F4C430']

// ─── Idle rotate speed curve ───────────────────────────────────────────────────
// Returns angular speed (rad/frame) based on current angle mod 2π.
// Slows near 0°, 90° (π/2), 270° (3π/2) using a sin-blend.

function idleSpeed(rotY: number): number {
  const twoPi = Math.PI * 2
  const a = ((rotY % twoPi) + twoPi) % twoPi
  // Pause angles: 0, π/2, 3π/2  — use cos(2a) to get minima at these points
  // Blend between 0.001 (min) and 0.008 (max)
  const blend = (1 + Math.cos(2 * a)) / 2   // 1 at 0,π → 0 at π/2,3π/2
  // Actually we want slow at 0, π/2, 3π/2 — use different approach:
  // slow zones at 0 (front), π/2 (side R), 3π/2 (side L)
  const d0   = Math.min(Math.abs(a),       Math.abs(a - twoPi))
  const d90  = Math.abs(a - Math.PI / 2)
  const d270 = Math.abs(a - 3 * Math.PI / 2)
  const minD = Math.min(d0, d90, d270)
  // Speed: 0.002 near pause zones, 0.007 elsewhere, smooth transition over 0.3 rad
  const t = Math.min(1, minD / 0.35)
  return 0.002 + 0.005 * t
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function VoxelCharacter3D({
  skinTone = 'tone-3',
  hairColor = 'dark-brown',
  outfitTier = 1,
}: VoxelCharacter3DProps) {
  const { width: SW } = useWindowDimensions()
  const CH = SW * 0.65
  const cx = SW / 2
  const cy = CH / 2

  // ── Rotation state ──────────────────────────────────────────────────────────
  const rotYRef      = useRef(0.3)
  const rotXRef      = useRef(-0.05)
  const velocityYRef = useRef(0)
  const velocityXRef = useRef(0)
  const draggingRef  = useRef(false)
  const lastDxRef    = useRef(0)
  const lastDyRef    = useRef(0)
  const recentDxRef  = useRef<number[]>([])
  const recentDyRef  = useRef<number[]>([])

  // ── Master rAF ─────────────────────────────────────────────────────────────
  const masterRafRef = useRef<number | null>(null)
  const [, setTick]  = useState(0)

  // ── Animation state ref (single shared state for master loop) ───────────────
  const animRef = useRef<AnimState>({
    breathPhase:      0,
    headYaw:          0,
    hipTilt:          0,
    armSwingL:        0,
    armSwingR:        Math.PI * 0.6, // out of phase
    spotlightOpacity: 0.035,
    time:             0,
    idlePauseUntil:   0,
    idlePhase:        0,
  })

  // ── Idle / inertia mode ─────────────────────────────────────────────────────
  const inertiaActiveRef = useRef(false)
  const idleActiveRef    = useRef(false)

  // ── Mount entry animation (Animated API) ───────────────────────────────────
  const entryOpacity = useRef(new Animated.Value(0)).current
  const entryScale   = useRef(new Animated.Value(0.85)).current
  const spotlightAnim = useRef(new Animated.Value(0.035)).current

  // ── Drag scale pulse (Animated API) ───────────────────────────────────────
  const scaleAnim = useRef(new Animated.Value(1)).current

  // ── Particles state ────────────────────────────────────────────────────────
  const [particles, setParticles] = useState<Particle[]>([])
  const particleIdRef = useRef(0)

  // ── Outfit tier previous ref for tier-up detection ─────────────────────────
  const prevTierRef = useRef(outfitTier)

  // ── Voxel model ────────────────────────────────────────────────────────────
  const skinHex = SKIN_TONES[skinTone] ?? SKIN_TONES['tone-3']
  const hairHex = HAIR_COLORS[hairColor] ?? HAIR_COLORS['dark-brown']

  const palRef    = useRef<Palette>(buildPalette(skinHex, hairHex))
  const voxelsRef = useRef<Voxel[]>(buildVoxelModel(palRef.current, outfitTier))

  useEffect(() => {
    palRef.current    = buildPalette(skinHex, hairHex)
    voxelsRef.current = buildVoxelModel(palRef.current, outfitTier)
    setTick(t => t + 1)
  }, [skinHex, hairHex, outfitTier])

  // ── Mount entry animation ──────────────────────────────────────────────────
  useEffect(() => {
    // Spin one full revolution over 1.2s
    const startTime = Date.now()
    const startAngle = rotYRef.current
    const spinDuration = 1200
    const spinInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      if (elapsed >= spinDuration) {
        rotYRef.current = startAngle + Math.PI * 2
        clearInterval(spinInterval)
        return
      }
      const t = elapsed / spinDuration
      rotYRef.current = startAngle + Math.PI * 2 * t
    }, 16)

    // Fade + scale in over 600ms ease-out
    Animated.parallel([
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(entryScale, {
        toValue: 1.0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()

    return () => clearInterval(spinInterval)
  }, [])

  // ── Tier-up celebration ────────────────────────────────────────────────────
  useEffect(() => {
    if (outfitTier > prevTierRef.current) {
      prevTierRef.current = outfitTier

      // Spawn 8–12 particles
      const count = 8 + Math.floor(Math.random() * 5)
      const newParticles: Particle[] = Array.from({ length: count }, (_, i) => {
        const angle    = (Math.PI * 2 * i) / count + Math.random() * 0.5
        const distance = 40 + Math.random() * 60
        const color    = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
        const animVal  = new Animated.Value(1)
        const tx       = new Animated.Value(0)
        const ty       = new Animated.Value(0)
        return {
          id: particleIdRef.current++,
          angle,
          distance,
          color,
          anim: animVal,
          translateX: tx,
          translateY: ty,
        }
      })

      setParticles(newParticles)

      // Animate all particles: fly out + fade over 1s
      const animations = newParticles.map(p =>
        Animated.parallel([
          Animated.timing(p.anim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(p.translateX, {
            toValue: Math.cos(p.angle) * p.distance,
            duration: 1000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(p.translateY, {
            toValue: Math.sin(p.angle) * p.distance,
            duration: 1000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )

      Animated.parallel(animations).start(() => setParticles([]))

      // 360° spin over 800ms
      const startTime = Date.now()
      const startAngle = rotYRef.current
      const spinDuration = 800
      const spinInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        if (elapsed >= spinDuration) {
          rotYRef.current = startAngle + Math.PI * 2
          clearInterval(spinInterval)
          return
        }
        const t = elapsed / spinDuration
        rotYRef.current = startAngle + Math.PI * 2 * t
      }, 16)

      return () => clearInterval(spinInterval)
    } else {
      prevTierRef.current = outfitTier
    }
  }, [outfitTier])

  // ── Master rAF loop ────────────────────────────────────────────────────────
  useEffect(() => {
    let lastTs = performance.now()

    const step = (ts: number) => {
      const dt = Math.min((ts - lastTs) / 1000, 0.05) // seconds, capped
      lastTs = ts

      const anim = animRef.current
      anim.time += dt

      // Breathing: ~5s cycle
      anim.breathPhase += dt * (Math.PI * 2 / 5)

      // Head yaw: ±3° (0.052 rad) slow look ~8s cycle
      anim.headYaw = Math.sin(anim.time * (Math.PI * 2 / 8)) * 0.052

      // Hip tilt: ±1.2° weight shift ~3s cycle
      anim.hipTilt = Math.sin(anim.time * (Math.PI * 2 / 3)) * 0.021

      // Arm swing: each arm on ~2.5s cycle, out of phase
      anim.armSwingL += dt * (Math.PI * 2 / 2.5)
      anim.armSwingR += dt * (Math.PI * 2 / 2.5)

      // Spotlight pulse: 0.02–0.05 on 4s cycle
      anim.spotlightOpacity = 0.035 + Math.sin(anim.time * (Math.PI * 2 / 4)) * 0.015
      // Extra boost while dragging
      const effectiveSpotlight = draggingRef.current
        ? Math.min(0.07, anim.spotlightOpacity + 0.02)
        : anim.spotlightOpacity

      // Update Animated.Value for spotlight (bridge to SVG stop opacity)
      spotlightAnim.setValue(effectiveSpotlight)

      // Idle or inertia rotation
      if (!draggingRef.current) {
        if (inertiaActiveRef.current) {
          velocityYRef.current *= 0.95
          velocityXRef.current *= 0.95
          rotYRef.current      += velocityYRef.current
          rotXRef.current       = Math.max(-0.4, Math.min(0.3, rotXRef.current + velocityXRef.current))

          if (Math.abs(velocityYRef.current) < 0.001 && Math.abs(velocityXRef.current) < 0.001) {
            velocityYRef.current  = 0
            velocityXRef.current  = 0
            inertiaActiveRef.current = false
            idleActiveRef.current    = true
          }
        } else if (idleActiveRef.current) {
          const now = Date.now()
          if (now < anim.idlePauseUntil) {
            // Pausing — no rotation
          } else {
            const speed = idleSpeed(rotYRef.current)
            rotYRef.current += speed

            // Check if we just crossed a pause angle
            const twoPi = Math.PI * 2
            const a = ((rotYRef.current % twoPi) + twoPi) % twoPi
            const d0   = Math.min(Math.abs(a),       Math.abs(a - twoPi))
            const d90  = Math.abs(a - Math.PI / 2)
            const d270 = Math.abs(a - 3 * Math.PI / 2)
            const minD = Math.min(d0, d90, d270)

            if (minD < speed * 1.5) {
              // At a pause zone — determine pause duration
              const pauseMs = d0 < 0.05 ? 1500 : 500
              anim.idlePauseUntil = now + pauseMs
            }
          }
        }
      }

      setTick(t => t + 1)
      masterRafRef.current = requestAnimationFrame(step)
    }

    idleActiveRef.current = true
    masterRafRef.current = requestAnimationFrame(step)

    return () => {
      if (masterRafRef.current !== null) {
        cancelAnimationFrame(masterRafRef.current)
        masterRafRef.current = null
      }
    }
  }, [])

  // ── Pan responder ──────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        draggingRef.current      = true
        inertiaActiveRef.current = false
        idleActiveRef.current    = false
        lastDxRef.current        = 0
        lastDyRef.current        = 0
        recentDxRef.current      = []
        recentDyRef.current      = []
        velocityYRef.current     = 0
        velocityXRef.current     = 0

        // Scale pulse 1.0→1.02→1.0
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.02,
            duration: 100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.0,
            duration: 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start()
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
      },
      onPanResponderRelease: () => {
        draggingRef.current = false
        const ry = recentDxRef.current
        const rx = recentDyRef.current
        velocityYRef.current     = ry.length > 0 ? ry.reduce((a, b) => a + b, 0) / ry.length : 0
        velocityXRef.current     = rx.length > 0 ? rx.reduce((a, b) => a + b, 0) / rx.length : 0
        inertiaActiveRef.current = true
        idleActiveRef.current    = false
      },
      onPanResponderTerminate: () => {
        draggingRef.current      = false
        velocityYRef.current     = 0
        velocityXRef.current     = 0
        inertiaActiveRef.current = false
        idleActiveRef.current    = true
      },
    }),
  ).current

  // ── Render ─────────────────────────────────────────────────────────────────
  const rendered = projectVoxels(
    voxelsRef.current, rotYRef.current, rotXRef.current, cx, cy, animRef.current
  )
  rendered.sort((a, b) => b.depth - a.depth)

  const spotlightCy = CH * 0.38
  const groundY = CH * 0.92

  // Compute spotlight opacity for SVG (using current anim state)
  const slOpacity = animRef.current.spotlightOpacity
  const slDragBoost = draggingRef.current ? 0.02 : 0
  const slFinal = Math.min(0.18, slOpacity + slDragBoost)

  return (
    <Animated.View
      style={{
        width: SW,
        height: CH,
        opacity: entryOpacity,
        transform: [{ scale: Animated.multiply(entryScale, scaleAnim) }],
      }}
      {...panResponder.panHandlers}
    >
      <Svg width={SW} height={CH}>
        <Defs>
          <RadialGradient id="spotlight" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
            <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity={slFinal} />
            <Stop offset="60%"  stopColor="#D0E8FF" stopOpacity={slFinal * 0.38} />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.00" />
          </RadialGradient>
          <RadialGradient id="groundReflect" cx="50%" cy="30%" rx="50%" ry="30%" fx="50%" fy="30%">
            <Stop offset="0%"   stopColor="#8899BB" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.00" />
          </RadialGradient>
          <LinearGradient id="rimLight" x1="100%" y1="0%" x2="0%" y2="0%">
            <Stop offset="0%"   stopColor="#3366AA" stopOpacity="0.18" />
            <Stop offset="30%"  stopColor="#224488" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.00" />
          </LinearGradient>
        </Defs>

        <Ellipse
          cx={cx}
          cy={spotlightCy}
          rx={SW * 0.40}
          ry={CH * 0.28}
          fill="url(#spotlight)"
        />

        <Ellipse
          cx={cx}
          cy={groundY}
          rx={SW * 0.30}
          ry={CH * 0.05}
          fill="url(#groundReflect)"
        />

        <Rect
          x={SW * 0.60}
          y={0}
          width={SW * 0.40}
          height={CH}
          fill="url(#rimLight)"
        />

        {rendered.map((v) => {
          const { sx, sy, s, topColor, frontColor, sideColor, sideRight } = v
          const half  = s / 2
          const topH  = s * 0.38
          const sideW = s * 0.25
          return (
            <G key={v.key}>
              <Rect x={sx - half}                                  y={sy - half - topH} width={s}     height={topH}    fill={topColor}   />
              <Rect x={sx - half}                                  y={sy - half}        width={s}     height={s}       fill={frontColor} />
              <Rect x={sideRight ? sx + half : sx - half - sideW} y={sy - half - topH} width={sideW} height={s + topH} fill={sideColor}  />
            </G>
          )
        })}
      </Svg>

      {/* Tier-up particles */}
      {particles.map(p => (
        <Animated.View
          key={p.id}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 8,
            height: 8,
            left: cx - 4,
            top: cy - 4,
            backgroundColor: p.color,
            opacity: p.anim,
            transform: [
              { translateX: p.translateX },
              { translateY: p.translateY },
            ],
          }}
        />
      ))}
    </Animated.View>
  )
}
