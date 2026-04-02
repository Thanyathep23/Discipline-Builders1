/**
 * CustomizeScreen.tsx  (v3 — Real GLB Assets)
 * ─────────────────────────────────────────────
 * - SVG character (instant, no 3D overhead)
 * - Watch: small GLBViewer ลอยบนข้อมือซ้ายของ SVG character
 * - Car:   GLBViewer ใหญ่ข้างๆ ตัวละคร
 * - กดการ์ด → switch model ทันที (cache ไม่ reload)
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import Svg, { Ellipse, Rect, Path, G, SvgText } from 'react-native-svg';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

import GLBViewer, { preloadGLBs } from '../components/GLBViewer';

// ─── Asset map ────────────────────────────────────────────────────────────────
// copy optimized-glb/ ไปไว้ใน assets/models/ ของ Expo project
const WATCH_ASSETS = {
  apple_watch:   require('../assets/models/apple_watch.glb'),
  apple_ultra:   require('../assets/models/apple_watch_ultra_2.glb'),
  rolex:         require('../assets/models/rolex_datejust.glb'),
  patek:         require('../assets/models/patek_philippe.glb'),
  breitling:     require('../assets/models/breitling_superocean_automatic_44_-_watch.glb'),
  richard_mille: require('../assets/models/richard_mille_rm011_low_poly.glb'),
  seiko:         require('../assets/models/seiko_watch.glb'),
  timex:         require('../assets/models/timex_expedition_watch.glb'),
} as const;

const CAR_ASSETS = {
  lambo:    require('../assets/models/2010_lamborghini_reventon_roadster.glb'),
  porsche:  require('../assets/models/2022_porsche_911_gt3_touring_992.glb'),
  viper:    require('../assets/models/2016_dodge_viper_acr.glb'),
  supra:    require('../assets/models/2020_lbworks_toyota_supra_a90_ver_2.glb'),
  civic_r:  require('../assets/models/2023_honda_civic_type_r.glb'),
  gr86:     require('../assets/models/2022_toyota_gr86.glb'),
  bmw_m4:   require('../assets/models/bmw_m4_widebody__www_vecarz_com.glb'),
  dodge:    require('../assets/models/dodge_challenger_srt_demon_sdc.glb'),
  audi_tt:  require('../assets/models/2007_audi_tt_coupe.glb'),
} as const;

type WatchKey  = keyof typeof WATCH_ASSETS;
type CarKey    = keyof typeof CAR_ASSETS;

interface WatchEntry { key: WatchKey;  label: string; icon: string; mb: string; prestige: number; }
interface CarEntry   { key: CarKey;    label: string; icon: string; mb: string; prestige: number; }

const WATCHES: WatchEntry[] = [
  { key: 'apple_watch',   label: 'Apple Watch',     icon: '⌚', mb: '1.2', prestige: 0 },
  { key: 'apple_ultra',   label: 'Apple Ultra 2',   icon: '⌚', mb: '8.7', prestige: 0 },
  { key: 'rolex',         label: 'Rolex Datejust',  icon: '🕐', mb: '3.3', prestige: 0 },
  { key: 'patek',         label: 'Patek Philippe',  icon: '💛', mb: '5.7', prestige: 1 },
  { key: 'breitling',     label: 'Breitling',       icon: '🔵', mb: '3.5', prestige: 1 },
  { key: 'richard_mille', label: 'Richard Mille',   icon: '💎', mb: '7.1', prestige: 2 },
  { key: 'seiko',         label: 'Seiko',           icon: '⌚', mb: '8.1', prestige: 0 },
  { key: 'timex',         label: 'Timex Expedition',icon: '🟤', mb: '2.1', prestige: 0 },
];

const CARS: CarEntry[] = [
  { key: 'lambo',   label: "Lamborghini Reventón", icon: '🟡', mb: '2.2', prestige: 2 },
  { key: 'porsche', label: 'Porsche 911 GT3',       icon: '🔴', mb: '3.9', prestige: 2 },
  { key: 'viper',   label: 'Dodge Viper ACR',       icon: '🐍', mb: '3.4', prestige: 1 },
  { key: 'supra',   label: 'LB Supra A90',          icon: '🏎️', mb: '4.3', prestige: 1 },
  { key: 'civic_r', label: 'Honda Civic Type R',    icon: '⚪', mb: '5.0', prestige: 0 },
  { key: 'gr86',    label: 'Toyota GR86',           icon: '🟠', mb: '5.1', prestige: 0 },
  { key: 'bmw_m4',  label: 'BMW M4 Widebody',       icon: '🔵', mb: '6.0', prestige: 1 },
  { key: 'dodge',   label: 'Challenger Demon',      icon: '👿', mb: '5.6', prestige: 1 },
  { key: 'audi_tt', label: 'Audi TT Coupé',         icon: '⚫', mb: '5.9', prestige: 0 },
];

// ─── Preload fast/small models on mount ──────────────────────────────────────
// เปิดหน้า screen ปุ๊บ preload models ที่ใช้บ่อยไว้ใน cache
const PRELOAD_WATCHES: WatchKey[] = ['apple_watch', 'rolex', 'timex'];
const PRELOAD_CARS:    CarKey[]   = ['civic_r', 'gr86', 'viper'];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CustomizeScreen() {
  const characterData = useQuery(api.character.getMyCharacter);
  const saveEquip     = useMutation(api.character.saveEquipment);

  const [watchKey,  setWatchKey]  = useState<WatchKey | null>(null);
  const [carKey,    setCarKey]    = useState<CarKey   | null>(null);
  const [watchLoad, setWatchLoad] = useState(false);
  const [carLoad,   setCarLoad]   = useState(false);
  const [loadMs,    setLoadMs]    = useState<number | null>(null);

  const prestige = characterData?.prestigeLevel ?? 0;

  // Preload on mount
  React.useEffect(() => {
    const sources = [
      ...PRELOAD_WATCHES.map(k => WATCH_ASSETS[k]),
      ...PRELOAD_CARS.map(k => CAR_ASSETS[k]),
    ];
    preloadGLBs(sources); // fire and forget
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const selectWatch = useCallback((w: WatchEntry) => {
    if (w.prestige > prestige) {
      Alert.alert('🔒 Locked', `ต้อง Prestige ${w.prestige}`);
      return;
    }
    setWatchKey(w.key);
    saveEquip({ watchKey: w.key }).catch(() => {});
  }, [prestige, saveEquip]);

  const selectCar = useCallback((c: CarEntry) => {
    if (c.prestige > prestige) {
      Alert.alert('🔒 Locked', `ต้อง Prestige ${c.prestige}`);
      return;
    }
    setCarKey(c.key);
    saveEquip({ carKey: c.key }).catch(() => {});
  }, [prestige, saveEquip]);

  // ── Current time for watch display on SVG ─────────────────────────────────
  const now  = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>CUSTOMIZE</Text>

        {/* ── Preview Stage ── */}
        <View style={s.stage}>

          {/* Character + Watch viewer side by side */}
          <View style={s.sceneRow}>

            {/* SVG character (instant, always visible) */}
            <View style={s.charContainer}>
              <Svg viewBox="0 0 120 200" width={110} height={183}>
                <G>
                  {/* Body */}
                  <Rect x="50" y="72" width="20" height="16" rx="4" fill="#f5cba7"/>
                  <Rect x="32" y="86" width="56" height="60" rx="8" fill="#7c5af5"/>
                  <Rect x="14" y="88" width="20" height="46" rx="9" fill="#7c5af5"/>
                  <Rect x="86" y="88" width="20" height="46" rx="9" fill="#7c5af5"/>
                  <Ellipse cx="24" cy="139" rx="10" ry="8" fill="#f5cba7"/>
                  <Ellipse cx="96" cy="139" rx="10" ry="8" fill="#f5cba7"/>
                  <Rect x="38" y="144" width="20" height="42" rx="8" fill="#2e2a60"/>
                  <Rect x="62" y="144" width="20" height="42" rx="8" fill="#2e2a60"/>
                  <Ellipse cx="48" cy="188" rx="14" ry="8" fill="#1a1530"/>
                  <Ellipse cx="72" cy="188" rx="14" ry="8" fill="#1a1530"/>
                  {/* Face */}
                  <Ellipse cx="60" cy="54" rx="26" ry="28" fill="#f5cba7"/>
                  <Ellipse cx="51" cy="51" rx="4" ry="5" fill="#1a1530"/>
                  <Ellipse cx="69" cy="51" rx="4" ry="5" fill="#1a1530"/>
                  <Ellipse cx="52" cy="49" rx="1.5" ry="2" fill="white"/>
                  <Ellipse cx="70" cy="49" rx="1.5" ry="2" fill="white"/>
                  <Path d="M54 65 Q60 70 66 65" stroke="#c47040" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  {/* Hair */}
                  <Ellipse cx="60" cy="36" rx="28" ry="18" fill="#2c1810"/>
                  <Rect x="32" y="32" width="10" height="24" rx="5" fill="#2c1810"/>
                  <Rect x="78" y="32" width="10" height="24" rx="5" fill="#2c1810"/>
                  {/* Watch indicator dot on left wrist */}
                  {watchKey && (
                    <Ellipse cx="24" cy="132" rx="7" ry="5" fill="#f5a623" opacity={0.6}/>
                  )}
                </G>
              </Svg>

              {/* 3D Watch floats above wrist position */}
              {watchKey && (
                <View style={s.watchFloat}>
                  {watchLoad && <ActivityIndicator size="small" color="#f5a623" />}
                  <GLBViewer
                    source={WATCH_ASSETS[watchKey]}
                    width={70}
                    height={70}
                    autoRotate
                    autoRotateSpeed={1.5}
                    onLoadStart={() => setWatchLoad(true)}
                    onLoadEnd={(ms) => { setWatchLoad(false); setLoadMs(ms); }}
                    onError={() => setWatchLoad(false)}
                  />
                </View>
              )}
            </View>

            {/* 3D Car beside character */}
            <View style={s.carViewer}>
              {carKey ? (
                <>
                  {carLoad && (
                    <View style={s.carLoading}>
                      <ActivityIndicator size="large" color="#7c5af5"/>
                    </View>
                  )}
                  <GLBViewer
                    source={CAR_ASSETS[carKey]}
                    width={180}
                    height={130}
                    autoRotate
                    autoRotateSpeed={0.8}
                    onLoadStart={() => setCarLoad(true)}
                    onLoadEnd={(ms) => { setCarLoad(false); setLoadMs(ms); }}
                    onError={() => setCarLoad(false)}
                  />
                </>
              ) : (
                <View style={s.carEmpty}>
                  <Text style={s.carEmptyText}>🚗{'\n'}Select vehicle</Text>
                </View>
              )}
            </View>
          </View>

          {/* Slots + load time */}
          <View style={s.slotRow}>
            <View style={[s.slot, watchKey && s.slotOn]}>
              <Text style={s.slotTxt}>{watchKey ? WATCHES.find(w=>w.key===watchKey)?.label : 'Wrist — empty'}</Text>
            </View>
            <View style={[s.slot, carKey && s.slotOn]}>
              <Text style={s.slotTxt}>{carKey ? CARS.find(c=>c.key===carKey)?.label : 'Vehicle — empty'}</Text>
            </View>
          </View>
          {loadMs !== null && (
            <Text style={s.perfTxt}>⚡ Last load: {loadMs}ms</Text>
          )}
        </View>

        {/* ── Watch Grid ── */}
        <Section title="⌚  Watches">
          <View style={s.grid}>
            {WATCHES.map(w => (
              <TouchableOpacity
                key={w.key}
                style={[s.card, watchKey===w.key && s.cardOn, w.prestige>prestige && s.cardLocked]}
                onPress={() => selectWatch(w)}
                activeOpacity={0.75}
              >
                {watchKey === w.key && <Text style={s.checkBadge}>✓</Text>}
                {w.prestige > prestige && <Text style={s.lockBadge}>🔒P{w.prestige}</Text>}
                <Text style={s.cardIcon}>{w.icon}</Text>
                <Text style={s.cardLabel}>{w.label}</Text>
                <Text style={s.cardMb}>{w.mb}MB</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* ── Car Grid ── */}
        <Section title="🚗  Vehicles">
          <View style={[s.grid, s.grid3]}>
            {CARS.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[s.card, carKey===c.key && s.cardOn, c.prestige>prestige && s.cardLocked]}
                onPress={() => selectCar(c)}
                activeOpacity={0.75}
              >
                {carKey === c.key && <Text style={s.checkBadge}>✓</Text>}
                {c.prestige > prestige && <Text style={s.lockBadge}>🔒P{c.prestige}</Text>}
                <Text style={s.cardIcon}>{c.icon}</Text>
                <Text style={s.cardLabel}>{c.label}</Text>
                <Text style={s.cardMb}>{c.mb}MB</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

      </ScrollView>
    </SafeAreaView>
  );
}

