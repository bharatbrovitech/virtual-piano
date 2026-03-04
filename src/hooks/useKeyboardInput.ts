import { useEffect, useCallback, useRef } from 'react'

interface UseKeyboardInputProps {
  currentOctave: number
  onNoteOn: (note: string) => void
  onNoteOff: (note: string) => void
  onSustain?: (sustain: boolean) => void
}

const KEY_TO_NOTE_LOWER: Record<string, string> = {
  'z': 'C',
  's': 'C#',
  'x': 'D',
  'd': 'D#',
  'c': 'E',
  'v': 'F',
  'g': 'F#',
  'b': 'G',
  'h': 'G#',
  'n': 'A',
  'j': 'A#',
  'm': 'B'
}

const KEY_TO_NOTE_UPPER: Record<string, string> = {
  'q': 'C',
  '2': 'C#',
  'w': 'D',
  '3': 'D#',
  'e': 'E',
  'r': 'F',
  '5': 'F#',
  't': 'G',
  '6': 'G#',
  'y': 'A',
  '7': 'A#',
  'u': 'B'
}

export function useKeyboardInput({
  currentOctave,
  onNoteOn,
  onNoteOff,
  onSustain
}: UseKeyboardInputProps) {
  const activeKeysRef = useRef<Set<string>>(new Set())
  const sustainRef = useRef(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat) return
    
    const key = e.key.toLowerCase()
    
    // Handle sustain pedal
    if (e.code === 'Space') {
      e.preventDefault()
      sustainRef.current = true
      onSustain?.(true)
      return
    }

    // Lower octave keys (Z-M)
    if (KEY_TO_NOTE_LOWER[key]) {
      e.preventDefault()
      const note = KEY_TO_NOTE_LOWER[key]
      const fullNote = `${note}${currentOctave + 1}`
      
      if (!activeKeysRef.current.has(fullNote)) {
        activeKeysRef.current.add(fullNote)
        onNoteOn(fullNote)
      }
      return
    }

    // Upper octave keys (Q-U)
    if (KEY_TO_NOTE_UPPER[key]) {
      e.preventDefault()
      const note = KEY_TO_NOTE_UPPER[key]
      const fullNote = `${note}${currentOctave + 2}`
      
      if (!activeKeysRef.current.has(fullNote)) {
        activeKeysRef.current.add(fullNote)
        onNoteOn(fullNote)
      }
      return
    }
  }, [currentOctave, onNoteOn, onSustain])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase()
    
    // Handle sustain pedal
    if (e.code === 'Space') {
      e.preventDefault()
      sustainRef.current = false
      onSustain?.(false)
      return
    }

    // Lower octave keys
    if (KEY_TO_NOTE_LOWER[key]) {
      e.preventDefault()
      const note = KEY_TO_NOTE_LOWER[key]
      const fullNote = `${note}${currentOctave + 1}`
      
      if (activeKeysRef.current.has(fullNote)) {
        activeKeysRef.current.delete(fullNote)
        onNoteOff(fullNote)
      }
      return
    }

    // Upper octave keys
    if (KEY_TO_NOTE_UPPER[key]) {
      e.preventDefault()
      const note = KEY_TO_NOTE_UPPER[key]
      const fullNote = `${note}${currentOctave + 2}`
      
      if (activeKeysRef.current.has(fullNote)) {
        activeKeysRef.current.delete(fullNote)
        onNoteOff(fullNote)
      }
      return
    }
  }, [currentOctave, onNoteOff])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])
}
