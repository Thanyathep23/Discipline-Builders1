import React, { useState, useRef, useMemo } from 'react'
import {
  View,
  Text,
  PanResponder,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native'
import Svg, { Rect } from 'react-native-svg'

const SCREEN_W = Dimensions.get('window').width
const VOXEL = 8

function darken(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.max(0, ((n >> 16) & 0xff) - Math.round(255 * amt))
  const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amt))
  const b = Math.max(0, (n & 0xff) - Math.round(255 * amt))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((n >> 16) & 0xff) + Math.round(255 * amt))
  const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * amt))
  const b = Math.min(255, (n & 0xff) + Math.round(255 * amt))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

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

type Palette = Record<string, string | null>

function buildPalette(sk: string, hc: string, tier: number): Palette {
  const suitSets: Record<number, { s1: string; s2: string; s3: string; s4: string; v1: string; v2: string; ti: string; tp: string }> = {
    1: { s1: '#F5F5F5', s2: '#E8E8E8', s3: '#DCDCDC', s4: '#C8C8C8', v1: '#E8E8E8', v2: '#DCDCDC', ti: '#E8E8E8', tp: '#E8E8E8' },
    2: { s1: '#4A4A5A', s2: '#3A3A4A', s3: '#2A2A3A', s4: '#1A1A2A', v1: '#3A3A4A', v2: '#2A2A3A', ti: '#3A3A4A', tp: '#3A3A4A' },
    3: { s1: '#3A4050', s2: '#2A3040', s3: '#1A2030', s4: '#101820', v1: '#2A3040', v2: '#1A2030', ti: '#2A3040', tp: '#2A3040' },
    4: { s1: '#3D5166', s2: '#2C3E50', s3: '#1C2E3E', s4: '#0F1C2A', v1: '#253545', v2: '#1A2535', ti: '#1A252F', tp: '#F39C12' },
  }
  const su = suitSets[tier] ?? suitSets[4]
  return {
    '.': null,
    'H': hc, 'h': lighten(hc, 0.18),
    'S': sk, 's': lighten(sk, 0.10), 'd': darken(sk, 0.12), 'z': darken(sk, 0.20),
    'w': '#FFFFFF', 'r': '#1E3A5F', 'E': '#0A0A0A',
    'B': darken(hc, 0.08), 'p': darken(sk, 0.06), 'M': '#9B5B3A',
    '1': su.s1, '2': su.s2, '3': su.s3, '4': su.s4,
    'V': su.v1, 'v': su.v2,
    'W': '#F8F8F8', 'm': '#E0E0E0',
    'T': su.ti, 't': su.tp,
    'G': '#F1C40F', 'Q': '#F5A623', 'U': '#F1C40F',
    'b': '#2A1A0A',
    'L': su.s2, 'l': su.s1, 'R': su.s4,
    'O': '#5C3A1E', 'o': '#3E2518', 'P': '#7A4E2D',
    'N': '#1A1A2E', 'n': '#3A3A5E',
    'D': '#F0EDE8', 'e': '#D0CCC8',
    'F': '#8B5E3C', 'f': '#6B4424', 'g': '#F1C40F',
    'C': '#F5F5F5', 'c': '#DCDCDC',
    'J': '#1F3260', 'j': '#2A4180', 'k': '#162348',
    'X': darken(su.s2, 0.06),
    'Y': lighten(su.s2, 0.08),
    'A': '#2A2A3A', 'a': '#3A3A4E',
  }
}

function parseMap(lines: string[], pal: Palette): (string | null)[][] {
  return lines.map(line =>
    line.split('').map(ch => pal[ch] ?? null)
  )
}

const FACE_FRONT = [
  '..........HHHhHhHhHHH...................',
  '.........HhHhHhHhHhHhH..................',
  '........HHhHhHhHhHhHhHH.................',
  '........HHHhHhHhHhHhHHH.................',
  '.......SHHHHHHHHHHHHHHHHS...............',
  '.......SdSSSSSSSSSSSSSSdS...............',
  '........dSSsSSSSSSsSSSd.................',
  '........SSBBBSSSSSBBBSS.................',
  '........SSwwrESSSSwwrES.................',
  '........SSSSSSSSSSSSSS..................',
  '.........SSSSSppSSSSSS..................',
  '.........SSSSSppSSSSSS..................',
  '.........SSSSdMMdSSSSS..................',
  '..........zzSSSSSSzz....................',
  '...........zzSSSSzz.....................',
  '............SSSSSS......................',
  '............SSSSSS......................',
]