const Section: React.FC<{title:string; children:React.ReactNode}> = ({title,children}) => (
  <View style={s.section}>
    <Text style={s.secTitle}>{title}</Text>
    {children}
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const DARK='#0a0812', PANEL='#110e24', BORDER='#231f3e';
const PURPLE='#7c5af5', GOLD='#f5a623', MUTED='#6b658a', GREEN='#2ecc71';

const s = StyleSheet.create({
  root:   { flex:1, backgroundColor: DARK },
  scroll: { padding:16, paddingBottom:40 },
  title:  { fontSize:14, color:GOLD, fontWeight:'900', textAlign:'center',
            letterSpacing:3, textTransform:'uppercase', marginBottom:16 },

  // Stage
  stage:   { backgroundColor:PANEL, borderRadius:20, padding:16, marginBottom:16,
             borderWidth:1, borderColor:BORDER },
  sceneRow:{ flexDirection:'row', alignItems:'flex-end', gap:10 },

  // Character
  charContainer: { position:'relative' },
  watchFloat: {
    position:'absolute',
    // left wrist of the SVG character: roughly x=8, y=118 (scaled)
    left: 0, top: 108,
    width:70, height:70,
    borderRadius:10, overflow:'hidden',
    backgroundColor:'#0a0812cc',
  },

  // Car
  carViewer: { flex:1, height:130, borderRadius:12, overflow:'hidden', backgroundColor:DARK },
  carLoading:{ ...StyleSheet.absoluteFillObject, alignItems:'center', justifyContent:'center',
               backgroundColor:'#0a0812aa', zIndex:10 },
  carEmpty:  { flex:1, alignItems:'center', justifyContent:'center' },
  carEmptyText:{ color:MUTED, fontSize:11, textAlign:'center', lineHeight:20 },

  // Slots
  slotRow:  { flexDirection:'row', gap:8, marginTop:12 },
  slot:     { flex:1, borderWidth:1.5, borderStyle:'dashed', borderColor:BORDER,
              borderRadius:8, padding:6 },
  slotOn:   { borderColor:GOLD, borderStyle:'solid', backgroundColor:'#f5a62308' },
  slotTxt:  { color:MUTED, fontSize:10, fontWeight:'700', textAlign:'center' },
  perfTxt:  { color:GREEN, fontSize:10, textAlign:'center', marginTop:6 },

  // Section
  section:  { backgroundColor:PANEL, borderRadius:14, borderWidth:1,
              borderColor:BORDER, padding:14, marginBottom:14 },
  secTitle: { color:MUTED, fontSize:10, fontWeight:'900', textTransform:'uppercase',
              letterSpacing:1.5, marginBottom:12 },

  // Grid
  grid:     { flexDirection:'row', flexWrap:'wrap', gap:8 },
  grid3:    {},

  // Cards
  card:     { width:'22%', backgroundColor:DARK, borderRadius:10, borderWidth:1,
              borderColor:BORDER, padding:8, alignItems:'center', gap:3, position:'relative' },
  cardOn:   { borderColor:GOLD, backgroundColor:'#f5a62310' },
  cardLocked:{ opacity:0.35 },
  cardIcon: { fontSize:20 },
  cardLabel:{ color:MUTED, fontSize:8, fontWeight:'700', textAlign:'center' },
  cardMb:   { color:'#333', fontSize:7 },
  checkBadge:{ position:'absolute', top:3, right:5, color:GREEN, fontSize:10, fontWeight:'900' },
  lockBadge: { position:'absolute', top:3, left:3, color:GOLD, fontSize:7 },
});
