import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  PanResponder,
} from 'react-native'
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import Entypo from '@expo/vector-icons/Entypo'
import { Feather } from '@expo/vector-icons'
import DropDownPicker from 'react-native-dropdown-picker'

import { useTheme } from '../utils/ThemeProvider'
import { Theme } from '../utils/Themes'

import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db, auth } from '../../firebaseConfig'

// ─── Ring Geometry ────────────────────────────────────────────────────────────
const CIRCLE_SIZE   = 300
const CIRCLE_RADIUS = CIRCLE_SIZE / 2    // 150
const RING_OUTER_R  = 140
const RING_INNER_R  = 110
const RING_WIDTH    = RING_OUTER_R - RING_INNER_R   // 30
const RING_CENTER_R = (RING_OUTER_R + RING_INNER_R) / 2  // 125 – handle sits here

// Half-disc ring dimensions
const DISC_SIZE   = RING_OUTER_R * 2                  // 280 – exact fit for disc
const DISC_OFFSET = CIRCLE_RADIUS - RING_OUTER_R      // 10  – centres disc inside container

const HANDLE_SIZE = 26

// ─── Time Constants ───────────────────────────────────────────────────────────
const MIN_MINUTES  = 10
const MAX_MINUTES  = 120
const STEP_MINUTES = 5

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minutes (10–120) → degrees (0° = top/12-o'clock, clockwise, 0–360) */
const minutesToAngle = (minutes: number): number =>
  ((Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, minutes)) - MIN_MINUTES) /
   (MAX_MINUTES - MIN_MINUTES)) * 360

/** Angle + radius → {x, y} inside the 300×300 container */
const polarToXY = (angleDeg: number, radius: number) => {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: CIRCLE_RADIUS + radius * Math.cos(rad), y: CIRCLE_RADIUS + radius * Math.sin(rad) }
}

/** Touch page coords → screen angle (0° = top, clockwise, 0–360) */
const pageToAngle = (px: number, py: number, cx: number, cy: number): number => {
  let a = Math.atan2(px - cx, -(py - cy)) * (180 / Math.PI)
  if (a < 0) a += 360
  return a
}

/** Snap raw minutes to nearest STEP_MINUTES boundary */
const snap = (raw: number) =>
  Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round(raw / STEP_MINUTES) * STEP_MINUTES))

// ─── Date Helpers ─────────────────────────────────────────────────────────────
const getTodayStr     = () => new Date().toISOString().split('T')[0]
const getYesterdayStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0] }