const ELITE_FRONT_BODY = [
  '..........mWWWWWWWWm....................',
  '.........2mWWWTTWWWm2...................',
  '........22mWWWTtWWWm22..................',
  '.......222WVVVTTTVVVm222................',
  '......2223WVVVTtTVVVW3222...............',
  '.....22234VVVVTTTVVVv43222..............',
  '.....22234VvVVTtTVvVv43222..............',
  '.....2223GVVVVTTVVVVv32Q22..............',
  '.....22234VVVVTtVVVVv43222..............',
  '.....22234VvVVTTVvVVv43222..............',
  '.....22234VVVVTtVVVVv43222..............',
  '.....2223bbbbbbbbbbbbb3222..............',
  '.....2223bbbUUUUUUbbbb3222..............',
  '....222234LLLLLLLLLLLLL43222............',
  '...2222344LLLLLLLLLLLLL443222.NNn.......',
  '..22SS344.LLLLLlLLLLLL.44SS22.Nn........',
  '..2SSS44..LLLLRlRLLLLL..4SSS2.Sn........',
  '.2DSSS4...LLLLRlRLLLLL...4SSS..S........',
  '.DDdSS....LLLLLlLLLLLL....SSN...........',
  '.DDeS.....LLLLRlRLLLLL.....SNN..........',
  '..DD......LLLLLlLLLLLL......Nn..........',
  '..........LLLLRlRLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLRlRLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLRlRLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLlRlRlLLLL..................',
  '..........LLLlL.LlLLLL..................',
  '..........LLLl...lLLLL..................',
  '..........LLLl...lLLLL..................',
  '..........LLLl...lLLLL..................',
  '.........OOOOl...lOOOO..................',
  '.........OPOOo...OPOOo..................',
  '........Pooooo...oooooP.................',
  '........................................',
  '.FFff...................................',
  '.FgFf...................................',
  '.FFFf...................................',
  '.ffff...................................',
]

const PREMIUM_FRONT_BODY = [
  '..........mWWWWWWWWm....................',
  '.........2mWWWTTWWWm2...................',
  '........22mWWWTTWWWm22..................',
  '.......222WWWWTTTWWWW222................',
  '......2223WWWWTTTWWWW3222...............',
  '.....22233WWWWTTTWWWW33222..............',
  '.....22233WWWWTTTSWWW33222..............',
  '.....22233WWWWTTTWWWW33222..............',
  '.....22233WWWWTTTSWWW33222..............',
  '.....22233WWWWTTTWWWW33222..............',
  '.....22233WWWWTTTSWWW33222..............',
  '.....2223bbbbbbbbbbbbb3222..............',
  '.....2223bbbUUUUUUbbbb3222..............',
  '....SS2234LLLLLLLLLLLLL4322SS...........',
  '....SSS234LLLLLLLLLLLLL432SSS...........',
  '....SSS.34LLLLLlLLLLLL43.SSS............',
  '....SS..34LLLLRlRLLLLL43..SS............',
  '.........4LLLLRlRLLLLL4.................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLRlRLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLRlRLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLRlRLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLlRlRlLLLL..................',
  '..........LLLlL.LlLLLL..................',
  '..........LLLl...lLLLL..................',
  '..........LLLl...lLLLL..................',
  '..........LLLl...lLLLL..................',
  '.........OOOOl...lOOOO..................',
  '.........OPOOo...OPOOo..................',
  '........Pooooo...oooooP.................',
]

const RISING_FRONT_BODY = [
  '..........mWWWWWWWWm....................',
  '.........2mWWWWWWWWm2...................',
  '........222WWWWWWWWW222.................',
  '.......2222WWWWWWWWW2222................',
  '......22222WWWWWWWWW22222...............',
  '.....222222WWWWWWWWW222222..............',
  '.....222222WWWWWWWWW222222..............',
  '.....222222WWWWWWWWW222222..............',
  '.....222222WWWWWWWWW222222..............',
  '.....222222WWWWWWWWW222222..............',
  '.....222222WWWWWWWWW222222..............',
  '.....2222bbbbbbbbbbbbb2222..............',
  '.....2222bbbUUUUUUbbbb2222..............',
  '....SS2224LLLLLLLLLLLLL4222SS...........',
  '....SSS224LLLLLLLLLLLLL422SSS...........',
  '....SSS.24LLLLLlLLLLLL42.SSS............',
  '....SS..24LLLLRlRLLLLL42..SS............',
  '..........LLLLRlRLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLRlRLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLRlRLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLRlRLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLlRlRlLLLL..................',
  '..........LLLlL.LlLLLL..................',
  '..........LLLl...lLLLL..................',
  '..........LLLl...lLLLL..................',
  '..........LLLl...lLLLL..................',
  '.........OOOOl...lOOOO..................',
  '.........OPOOo...OPOOo..................',
  '........Pooooo...oooooP.................',
]

