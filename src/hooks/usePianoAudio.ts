import { useState, useCallback, useEffect } from 'react'
import * as Tone from 'tone'

export function usePianoAudio(
  volume: number,
  synthRef: React.MutableRefObject<Tone.Sampler | Tone.PolySynth | null>
) {
  const [isReady, setIsReady] = useState(false)

  const startAudio = useCallback(async () => {
    // Ensure audio context is started
    if (Tone.getContext().state !== 'running') {
      await Tone.start()
    }
    
    if (!synthRef.current) {
      // Use PolySynth with a warmer sound
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: 'triangle8'
        },
        envelope: {
          attack: 0.005,
          decay: 0.3,
          sustain: 0.4,
          release: 1.2
        }
      }).toDestination()
      
      synthRef.current.volume.value = volume
      setIsReady(true)
    }
  }, [synthRef, volume])

  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.dispose()
        synthRef.current = null
      }
    }
  }, [])

  return { startAudio, isReady }
}
