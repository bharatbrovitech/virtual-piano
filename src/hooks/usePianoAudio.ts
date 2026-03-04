import { useState, useCallback, useEffect, useRef } from 'react'
import * as Tone from 'tone'

// Note name mapping: piano notes to sample files
// Using the Salamander Grand Piano samples from nbrosowsky/tonejs-instruments
// Naming convention: C2, Cs2 (C#2), Ds2 (D#2), etc.
const NOTE_TO_SAMPLE: Record<string, string> = {
  'C2': 'C2', 'C#2': 'Cs2', 'D2': 'D2', 'D#2': 'Ds2',
  'E2': 'E2', 'F2': 'F2', 'F#2': 'Fs2', 'G2': 'G2', 
  'G#2': 'Gs2', 'A2': 'A2', 'A#2': 'As2', 'B2': 'B2',
  'C3': 'C3', 'C#3': 'Cs3', 'D3': 'D3', 'D#3': 'Ds3',
  'E3': 'E3', 'F3': 'F3', 'F#3': 'Fs3', 'G3': 'G3', 
  'G#3': 'Gs3', 'A3': 'A3', 'A#3': 'As3', 'B3': 'B3',
  'C4': 'C4', 'C#4': 'Cs4', 'D4': 'D4', 'D#4': 'Ds4',
  'E4': 'E4', 'F4': 'F4', 'F#4': 'Fs4', 'G4': 'G4', 
  'G#4': 'Gs4', 'A4': 'A4', 'A#4': 'As4', 'B4': 'B4',
  'C5': 'C5', 'C#5': 'Cs5', 'D5': 'D5', 'D#5': 'Ds5',
  'E5': 'E5', 'F5': 'F5', 'F#5': 'Fs5', 'G5': 'G5', 
  'G#5': 'Gs5', 'A5': 'A5', 'A#5': 'As5', 'B5': 'B5',
  'C6': 'C6', 'C#6': 'Cs6', 'D6': 'D6', 'D#6': 'Ds6',
  'E6': 'E6', 'F6': 'F6', 'F#6': 'Fs6', 'G6': 'G6', 
}

// Build URLs object from NOTE_TO_SAMPLE
// Using nbrosowsky/tonejs-instruments samples (hosted on GitHub Pages)
const buildSampleUrls = () => {
  const urls: Record<string, string> = {}
  for (const [note, sampleName] of Object.entries(NOTE_TO_SAMPLE)) {
    urls[note] = `https://nbrosowsky.github.io/tonejs-instruments/samples/piano/${sampleName}.mp3`
  }
  return urls
}

export function usePianoAudio() {
  const samplerRef = useRef<Tone.Sampler | null>(null)
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const reverbRef = useRef<Tone.Reverb | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [useSamples, setUseSamples] = useState(true)
  const initRef = useRef(false)

  const startAudio = useCallback(async () => {
    if (initRef.current) {
      console.log('Audio already initialized')
      return
    }
    initRef.current = true
    setIsLoading(true)
    
    try {
      console.log('🎹 Starting Tone.js...')
      await Tone.start()
      console.log('✅ Tone.start() completed')
      
      // Create reverb effect
      reverbRef.current = new Tone.Reverb({
        decay: 2.5,
        wet: 0.3,
        preDelay: 0.01
      }).toDestination()
      
      // Try to load samples first
      console.log('🎵 Loading piano samples...')
      
      samplerRef.current = new Tone.Sampler({
        urls: buildSampleUrls(),
        release: 1,
        attack: 0.005,
        onload: () => {
          console.log('✅ Piano samples loaded successfully!')
          setUseSamples(true)
          setIsLoading(false)
          setIsReady(true)
        },
        onerror: (error) => {
          console.warn('⚠️ Sample loading failed, using AM synth:', error)
          setUseSamples(false)
          setIsLoading(false)
          // Create a better fallback synth using AM synthesis for a richer piano-like sound
          if (reverbRef.current) {
            synthRef.current = new Tone.PolySynth(Tone.AMSynth, {
              harmonicity: 2,
              oscillator: { type: 'triangle' },
              envelope: { attack: 0.002, decay: 0.5, sustain: 0.3, release: 1.2 },
              modulation: { type: 'square' },
              modulationEnvelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.5 }
            }).connect(reverbRef.current)
            synthRef.current.volume.value = -8
          }
          setIsReady(true)
        }
      }).connect(reverbRef.current!)
      
      samplerRef.current.volume.value = -6
      
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error)
      initRef.current = false
      setIsLoading(false)
    }
  }, [])

  // Play a note
  const triggerAttack = useCallback((note: string, velocity = 0.8) => {
    console.log(`🎹 Playing note: ${note} (velocity: ${velocity})`)
    
    if (useSamples && samplerRef.current) {
      try {
        samplerRef.current.triggerAttack(note, Tone.now(), velocity)
        console.log(`✅ Sample triggered: ${note}`)
      } catch (e) {
        console.error(`❌ Sample trigger failed for ${note}:`, e)
      }
    } else if (synthRef.current) {
      try {
        synthRef.current.triggerAttack(note, Tone.now(), velocity)
        console.log(`✅ Synth triggered: ${note}`)
      } catch (e) {
        console.error(`❌ Synth trigger failed for ${note}:`, e)
      }
    } else {
      console.warn('⚠️ No audio engine ready')
    }
  }, [useSamples])

  // Release a note
  const triggerRelease = useCallback((note: string) => {
    console.log(`🔇 Releasing note: ${note}`)
    
    if (useSamples && samplerRef.current) {
      try {
        // Sampler needs all notes released or use releaseAll
        samplerRef.current.triggerRelease(note, Tone.now())
        console.log(`✅ Sample released: ${note}`)
      } catch (e) {
        console.error(`❌ Sample release failed for ${note}:`, e)
      }
    } else if (synthRef.current) {
      try {
        synthRef.current.triggerRelease(note, Tone.now())
        console.log(`✅ Synth released: ${note}`)
      } catch (e) {
        console.error(`❌ Synth release failed for ${note}:`, e)
      }
    }
  }, [useSamples])

  // Release all notes (useful for sustain pedal release)
  const releaseAll = useCallback(() => {
    console.log('🔇 Releasing all notes')
    if (useSamples && samplerRef.current) {
      samplerRef.current.releaseAll(Tone.now())
    }
    if (synthRef.current) {
      synthRef.current.releaseAll()
    }
  }, [useSamples])

  const setVolume = useCallback((vol: number) => {
    if (samplerRef.current) samplerRef.current.volume.value = vol
    if (synthRef.current) synthRef.current.volume.value = vol
  }, [])

  const setReverb = useCallback((wet: number) => {
    if (reverbRef.current) reverbRef.current.wet.value = wet
  }, [])

  useEffect(() => {
    return () => {
      samplerRef.current?.dispose()
      synthRef.current?.dispose()
      reverbRef.current?.dispose()
    }
  }, [])

  return { 
    startAudio, 
    triggerAttack, 
    triggerRelease,
    releaseAll,
    setVolume, 
    setReverb, 
    isReady, 
    isLoading, 
    samplerRef,
    synthRef
  }
}