const STARTER_FRONT_BODY = [
  '..........SSSSSSSS......................',
  '.........CCCCCCCCCC.....................',
  '........CCCCCCCCCCCC....................',
  '.......CCCCCCCCCCCCCC...................',
  '......CCCCCCCCCCCCCCCC..................',
  '.....CCCCCCCCCCCCCCCCCC.................',
  '.....CcCCCCCCCCCCCCcCC..................',
  '.....CcCCCCCCCCCCCCcCC..................',
  '.....CcCCCCCCCCCCCCcCC..................',
  '.....CcCCCCCCCCCCCCcCC..................',
  '.....CcCCCCCCCCCCCCcCC..................',
  '....SSCcCCCCCCCCCCCCcCSS................',
  '....SSSCCCCCCCCCCCCCCcSSS...............',
  '....SSS.CCCCCCCCCCCCCC.SSS..............',
  '....SS..CCCCCcCcCCCCCC..SS..............',
  '..........JJJJJJJJjjjJ..................',
  '..........JJJJJJJJjjjJ..................',
  '..........JJJJkJJJjjjJ..................',
  '..........JJJJJJJJjjjJ..................',
  '..........JJJJkJJJjjjJ..................',
  '..........JJJJJJJJjjjJ..................',
  '..........JJJJkJJJjjjJ..................',
  '..........JJJJJJJJjjjJ..................',
  '..........JJJJkJJJjjjJ..................',
  '..........JJJJJJJJjjjJ..................',
  '..........JJJjkJ.JjjjJ..................',
  '..........JJJj..JjjjJ...................',
  '..........JJJj...jjjJ...................',
  '..........JJJj...jjjJ...................',
  '..........JJJj...jjjJ...................',
  '..........JJJj...jjjJ...................',
  '..........JJJj...jjjJ...................',
  '.........OOOOj...jOOOO..................',
  '.........OPOOo...OPOOo..................',
  '........Pooooo...oooooP.................',
]

const SUIT_SIDE = [
  '..........HHhHhHH.......................',
  '.........HhHhHhHhH......................',
  '........HHhHhHhHhH......................',
  '........HHHhHhHhHH......................',
  '.......SHHHHHHHHHHH.....................',
  '.......SSSSSSSSSSSSd....................',
  '.......dSSsSSSSSsSd.....................',
  '........SSBBBSSSSSS.....................',
  '........SSwwrESSSSd.....................',
  '........SSSSSSSSSS......................',
  '.........SSSSppSSS......................',
  '.........SSSSpSSSS......................',
  '.........SSSdMMdSS......................',
  '..........zzSSSSSzz.....................',
  '...........zSSSSz.......................',
  '............SSSSS.......................',
  '............SSSSS.......................',
  '..........mWWTWWm.......................',
  '.........2mWWTWWm2......................',
  '........22mWWTWWm22.....................',
  '.......222WVVTVVW222....................',
  '......2223WVVTVVW3222...................',
  '.....22234VVVTVVV43222..................',
  '.....22234VvVTVvV43222..................',
  '.....22234VVVTVVV43222..................',
  '.....22234VvVTVvV43222..................',
  '.....22234VVVTVVV43222..................',
  '.....2223bbbbbbbbb3222..................',
  '.....2223bbbUUUbbb3222..................',
  '....22234LLLLLLLLLl43222................',
  '....2SS34LLLLLLLLLl432SS................',
  '....SSS.4LLLLlLLLLl4.SSS................',
  '....SS...LLLLlLLLLl...SS................',
  '..........LLLRlLLLL.....................',
  '..........LLLLlLLLL.....................',
  '..........LLLRlLLLL.....................',
  '..........LLLLlLLLL.....................',
  '..........LLLRlLLLL.....................',
  '..........LLLLlLLLL.....................',
  '..........LLLRlLLLL.....................',
  '..........LLLLlLLLL.....................',
  '..........LLLRlLLLL.....................',
  '..........LLLLlLLLL.....................',
  '..........LLLLlLLLL.....................',
  '..........LLLRlLLLL.....................',
  '..........LLLLlLLLL.....................',
  '..........LLlRlLLLL.....................',
  '..........LLlLlLLLL.....................',
  '..........LLlLlLLLL.....................',
  '.........OOOOl.OOOO.....................',
  '.........OPOOo.OPOO.....................',
  '........Pooooo.ooooP....................',
]

