import { useState, useCallback, useEffect, useRef } from 'react'
import * as Tone from 'tone'

export function usePianoAudio() {
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const [isReady, setIsReady] = useState(false)
  const initRef = useRef(false)

  const startAudio = useCallback(async () => {
    if (initRef.current) return
    initRef.current = true
    
    try {
      console.log('Starting Tone.js...')
      
      // Start Tone.js context with user gesture
      await Tone.start()
      console.log('Tone.start() completed')
      
      // Create polyphonic synth with nice piano-like sound
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle8' },
        envelope: {
          attack: 0.005,
          decay: 0.3,
          sustain: 0.4,
          release: 1.5
        }
      }).toDestination()
      
      synthRef.current.volume.value = -6
      setIsReady(true)
      console.log('Synth created and ready!')
    } catch (error) {
      console.error('Failed to initialize audio:', error)
      initRef.current = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.dispose()
        synthRef.current = null
      }
    }
  }, [])

  return { startAudio, isReady, synthRef }
}
