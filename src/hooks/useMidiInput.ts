import { useState, useEffect, useCallback, useRef } from 'react'

interface MidiDevice {
  id: string
  name: string
}

interface UseMidiInputOptions {
  onNoteOn: (note: string, velocity: number) => void
  onNoteOff: (note: string) => void
  enabled?: boolean
}

export function useMidiInput({ onNoteOn, onNoteOff, enabled = true }: UseMidiInputOptions) {
  const [midiDevices, setMidiDevices] = useState<MidiDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const midiAccessRef = useRef<MIDIAccess | null>(null)
  const midiInputsRef = useRef<MIDIInputMap | null>(null)
  const activeNotesRef = useRef<Set<number>>(new Set())

  // Check MIDI support on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator) {
      setIsSupported(true)
    }
  }, [])

  // Request MIDI access and list devices
  const requestMidiAccess = useCallback(async () => {
    try {
      const midiAccess = await navigator.requestMIDIAccess()
      midiAccessRef.current = midiAccess
      midiInputsRef.current = midiAccess.inputs

      const devices: MidiDevice[] = []
      midiAccess.inputs.forEach((input) => {
        devices.push({ id: input.id, name: input.name || 'Unknown Device' })
      })
      setMidiDevices(devices)

      // Auto-connect to first device if available
      if (devices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(devices[0].id)
      } else if (selectedDeviceId) {
        // Re-verify the selected device still exists
        const deviceExists = devices.some(d => d.id === selectedDeviceId)
        if (!deviceExists && devices.length > 0) {
          setSelectedDeviceId(devices[0].id)
        }
      }

      // Listen for device changes
      midiAccess.onstatechange = () => {
        const updatedDevices: MidiDevice[] = []
        midiAccess.inputs.forEach((input) => {
          updatedDevices.push({ id: input.id, name: input.name || 'Unknown Device' })
        })
        setMidiDevices(updatedDevices)
        
        // Auto-connect to new device if none selected
        if (updatedDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(updatedDevices[0].id)
        }
      }

      return midiAccess
    } catch (error) {
      console.error('❌ MIDI access denied:', error)
      return null
    }
  }, [selectedDeviceId])

  // Connect to selected MIDI device
  useEffect(() => {
    if (!isSupported || !enabled || !midiInputsRef.current) return

    // If we have a selected device, connect to it
    if (selectedDeviceId) {
      const input = midiInputsRef.current.get(selectedDeviceId)
      
      if (input) {
        // Clear any previously active notes
        activeNotesRef.current.forEach(noteNum => {
          const noteName = midiNumToNote(noteNum)
          if (noteName) onNoteOff(noteName)
        })
        activeNotesRef.current.clear()

        input.onmidimessage = (event: MIDIMessageEvent) => {
          if (!event.data) return
          const [status, noteNum, velocity] = event.data
          const command = status & 0xf0

          // Note On
          if (command === 0x90 && velocity > 0) {
            activeNotesRef.current.add(noteNum)
            const noteName = midiNumToNote(noteNum)
            if (noteName) {
              console.log(`🎹 MIDI Note On: ${noteName} (velocity: ${velocity})`)
              onNoteOn(noteName, velocity / 127)
            }
          }
          // Note Off (or Note On with velocity 0)
          else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
            if (activeNotesRef.current.has(noteNum)) {
              activeNotesRef.current.delete(noteNum)
              const noteName = midiNumToNote(noteNum)
              if (noteName) {
                console.log(`🎹 MIDI Note Off: ${noteName}`)
                onNoteOff(noteName)
              }
            }
          }
        }

        console.log('🎹 Connected to MIDI device:', input.name)
      }
    }

    return () => {
      // Cleanup when device changes or component unmounts
      if (midiInputsRef.current && selectedDeviceId) {
        const input = midiInputsRef.current.get(selectedDeviceId)
        if (input) {
          input.onmidimessage = null
        }
      }
    }
  }, [selectedDeviceId, isSupported, enabled, onNoteOn, onNoteOff])

  // Convert MIDI number to note name
  const midiNumToNote = (num: number): string | null => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const octave = Math.floor(num / 12) - 1
    const noteIndex = num % 12
    return notes[noteIndex] !== undefined ? `${notes[noteIndex]}${octave}` : null
  }

  // Connect to a specific device
  const connectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId)
  }, [])

  // Disconnect current device
  const disconnectDevice = useCallback(() => {
    if (midiInputsRef.current && selectedDeviceId) {
      const input = midiInputsRef.current.get(selectedDeviceId)
      if (input) {
        input.onmidimessage = null
      }
    }
    activeNotesRef.current.forEach(noteNum => {
      const noteName = midiNumToNote(noteNum)
      if (noteName) onNoteOff(noteName)
    })
    activeNotesRef.current.clear()
    setSelectedDeviceId(null)
  }, [selectedDeviceId, onNoteOff])

  return {
    midiDevices,
    selectedDeviceId,
    isSupported,
    requestMidiAccess,
    connectDevice,
    disconnectDevice
  }
}