const CASUAL_SIDE = [
  '..........HHhHhHH.......................',
  '.........HhHhHhHhH......................',
  '........HHhHhHhHhH......................',
  '........HHHhHhHhHH......................',
  '.......SHHHHHHHHHHH.....................',
  '.......SSSSSSSSSSSSd....................',
  '.......dSSsSSSSSsSd.....................',
  '........SSBBBSSSSSS.....................',
  '........SSwwrESSSSd.....................',
  '........SSSSSSSSSS......................',
  '.........SSSSppSSS......................',
  '.........SSSSpSSSS......................',
  '.........SSSdMMdSS......................',
  '..........zzSSSSSzz.....................',
  '...........zSSSSz.......................',
  '............SSSSS.......................',
  '............SSSSS.......................',
  '.........CCCCCCCCCC.....................',
  '........CCCCCCCCCCCC....................',
  '.......CCCCCCCCCCCCC....................',
  '......CCCCCCCCCCCCCC....................',
  '.....CCCCCCCCCCCCCCC....................',
  '.....CcCCCCCCCCCCCCC....................',
  '.....CcCCCCCCCCCCCCC....................',
  '.....CcCCCCCCCCCCCCC....................',
  '.....CcCCCCCCCCCCCCC....................',
  '....SSCcCCCCCCCCCCCCC...................',
  '....SSSCcCCCCCCCCCCSS...................',
  '....SS..CCCCCCCCCCSS....................',
  '..........JJJJJJJjjjJ...................',
  '..........JJJJJJJjjjJ...................',
  '..........JJJJkJJjjjJ...................',
  '..........JJJJJJJjjjJ...................',
  '..........JJJJkJJjjjJ...................',
  '..........JJJJJJJjjjJ...................',
  '..........JJJJkJJjjjJ...................',
  '..........JJJJJJJjjjJ...................',
  '..........JJJJkJJjjjJ...................',
  '..........JJJJJJJjjjJ...................',
  '..........JJJjkJjjjjJ...................',
  '..........JJJjJjjjjJ....................',
  '..........JJJjjjjjJ.....................',
  '..........JJJjjjjjJ.....................',
  '..........JJJjjjjjJ.....................',
  '.........OOOOj.OOOO.....................',
  '.........OPOOo.OPOO.....................',
  '........Pooooo.ooooP....................',
]

const SUIT_BACK = [
  '..........HHHhHhHhHHH...................',
  '.........HhHhHhHhHhHhH..................',
  '........HHhHhHhHhHhHhHH.................',
  '........HHHhHhHhHhHhHHH.................',
  '.......HHHHHHHHHHHHHHHH.................',
  '........HHHHHHHHHHHHHHH.................',
  '........HHHHHHHHHHHHHH..................',
  '........HHHHHHHHHHHHH...................',
  '........HHHHHHHHHHHHH...................',
  '.........HHHHHHHHHHHH...................',
  '.........HHHHHHHHHHHH...................',
  '..........HHHHHHHHHH....................',
  '..........dSSSSSSSSd....................',
  '...........dSSSSSSd.....................',
  '...........dSSSSSSd.....................',
  '............SSSSSS......................',
  '............SSSSSS......................',
  '..........mWWWWWWWWm....................',
  '.........2mWWWWWWWWm2...................',
  '........222WWWWWWWWW222.................',
  '.......2222222222222222.................',
  '......22222222222222222.................',
  '.....222222222222222222.................',
  '.....222232222222232222.................',
  '.....222232222222232222.................',
  '.....222222222222222222.................',
  '.....222222222222222222.................',
  '.....2223bbbbbbbbbbbbb3222..............',
  '.....2223bbbUUUUUUbbbb3222..............',
  '....SS234LLLLLLLLLLLLL432SS.............',
  '....SSS24LLLLLLLLLLLLL42SSS.............',
  '....SSS.4LLLLLlLLLLLL4.SSS..............',
  '....SS..4LLLLRlRLLLLL4..SS..............',
  '..........LLLLRlRLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLRlRLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLRlRLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLLRlRLLLLL..................',
  '..........LLLLLlLLLLLL..................',
  '..........LLLlRlRlLLLL..................',
  '..........LLLlL.LlLLLL..................',
  '..........LLLl...lLLLL..................',
  '..........LLLl...lLLLL..................',
  '..........LLLl...lLLLL..................',
  '.........OOOOl...lOOOO..................',
  '.........OPOOo...OPOOo..................',
  '........Pooooo...oooooP.................',
]