// ─── Smooth Progress Ring ─────────────────────────────────────────────────────
// Uses the half-disc rotation technique: two solid D-shaped discs (right + left),
// each clipped to their half of the container, rotating from -180° → 0° to reveal
// the arc progressively. Zero segments = mathematically smooth circle edges.
const ringS = StyleSheet.create({
  outer: { position: 'absolute', width: CIRCLE_SIZE, height: CIRCLE_SIZE },

  // Primary ring — always drawn underneath (360° arc)
  track: {
    position: 'absolute',
    left: DISC_OFFSET, top: DISC_OFFSET,
    width: DISC_SIZE, height: DISC_SIZE,
    borderRadius: RING_OUTER_R,
    borderWidth: RING_WIDTH,
    backgroundColor: 'transparent',
  },

  // CRITICAL: circular clip contains the D-disc's rotating square corners.
  // Without this, sharp corners at (0,0) and (0,280) sweep past radius 140
  // (they sit at √2·140 ≈ 198 from centre) and visibly square off the ring.
  outerClip: {
    position: 'absolute',
    left: DISC_OFFSET, top: DISC_OFFSET,
    width: DISC_SIZE, height: DISC_SIZE,
    borderRadius: RING_OUTER_R,
    overflow: 'hidden',
  },

  // Right / left halves live INSIDE outerClip — coords are relative to outerClip
  rightClip: {
    position: 'absolute', right: 0, top: 0,
    width: RING_OUTER_R, height: DISC_SIZE,
    overflow: 'hidden',
  },
  rightDisc: {
    position: 'absolute',
    left: -RING_OUTER_R, top: 0,
    width: DISC_SIZE, height: DISC_SIZE,
    borderTopRightRadius: RING_OUTER_R,
    borderBottomRightRadius: RING_OUTER_R,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  leftClip: {
    position: 'absolute', left: 0, top: 0,
    width: RING_OUTER_R, height: DISC_SIZE,
    overflow: 'hidden',
  },
  leftDisc: {
    position: 'absolute',
    left: 0, top: 0,
    width: DISC_SIZE, height: DISC_SIZE,
    borderTopLeftRadius: RING_OUTER_R,
    borderBottomLeftRadius: RING_OUTER_R,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },

  // Inner mask — punches the centre hole
  innerMask: {
    position: 'absolute',
    left: CIRCLE_RADIUS - RING_INNER_R, top: CIRCLE_RADIUS - RING_INNER_R,
    width: RING_INNER_R * 2, height: RING_INNER_R * 2,
    borderRadius: RING_INNER_R,
  },
})

interface ProgressRingProps { fillMinutes: number; theme: Theme }
const ProgressRing = React.memo(({ fillMinutes, theme }: ProgressRingProps) => {
  const fillAngle  = minutesToAngle(fillMinutes)
  const trackColor = theme.dark ? '#1e2e1e' : '#C4D0BB'
  const fillColor  = theme.colors.primary

  // COVER approach:
  //   1. Draw the FULL primary ring (360° arc) underneath.
  //   2. Place two grey D-shaped cover discs on top — one per half.
  //   3. Rotate each cover CCW to reveal the primary ring progressively.
  //
  // rightCoverRot = -min(fillAngle, 180):
  //   0° → cover sits at 12-o'clock clip edge  → hides 0°–180°  (no fill visible)
  //  -θ° → cover rotates CCW by θ              → reveals 0°–θ° of the ring
  // -180° → cover rotated fully away           → reveals entire right half
  //
  // leftCoverRot = -max(fillAngle-180, 0): same logic for the left half.
  //
  // The cover's straight diameter edge, when rotated, creates a clean RADIAL cut
  // at exactly the fill-angle position (perpendicular to the ring band) — this is
  // the arc's "butt cap" endpoint. The handle dot visually covers it.

  const rightCoverRot = `${-Math.min(fillAngle, 180)}deg`
  const leftCoverRot  = `${-Math.max(fillAngle - 180, 0)}deg`

  return (
    <View style={ringS.outer}>
      {/* Full primary ring — 360° arc, always drawn underneath */}
      <View style={[ringS.track, { borderColor: fillColor }]} />

      {/* Right grey cover — rotates CCW to uncover the right arc */}
      <View style={ringS.rightClip}>
        <View style={[ringS.rightDisc, {
          backgroundColor: trackColor,
          transform: [{ rotate: rightCoverRot }],
        }]} />
      </View>

      {/* Left grey cover — rotates CCW to uncover the left arc */}
      <View style={ringS.leftClip}>
        <View style={[ringS.leftDisc, {
          backgroundColor: trackColor,
          transform: [{ rotate: leftCoverRot }],
        }]} />
      </View>

      {/* Inner mask — punches the centre hole, hides solid disc interiors */}
      <View style={[ringS.innerMask, { backgroundColor: theme.colors.background }]} />
    </View>
  )
})

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation<any>()
  const { theme }  = useTheme()
  const styles     = useMemo(() => createStyles(theme), [theme])
  const USER_ID    = auth.currentUser?.uid

  const [streak,        setStreak]        = useState(0)
  const [lastFocusDate, setLastFocusDate] = useState<string | null>(null)

  const [open,  setOpen]  = useState(false)
  const [value, setValue] = useState('Study')
  const [items, setItems] = useState([
    { label: 'Study',     value: 'Study'    },
    { label: 'Relax',     value: 'Relax'    },
    { label: 'Exercise',  value: 'Exercise' },
    { label: 'Deep Work', value: 'DeepWork' },
    { label: 'Creative',  value: 'Creative' },
  ])

  const [subjectConfigs, setSubjectConfigs] = useState<
    Record<string, { focus: number; break: number; rounds: number }>
  >({
    Study:    { focus: 25, break: 5,  rounds: 4 },
    Relax:    { focus: 15, break: 5,  rounds: 2 },
    Exercise: { focus: 30, break: 10, rounds: 3 },
    DeepWork: { focus: 50, break: 10, rounds: 2 },
    Creative: { focus: 25, break: 5,  rounds: 3 },
  })

  const currentConfig = subjectConfigs[value] ?? { focus: 25, break: 5, rounds: 4 }

  const [timeLeft,      setTimeLeft]      = useState(currentConfig.focus * 60)
  const [isActive,      setIsActive]      = useState(false)
  const [isBreak,       setIsBreak]       = useState(false)
  const [currentRound,  setCurrentRound]  = useState(1)
  const [isModalVisible, setModalVisible] = useState(false)

  // ─── Refs (stale-closure-safe for PanResponder) ────────────────────────────
  const timerViewRef      = useRef<View>(null)
  const circleCenterRef   = useRef({ x: 0, y: 0 })
  const isActiveRef       = useRef(isActive)
  const subjectConfigsRef = useRef(subjectConfigs)
  const valueRef          = useRef(value)
  const prevDragAngleRef  = useRef<number | null>(null)

  useEffect(() => { isActiveRef.current       = isActive       }, [isActive])
  useEffect(() => { subjectConfigsRef.current = subjectConfigs }, [subjectConfigs])
  useEffect(() => { valueRef.current          = value          }, [value])

  // ─── Firebase ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!db || !USER_ID) return
    const ref = doc(db, 'users', USER_ID)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const d = snap.data()
        if (d.streak        !== undefined) setStreak(d.streak)
        if (d.lastFocusDate !== undefined) setLastFocusDate(d.lastFocusDate)
        if (d.subjectConfigs)             setSubjectConfigs(d.subjectConfigs)
      } else {
        setDoc(ref, { streak: 0, lastFocusDate: null, subjectConfigs })
      }
    })
    return () => unsub()
  }, [])

  // Reset on subject change
  useEffect(() => {
    setIsActive(false); setIsBreak(false); setCurrentRound(1)
    setTimeLeft((subjectConfigs[value]?.focus ?? 25) * 60)
  }, [value])

  // Keep timeLeft synced when idle
  useEffect(() => {
    if (!isActive)
      setTimeLeft((isBreak ? currentConfig.break : currentConfig.focus) * 60)
  }, [currentConfig.focus, currentConfig.break, isBreak, isActive])

  // ─── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | null = null
    if (isActive && timeLeft > 0) {
      iv = setInterval(() => setTimeLeft(t => t - 1), 1000)
    } else if (isActive && timeLeft === 0) {
      if (!isBreak) {
        if (currentRound < currentConfig.rounds) {
          setIsBreak(true); setTimeLeft(currentConfig.break * 60)
        } else {
          setIsActive(false); setIsBreak(false); setCurrentRound(1)
          setTimeLeft(currentConfig.focus * 60)
          const today = getTodayStr(), yesterday = getYesterdayStr()
          const ns = lastFocusDate === yesterday ? streak + 1 : lastFocusDate === today ? streak : 1
          updateDoc(doc(db, 'users', USER_ID as string), { streak: ns, lastFocusDate: today })
        }
      } else {
        setCurrentRound(r => r + 1); setIsBreak(false)
        setTimeLeft(currentConfig.focus * 60)
      }
    }
    return () => { if (iv) clearInterval(iv) }
  }, [isActive, timeLeft, isBreak, currentConfig, currentRound, streak, lastFocusDate])

  // ─── PanResponder ──────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        if (isActiveRef.current) return false
        const { pageX, pageY } = evt.nativeEvent
        const { x: cx, y: cy } = circleCenterRef.current
        const d = Math.hypot(pageX - cx, pageY - cy)
        // Respond only when touch is within the ring band
        return d > RING_INNER_R - 14 && d < RING_OUTER_R + 14
      },
      onMoveShouldSetPanResponder: (evt) => {
        if (isActiveRef.current) return false
        const { pageX, pageY } = evt.nativeEvent
        const { x: cx, y: cy } = circleCenterRef.current
        const d = Math.hypot(pageX - cx, pageY - cy)
        return d > RING_INNER_R - 14 && d < RING_OUTER_R + 14
      },
      onPanResponderGrant: () => {
        // Seed angle from current setting to avoid jump on first touch
        const cur = subjectConfigsRef.current[valueRef.current]?.focus ?? 25
        prevDragAngleRef.current = minutesToAngle(cur)
      },
      onPanResponderMove: (evt) => {
        if (isActiveRef.current) return
        const { pageX, pageY } = evt.nativeEvent
        const { x: cx, y: cy } = circleCenterRef.current
        let angle = pageToAngle(pageX, pageY, cx, cy)

        // Smooth wrap-around at 0°/360° boundary
        if (prevDragAngleRef.current !== null) {
          const diff = angle - prevDragAngleRef.current
          if (diff > 180)  angle -= 360
          if (diff < -180) angle += 360
          angle = Math.max(0, Math.min(360, angle))
        }
        prevDragAngleRef.current = angle

        // Raw → snap to nearest 5-min step
        const rawMin    = MIN_MINUTES + (angle / 360) * (MAX_MINUTES - MIN_MINUTES)
        const snapped   = snap(rawMin)
        const subject   = valueRef.current

        setSubjectConfigs(prev => ({
          ...prev,
          [subject]: { ...prev[subject], focus: snapped },
        }))
      },
      onPanResponderRelease: () => {
        prevDragAngleRef.current = null
        const uid = auth.currentUser?.uid
        if (uid)
          updateDoc(doc(db, 'users', uid), { subjectConfigs: subjectConfigsRef.current })
            .catch(console.error)
      },
    })
  ).current

  const measureCenter = () =>
    timerViewRef.current?.measure((_fx, _fy, w, h, px, py) => {
      circleCenterRef.current = { x: px + w / 2, y: py + h / 2 }
    })

  // ─── Visuals ───────────────────────────────────────────────────────────────
  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // Handle stays at SET position regardless of timer state
  const handleAngle = minutesToAngle(currentConfig.focus)
  const handlePos   = polarToXY(handleAngle, RING_CENTER_R)

  // Adjust break/rounds (modal)
  const adjustSetting = (type: 'break' | 'rounds', amount: number) =>
    setSubjectConfigs(prev => {
      const c = prev[value]
      return {
        ...prev,
        [value]: {
          ...c,
          break:  type === 'break'  ? Math.max(1, c.break  + amount) : c.break,
          rounds: type === 'rounds' ? Math.max(1, c.rounds + amount) : c.rounds,
        },
      }
    })

  const handleSaveSettings = async () => {
    if (!USER_ID) return
    try { await updateDoc(doc(db, 'users', USER_ID), { subjectConfigs }); setModalVisible(false) }
    catch { alert('Save error') }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={[styles.header, { zIndex: 1000 }]}>
        <View style={styles.coinBadge}>
          <Text style={styles.coinText}>🔥 {streak}</Text>
        </View>

        <View style={styles.dropdownContainer}>
          <DropDownPicker
            open={open} value={value} items={items}
            setOpen={setOpen} setValue={setValue} setItems={setItems}
            style={styles.dropdownBadge}
            dropDownContainerStyle={styles.dropdownList}
            textStyle={styles.dropdownText}
            showArrowIcon={false}
            tickIconStyle={{ display: 'none' } as any}
          />
        </View>

        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('CalendarScreen')}>
          <Entypo name="calendar" size={26} color={theme.colors.text1} />
        </TouchableOpacity>
      </View>

      {/* ── Status ── */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>
          {isActive
            ? (isBreak ? 'Take a break ☕️' : 'Focusing...')
            : (isBreak ? 'Ready to rest?' : 'Start feeding today 🐱')}
        </Text>
      </View>

      {/* ── Circular Ring Slider ── */}
      <View
        ref={timerViewRef}
        onLayout={measureCenter}
        style={styles.timerContainer}
        {...panResponder.panHandlers}
      >
        {/* 1. Smooth progress ring (half-disc rotation — perfectly round edges) */}
        <ProgressRing fillMinutes={currentConfig.focus} theme={theme} />

        {/* 2. Emoji in centre */}
        <View style={styles.centerContent} pointerEvents="none">
          <Text style={styles.animalImage}>{isBreak ? '💤' : '🐱'}</Text>
        </View>

        {/* 6. Draggable handle dot */}
        <View
          style={[styles.sliderHandle, {
            left: handlePos.x - HANDLE_SIZE / 2,
            top:  handlePos.y - HANDLE_SIZE / 2,
          }]}
        />
      </View>

      {/* ── Countdown ── */}
      <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>

      {/* ── FEED button only ── */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.feedButton, isActive && { backgroundColor: theme.colors.text2 }]}
          activeOpacity={0.8}
          onPress={() => setIsActive(a => !a)}
        >
          <Text style={styles.feedButtonText}>
            {isActive ? 'PAUSE' : isBreak ? 'REST' : 'FEED'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Settings modal (break + rounds) ── */}
      <Modal animationType="slide" transparent visible={isModalVisible} onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.modalTitle}>{value} Settings</Text>
              <Text style={styles.modalSubtitle}>
                Drag the ring to set focus time (10 min – 2 h, snaps every 5 min).{'\n'}
                Adjust break time and rounds below.
              </Text>

              {(['break', 'rounds'] as const).map(type => (
                <View key={type} style={styles.settingRow}>
                  <View>
                    <Text style={styles.inputLabel}>
                      {type === 'break' ? 'Break Duration' : 'Sessions (Rounds)'}
                    </Text>
                    <Text style={styles.helperText}>
                      {type === 'break' ? 'Set your break time' : 'How many rounds?'}
                    </Text>
                  </View>
                  <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepButton} onPress={() => adjustSetting(type, -1)}>
                      <Feather name="minus" size={20} color={theme.colors.text1} />
                    </TouchableOpacity>
                    <Text style={styles.stepText}>
                      {type === 'break' ? `${currentConfig.break} m` : currentConfig.rounds}
                    </Text>
                    <TouchableOpacity style={styles.stepButton} onPress={() => adjustSetting(type, 1)}>
                      <Feather name="plus" size={20} color={theme.colors.text1} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.confirmButton} onPress={handleSaveSettings}>
                <Text style={styles.confirmButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.background,
      paddingBottom: 28,
    },

    // Header
    header: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 25,
      paddingTop: 8,
    },
    coinBadge: {
      backgroundColor: 'rgba(255,255,255,0.5)',
      paddingVertical: 8, paddingHorizontal: 15,
      borderRadius: 20,
    },
    coinText:          { fontSize: 16, fontWeight: '700', color: theme.colors.text1 },
    iconButton:        { padding: 10 },
    dropdownContainer: { width: 155 },
    dropdownBadge: {
      backgroundColor: theme.colors.card,
      borderRadius: 25, borderWidth: 0,
      minHeight: 45, paddingHorizontal: 16,
    },
    dropdownList: {
      backgroundColor: '#FFF', borderWidth: 0, borderRadius: 20,
      marginTop: 5,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
    },
    dropdownText: {
      fontSize: 15, fontWeight: 'bold',
      color: theme.colors.text1, textAlign: 'center',
    },

    // Status
    titleContainer: { alignItems: 'center' },
    title: { fontSize: 22, fontWeight: '800', color: theme.colors.text1 },

    // Ring
    timerContainer: {
      position: 'relative',
      width: CIRCLE_SIZE, height: CIRCLE_SIZE,
      alignItems: 'center', justifyContent: 'center',
    },

    // Emoji
    centerContent: {
      position: 'absolute',
      alignItems: 'center', justifyContent: 'center',
    },
    animalImage: { fontSize: 92 },

    // Handle
    sliderHandle: {
      position: 'absolute',
      width: HANDLE_SIZE, height: HANDLE_SIZE,
      borderRadius: HANDLE_SIZE / 2,
      backgroundColor: theme.colors.primary,
      borderWidth: 3, borderColor: theme.colors.background,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
      zIndex: 10,
    },

    // Countdown
    timeText: {
      fontSize: 62, fontWeight: '800',
      color: theme.colors.text1,
      fontVariant: ['tabular-nums'], letterSpacing: 2,
    },

    // Feed button
    buttonRow: { alignItems: 'center', justifyContent: 'center' },
    feedButton: {
      backgroundColor: theme.colors.primary,
      width: 200, paddingVertical: 20, borderRadius: 40,
      alignItems: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
    },
    feedButtonText: {
      fontSize: 18, color: '#FFF',
      fontWeight: '800', letterSpacing: 3,
    },

    // Modal
    modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent:  {
      backgroundColor: '#F7F9F5',
      borderTopLeftRadius: 35, borderTopRightRadius: 35,
      paddingHorizontal: 30, paddingTop: 15, paddingBottom: 20,
    },
    modalHandle: {
      width: 50, height: 5, backgroundColor: '#D1D5DB',
      borderRadius: 5, alignSelf: 'center', marginBottom: 25,
    },
    modalTitle:    { fontSize: 26, fontWeight: '800', color: theme.colors.text1, marginBottom: 10 },
    modalSubtitle: { fontSize: 14, color: theme.colors.text2, lineHeight: 21, marginBottom: 30 },
    settingRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 20, backgroundColor: '#FFF', padding: 20, borderRadius: 25,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
    },
    inputLabel: { fontSize: 16, fontWeight: '800', color: theme.colors.text1, marginBottom: 4 },
    helperText:  { fontSize: 13, color: theme.colors.text2, fontWeight: '600' },
    stepper: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#E5EDDF', borderRadius: 20, padding: 5,
    },
    stepButton: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1, shadowRadius: 2, elevation: 1,
    },
    stepText: {
      fontSize: 16, fontWeight: '800', color: theme.colors.text1,
      width: 55, textAlign: 'center',
    },
    confirmButton: {
      width: '100%', paddingVertical: 18, borderRadius: 25,
      alignItems: 'center', backgroundColor: theme.colors.primary, marginTop: 10,
    },
    confirmButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  })
