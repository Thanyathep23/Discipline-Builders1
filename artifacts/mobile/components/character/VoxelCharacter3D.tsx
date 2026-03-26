import React, { useRef, useEffect, useCallback, useState } from 'react'
import { PanResponder, useWindowDimensions, View } from 'react-native'
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
// Key light: top-left-front  (bright, warm)
// Fill light: right          (subtle)
// Rim/back light: behind     (faint, cool)

const TOP_MULT    = 1.40
const FRONT_MULT  = 1.00
const LEFT_MULT   = 0.78
const RIGHT_MULT  = 0.62

// Compute a combined lighting factor from a voxel's position and normal direction
// nx, ny, nz describe the voxel face normal
function applyThreePointLight(nx: number, ny: number, nz: number): number {
  // Key light direction: top-left-front
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
// Legend:
//   S = skin tone      s = light skin     d = dark skin      z = darkest skin
//   H = hair color     h = light hair     B = dark hair
//   e = sclera white   i = iris (#2A5080) r = pupil (dark)
//   a = eyelid shadow  l = lower lid highlight
//   b = eyebrow (dark hair)
//   M = nose/bridge    n = nostril (dark skin)
//   U = upper lip      V = lower lip      c = lip corner shadow
//   j = jaw shadow     . = transparent
//   W = white shirt    w = shirt shadow   E = shirt dark
//   C = collar/cuff    F = fold/seam
//   K = black trouser  k = dark trouser
//   A = waistband      J = crease hi      Q = pocket/loop dark
//   X = belt dark      x = belt shadow    G = buckle gold
//   T = dog tag silver
//   v = bracelet brown (lowercase; V = lower lip)
//   u = watch strap    Y = watch face     (lowercase; U = upper lip)
//   O = shoe upper     o = shoe dark      P = shoe medium
//   N = midsole        q = midsole shadow (lowercase; n = nostril)
//   R = outsole        p = outsole shadow (lowercase; b = eyebrow)

// FRONT_MAP — 32 cols × 80 rows
// Rows 0–16: head/face (detailed eyes, nose, lips)
// Rows 17–28: shirt (collar, fold lines, dog tag, bracelet/watch)
// Rows 29–33: belt + waistband
// Rows 34–46: trouser legs (crease J, pocket Q)
// Row 47–51: shoe upper
// Row 52: midsole (N/q)
// Row 53–55: outsole (R/p) + sole bottom

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

// FRONT_MAP_WATCH — outfitTier >= 2: replace rows 25-27 with 4×3 watch block
const FRONT_MAP_WATCH: string[] = [
  ...FRONT_MAP_BASE.slice(0, 25),
  '...SSSSSSEEFEEEEEEEEEFEEuuuuss.',  // 25 watch strap visible (u)
  '..vvSSSSSSSSSSSSSSSSSSSSSYYuuss',  // 26 bracelet (vv) + watch face Y + strap (uu)
  '..vvSSSSSwWWWWWWWWWWWWWwSYYuuSs',  // 27 bracelet (vv) + watch lower
  ...FRONT_MAP_BASE.slice(28),
]

// SIDE_MAP — 24 cols × 80 rows
// Rows 0–16: head/face (detailed), rows 17–55: clothing

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

// SIDE_MAP_WATCH — outfitTier >= 2: replace rows 25-27 with watch block
const SIDE_MAP_WATCH: string[] = [
  ...SIDE_MAP_BASE.slice(0, 25),
  '.......SSSSuuuuESSs.....',  // 25 watch strap (u) visible side
    '........SSSuYYuSs......',   // 26 watch face Y + strap
    '........vvwuYYuSs.....',    // 27 bracelet (vv) + watch lower
  ...SIDE_MAP_BASE.slice(28),
]

// BACK_MAP — 32 cols × 80 rows - back facing
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
    // skin tones
    'S': sk,
    's': lightenHex(sk, 0.08),
    'd': darkenHex(sk, 0.10),
    'z': darkenHex(sk, 0.22),
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
    // jaw shadow
    'j': darkenHex(sk, 0.12),
    // white shirt — base values; zone overrides applied in post-pass
    'W': '#F8F8F8',
    'w': '#E4E4E4',
    'E': '#C8C8C8',
    // shirt collar/cuff (off-white warm)
    'C': '#EDE8E0',
    // shirt fold/seam line
    'F': '#D8D8D8',
    // black slim trousers — base values; zone overrides applied in post-pass
    'K': '#18181F',
    'k': '#0E0E0E',
    // trouser crease highlight
    'J': '#2E2E2E',
    // pocket/belt-loop dark
    'Q': '#080808',
    // waistband dark
    'A': '#141414',
    // brown shoes
    'O': '#7A4E2D',
    'o': '#3E2518',
    'P': '#A0724F',
    // shoe midsole (lighter tan)
    'N': '#B8967A',
    'q': '#9E7A60',
    // shoe outsole (dark rubber)
    'R': '#1A1A1A',
    'p': '#0A0A0A',
    // belt dark brown/black
    'X': '#1A0E05',
    'x': '#100805',
    // belt buckle gold
    'G': '#C8A850',
    // dog tag silver (chain + tag)
    'T': '#A8A8B0',
    // wrist bracelet brown leather (v = lowercase; V = lower lip)
    'v': '#6B3A1F',
    // watch strap dark (u = lowercase; U = upper lip)
    'u': '#2C1A0E',
    // watch face
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
  // metadata for post-processing
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
// FRONT_MAP rows 0-9 are head/face rows (10 rows = 1/8 of 80).
// Face structure approximation (row indices in FRONT_MAP):
//   rows 0-4:  hair crown / forehead boundary
//   rows 5-6:  brow / eyelid shadow
//   rows 7-8:  eye level (sclera, iris, lower lid)
//   rows 9:    mouth / chin
//  rows 10-11: neck

function applyFaceShading(color: string, mapChar: string, mapRow: number, mapCol: number): string {
  const isSkin = mapChar === 'S' || mapChar === 's' || mapChar === 'd' || mapChar === 'z'
  if (!isSkin || mapRow > 16) return color

  // Forehead highlight (+8%)
  if (mapRow >= 4 && mapRow <= 6) {
    return brightnessAdjust(color, 1.08)
  }
  // Eye socket / brow darkening (-12%)
  if (mapRow === 7 || mapRow === 8) {
    if (mapCol >= 6 && mapCol <= 12) return brightnessAdjust(color, 0.88)
    if (mapCol >= 18 && mapCol <= 24) return brightnessAdjust(color, 0.88)
  }
  // Under-nose shadow (-18%)
  if (mapRow === 10) {
    return brightnessAdjust(color, 0.82)
  }
  // Under-chin / mouth shadow (-15%)
  if (mapRow >= 13 && mapRow <= 14) {
    return brightnessAdjust(color, 0.85)
  }
  // Cheek highlights — outer cheeks get subtle lift
  if (mapRow >= 9 && mapRow <= 12) {
    if (mapCol <= 8 || mapCol >= 24) return brightnessAdjust(color, 1.05)
  }
  return color
}

// ─── Clothing shading zones ───────────────────────────────────────────────────
// Shirt zone colors per spec:
//   chest-center highlight: #F8F8F8
//   standard:               #F0F0F0
//   side shadow:            #D8D8D8
//   fold:                   #C8C8C8
//   armpit:                 #BCBCBC
// Trouser zone colors per spec:
//   thigh highlight:        #2A2A3A
//   standard:               #18181F
//   inner shadow:           #0C0C12
//   deep crease:            #060608

function applyClothingZone(
  color: string, mapChar: string, mapRow: number, mapCol: number,
  totalCols: number
): string {
  // Shirt characters
  if (mapChar === 'W' || mapChar === 'w' || mapChar === 'E') {
    // shirt rows ~17-28, cols vary. Center column approx totalCols/2
    const center = totalCols / 2
    const distFromCenter = Math.abs(mapCol - center)
    const relDist = distFromCenter / (totalCols / 2)

    // Armpit zone (shirt edge chars 'E' near top rows 23-24)
    if (mapChar === 'E') return '#BCBCBC'

    // Fold zone (shirt shadow 'w' chars)
    if (mapChar === 'w') {
      if (relDist > 0.6) return '#C8C8C8'
      return '#D8D8D8'
    }

    // Main 'W' zones by horizontal position
    if (relDist < 0.2) return '#F8F8F8'  // chest center highlight
    if (relDist < 0.5) return '#F0F0F0'  // standard
    return '#D8D8D8'                      // side shadow
  }

  // Trouser characters
  if (mapChar === 'K' || mapChar === 'k') {
    const center = totalCols / 2
    const distFromCenter = Math.abs(mapCol - center)
    const relDist = distFromCenter / (totalCols / 2)

    // Dark trouser ('k') = inner shadow / crease
    if (mapChar === 'k') {
      if (relDist > 0.5) return '#060608'  // deep crease
      return '#0C0C12'                     // inner shadow
    }

    // Main 'K' zones
    // Thigh highlight — upper trouser rows (front-facing rows 29-34)
    if (mapRow >= 29 && mapRow <= 34) {
      if (relDist < 0.35) return '#2A2A3A'  // thigh highlight
    }
    if (relDist < 0.5) return '#18181F'     // standard
    return '#0C0C12'                        // inner shadow
  }

  return color
}

// ─── Ambient occlusion simulation ────────────────────────────────────────────
// Joint regions with their darkening amounts:
//   neck-shoulder (rows 17, col near center sides): 15%
//   armpit (rows 23-24, outer cols): 20%
//   elbow inner (rows 25-26): 12%
//   trouser crotch (row 29-30, near center): 25%
//   behind knee (rows 40-44): 15%
//   ankle-shoe boundary (rows 47-51): 10%

function applyAmbientOcclusion(
  color: string, mapChar: string, mapRow: number, mapCol: number,
  totalCols: number
): string {
  const center = totalCols / 2
  const distFromCenter = Math.abs(mapCol - center)

  // Neck-shoulder junction
  if (mapRow === 17 && (mapChar === 'S' || mapChar === 's' || mapChar === 'W' || mapChar === 'w')) {
    if (distFromCenter < 4) return darkenHex(color, 0.15)
  }

  // Armpit zone
  if ((mapRow === 23 || mapRow === 24) && (mapChar === 'E' || mapChar === 'w' || mapChar === 'W')) {
    if (distFromCenter > totalCols * 0.3) return darkenHex(color, 0.20)
  }

  // Elbow inner crease
  if ((mapRow === 25 || mapRow === 26) && mapChar === 'E') {
    return darkenHex(color, 0.12)
  }

  // Trouser crotch
  if ((mapRow === 29 || mapRow === 30) && (mapChar === 'K' || mapChar === 'k')) {
    if (distFromCenter < 3) return darkenHex(color, 0.25)
  }

  // Behind knee
  if (mapRow >= 40 && mapRow <= 44 && (mapChar === 'K' || mapChar === 'k')) {
    if (distFromCenter > totalCols * 0.15 && distFromCenter < totalCols * 0.35) {
      return darkenHex(color, 0.15)
    }
  }

  // Ankle-shoe boundary
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

      // Apply face shading
      let color = applyFaceShading(baseColor, ch, row, col)
      // Apply clothing zone shading
      color = applyClothingZone(color, ch, row, col, totalCols)
      // Apply ambient occlusion
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

  // ── Nose tip: extra voxel(s) at z+1 (protruding forward) ───────────────────
  const noseZ  = MODEL_DEPTH / 2 + 1
  const noseTipColor = pal['M'] ?? ''
  const noseExtraVoxels: Voxel[] = noseTipColor ? [
    makeVoxel(frontOffX + 15, -(10 + frontOffY), noseZ, noseTipColor),
    makeVoxel(frontOffX + 16, -(11 + frontOffY), noseZ, noseTipColor),
  ] : []

  // ── Ears: 3 voxels per ear at eye level ─────────────────────────────────────
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

    // Compute three-point lighting for top and side faces
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

export default function VoxelCharacter3D({
  skinTone = 'tone-3',
  hairColor = 'dark-brown',
  outfitTier = 1,
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
  const voxelsRef = useRef<Voxel[]>(buildVoxelModel(palRef.current, outfitTier))

  useEffect(() => {
    palRef.current    = buildPalette(skinHex, hairHex)
    voxelsRef.current = buildVoxelModel(palRef.current, outfitTier)
    setTick(t => t + 1)
  }, [skinHex, hairHex, outfitTier])

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

  runInertiaRef.current = runInertia
  startIdleRef.current  = startIdleRotate

  const rendered = projectVoxels(voxelsRef.current, rotYRef.current, rotXRef.current, cx, cy)
  rendered.sort((a, b) => b.depth - a.depth)

  // Background spotlight: chest height is roughly 38% down from top
  const spotlightCy = CH * 0.38
  const groundY = CH * 0.92

  return (
    <View style={{ width: SW, height: CH }} {...panResponder.panHandlers}>
      <Svg width={SW} height={CH}>
        <Defs>
          {/* Spotlight oval at chest height */}
          <RadialGradient id="spotlight" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
            <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.18" />
            <Stop offset="60%"  stopColor="#D0E8FF" stopOpacity="0.07" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.00" />
          </RadialGradient>
          {/* Ground reflection blur */}
          <RadialGradient id="groundReflect" cx="50%" cy="30%" rx="50%" ry="30%" fx="50%" fy="30%">
            <Stop offset="0%"   stopColor="#8899BB" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.00" />
          </RadialGradient>
          {/* Right-edge rim light gradient */}
          <LinearGradient id="rimLight" x1="100%" y1="0%" x2="0%" y2="0%">
            <Stop offset="0%"   stopColor="#3366AA" stopOpacity="0.18" />
            <Stop offset="30%"  stopColor="#224488" stopOpacity="0.06" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.00" />
          </LinearGradient>
        </Defs>

        {/* Background spotlight oval at chest height */}
        <Ellipse
          cx={cx}
          cy={spotlightCy}
          rx={SW * 0.40}
          ry={CH * 0.28}
          fill="url(#spotlight)"
        />

        {/* Ground reflection ellipse */}
        <Ellipse
          cx={cx}
          cy={groundY}
          rx={SW * 0.30}
          ry={CH * 0.05}
          fill="url(#groundReflect)"
        />

        {/* Right-edge rim light strip */}
        <Rect
          x={SW * 0.60}
          y={0}
          width={SW * 0.40}
          height={CH}
          fill="url(#rimLight)"
        />

        {/* Voxel character */}
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
    </View>
  )
}