const CASUAL_BACK = [
  '..........HHHhHhHhHHH...................',
  '.........HhHhHhHhHhHhH..................',
  '........HHhHhHhHhHhHhHH.................',
  '........HHHhHhHhHhHhHHH.................',
  '.......HHHHHHHHHHHHHHHH.................',
  '........HHHHHHHHHHHHHHH.................',
  '........HHHHHHHHHHHHHH..................',
  '........HHHHHHHHHHHHH...................',
  '........HHHHHHHHHHHHH...................',
  '.........HHHHHHHHHHHH...................',
  '.........HHHHHHHHHHHH...................',
  '..........HHHHHHHHHH....................',
  '..........dSSSSSSSSd....................',
  '...........dSSSSSSd.....................',
  '...........dSSSSSSd.....................',
  '............SSSSSS......................',
  '............SSSSSS......................',
  '.........CCCCCCCCCC.....................',
  '........CCCCCCCCCCCC....................',
  '.......CCCCCCCCCCCCC....................',
  '......CCCCCCCCCCCCCCCC..................',
  '.....CCCCCCCCCCCCCCCCCC.................',
  '.....CCCCCCCCCCCCCCCCCC.................',
  '.....CcCCCCCCCCCCCCCCCC.................',
  '.....CcCCCCCCCCCCCCCCCC.................',
  '.....CcCCCCCCCCCCCCCCCC.................',
  '....SSCcCCCCCCCCCCCCCCSS................',
  '....SSSCcCCCCCCCCCCCCCSSS...............',
  '....SS..CCCCCCCCCCCCCC.SS...............',
  '..........JJJJJJJjjjJ...................',
  '..........JJJJJJJjjjJ...................',
  '..........JJJJkJJjjjJ...................',
  '..........JJJJJJJjjjJ...................',
  '..........JJJJkJJjjjJ...................',
  '..........JJJJJJJjjjJ...................',
  '..........JJJJkJJjjjJ...................',
  '..........JJJJJJJjjjJ...................',
  '..........JJJJkJJjjjJ...................',
  '..........JJJJJJJjjjJ...................',
  '..........JJJjkJjjjjJ...................',
  '..........JJJjJjjjjJ....................',
  '..........JJJjjjjjJ.....................',
  '..........JJJjjjjjJ.....................',
  '..........JJJjjjjjJ.....................',
  '.........OOOOj...jOOOO..................',
  '.........OPOOo...OPOOo..................',
  '........Pooooo...oooooP.................',
]

function getFrontMap(tier: number): string[] {
  const face = [...FACE_FRONT]
  let body: string[]
  if (tier >= 4) body = ELITE_FRONT_BODY
  else if (tier >= 3) body = PREMIUM_FRONT_BODY
  else if (tier >= 2) body = RISING_FRONT_BODY
  else body = STARTER_FRONT_BODY
  return [...face, ...body]
}

function getSideMap(tier: number): string[] {
  if (tier >= 3) return SUIT_SIDE
  return CASUAL_SIDE
}

function getBackMap(tier: number): string[] {
  if (tier >= 3) return SUIT_BACK
  return CASUAL_BACK
}

interface VoxelGridProps {
  map: (string | null)[][]
  size: number
  flip?: boolean
}

const VoxelGrid: React.FC<VoxelGridProps> = React.memo(({ map, size, flip }) => {
  const cols = map[0]?.length ?? 0
  const rows = map.length
  const rects: React.ReactNode[] = []
  const gap = 0.5
  const bw = Math.max(1, size * 0.14)

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = map[y][x]
      if (!c) continue
      const px = x * size
      const py = y * size
      const w = size - gap
      const h = size - gap
      rects.push(
        <React.Fragment key={`${x}-${y}`}>
          <Rect x={px} y={py} width={w} height={h} fill={c} />
          <Rect x={px} y={py} width={w} height={bw} fill={lighten(c, 0.22)} opacity={0.55} />
          <Rect x={px + w - bw} y={py} width={bw} height={h} fill={darken(c, 0.20)} opacity={0.50} />
        </React.Fragment>
      )
    }
  }

  return (
    <View style={flip ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Svg width={cols * size} height={rows * size}>
        {rects}
      </Svg>
    </View>
  )
})

interface VoxelCharacterProps {
  skinTone?: string
  hairColor?: string
  outfitTier?: number
}

const VIEWS = ['FRONT', 'SIDE', 'BACK', 'SIDE'] as const
type ViewIndex = 0 | 1 | 2 | 3

const VoxelCharacter: React.FC<VoxelCharacterProps> = ({
  skinTone = 'tone-3',
  hairColor = 'dark-brown',
  outfitTier = 1,
}) => {
  const sk = SKIN_TONES[skinTone] ?? SKIN_TONES['tone-3']
  const hc = HAIR_COLORS[hairColor] ?? HAIR_COLORS['dark-brown']
  const [viewIdx, setViewIdx] = useState<ViewIndex>(0)
  const viewIdxRef = useRef<ViewIndex>(0)
  const fadeAnim = useRef(new Animated.Value(1)).current
  const dragX = useRef(0)

  const switchView = (newIdx: ViewIndex) => {
    if (newIdx === viewIdxRef.current) return
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start()
    viewIdxRef.current = newIdx
    setViewIdx(newIdx)
  }

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { dragX.current = 0 },
    onPanResponderMove: (_, gs) => { dragX.current = gs.dx },
    onPanResponderRelease: (_, gs) => {
      if (Math.abs(gs.dx) < 30) return
      const delta = gs.dx < 0 ? 1 : -1
      const next = ((viewIdxRef.current + delta + 4) % 4) as ViewIndex
      switchView(next)
    },
  })).current

  const palette = useMemo(() => buildPalette(sk, hc, outfitTier), [sk, hc, outfitTier])

  const frontMap = useMemo(() => parseMap(getFrontMap(outfitTier), palette), [outfitTier, palette])
  const sideMap = useMemo(() => parseMap(getSideMap(outfitTier), palette), [outfitTier, palette])
  const backMap = useMemo(() => parseMap(getBackMap(outfitTier), palette), [outfitTier, palette])

  const currentMap = viewIdx === 0 ? frontMap : viewIdx === 2 ? backMap : sideMap
  const isFlipped = viewIdx === 3

  const cols = currentMap[0]?.length ?? 40
  const rows = currentMap.length
  const availableH = 460
  const naturalH = rows * VOXEL
  const naturalW = cols * VOXEL
  const scaleH = availableH / naturalH
  const scaleW = (SCREEN_W - 32) / naturalW
  const scale = Math.min(scaleH, scaleW, 1.6)

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.spotlight} pointerEvents="none" />

      <Animated.View style={[styles.charWrap, { opacity: fadeAnim }]}>
        <View style={{ transform: [{ scale }] }}>
          <VoxelGrid map={currentMap} size={VOXEL} flip={isFlipped} />
        </View>
      </Animated.View>

      <View style={[styles.groundShadow, { width: cols * VOXEL * scale * 0.5 }]} />

      <View style={styles.dots}>
        {VIEWS.map((label, i) => (
          <View key={i} style={styles.dotWrap}>
            <View style={[styles.dot, i === viewIdx && styles.dotActive]} />
            {i === viewIdx && (
              <Text style={styles.dotText}>{label}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  spotlight: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    width: 200,
    height: 280,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  charWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  groundShadow: {
    height: 10,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.40)',
    marginTop: -2,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  dotWrap: {
    alignItems: 'center',
    minWidth: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 0,
    backgroundColor: '#444',
    borderWidth: 1,
    borderColor: '#666',
  },
  dotActive: {
    backgroundColor: '#F1C40F',
    borderColor: '#F1C40F',
  },
  dotText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 7,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 3,
  },
})

export default VoxelCharacter
