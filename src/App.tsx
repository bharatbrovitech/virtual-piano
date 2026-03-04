import { useState, useCallback, useEffect, useRef } from 'react'
import * as Tone from 'tone'
import {
  Play,
  Pause,
  Square,
  Upload,
  Volume2,
  Repeat,
  SkipBack,
  SkipForward,
  Maximize2,
  Mic,
  ZoomIn,
  ZoomOut,
  Music,
  Keyboard
} from 'lucide-react'
import Piano from './components/Piano'
import { useKeyboardInput } from './hooks/useKeyboardInput'
import { usePianoAudio } from './hooks/usePianoAudio'

interface MidiNote {
  note: string
  velocity: number
  time: number
  duration: number
}

function App() {
  const [volume, setVolume] = useState(-6)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [tempo, setTempo] = useState(120)
  const [isLooping, setIsLooping] = useState(false)
  const [currentOctave, setCurrentOctave] = useState(3)
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set())
  const [midiNotes, setMidiNotes] = useState<MidiNote[]>([])
  const [midiFileName, setMidiFileName] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [, setRecordedNotes] = useState<MidiNote[]>([])
  const [metronomeEnabled, setMetronomeEnabled] = useState(false)
  const [showLetters, setShowLetters] = useState(true)
  const [showKeys, setShowKeys] = useState(true)
  const [isFullOctave, setIsFullOctave] = useState(false)
  const [isSustained, setIsSustained] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const metronomeRef = useRef<Tone.Synth | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const recordedStartTimeRef = useRef<number>(0)
  const midiNotesRef = useRef<MidiNote[]>([])
  const sustainedNotesRef = useRef<Set<string>>(new Set())
  
  const { startAudio } = usePianoAudio(volume, synthRef)
  
  const playNote = useCallback(async (note: string, velocity = 0.8) => {
    if (!synthRef.current) {
      await startAudio()
    }
    if (synthRef.current) {
      if (isSustained) {
        sustainedNotesRef.current.add(note)
      }
      synthRef.current.triggerAttack(note, Tone.now(), velocity)
    }
    if (isRecording) {
      setRecordedNotes(prev => [...prev, {
        note,
        velocity,
        time: Tone.now() - recordedStartTimeRef.current,
        duration: 0
      }])
    }
  }, [isRecording, isSustained, startAudio])
  
  const stopNote = useCallback((note: string) => {
    if (synthRef.current) {
      if (isSustained) {
        // Don't stop - sustain pedal is held
      } else {
        sustainedNotesRef.current.delete(note)
        synthRef.current.triggerRelease(note, Tone.now())
      }
    }
  }, [isSustained])

  const releaseAllSustained = useCallback(() => {
    if (synthRef.current && sustainedNotesRef.current.size > 0) {
      sustainedNotesRef.current.forEach(note => {
        synthRef.current?.triggerRelease(note, Tone.now())
      })
      sustainedNotesRef.current.clear()
    }
  }, [])

  const handleKeyDown = useCallback((note: string) => {
    setActiveKeys(prev => new Set(prev).add(note))
    playNote(note)
  }, [playNote])

  const handleKeyUp = useCallback((note: string) => {
    setActiveKeys(prev => {
      const next = new Set(prev)
      next.delete(note)
      return next
    })
    stopNote(note)
  }, [stopNote])

  useKeyboardInput({
    currentOctave,
    onNoteOn: handleKeyDown,
    onNoteOff: handleKeyUp,
    onSustain: (sustain) => {
      setIsSustained(sustain)
      if (!sustain) {
        releaseAllSustained()
      }
    }
  })

  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.volume.value = volume
    }
  }, [volume])

  useEffect(() => {
    Tone.getTransport().bpm.value = tempo
  }, [tempo])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setMidiFileName(file.name)
    
    const arrayBuffer = await file.arrayBuffer()
    const midiData = new Uint8Array(arrayBuffer)
    
    const notes: MidiNote[] = []
    let offset = 0
    
    if (midiData[0] === 0x4D && midiData[1] === 0x54 && midiData[2] === 0x68 && midiData[3] === 0x64) {
      offset = 22
    }
    
    while (offset < midiData.length) {
      if (midiData[offset] === 0x4D && midiData[offset + 1] === 0x54 && 
          midiData[offset + 2] === 0x72 && midiData[offset + 3] === 0x6B) {
        offset += 8
        let runningStatus = 0
        let time = 0
        
        while (offset < midiData.length) {
          let deltaTime = 0
          let bytesRead = 0
          for (let i = 0; i < 4; i++) {
            deltaTime = (deltaTime << 7) | (midiData[offset + i] & 0x7F)
            bytesRead++
            if ((midiData[offset + i] & 0x80) === 0) break
          }
          offset += bytesRead
          time += deltaTime / 1000
          
          let status = midiData[offset]
          if (status === undefined) break
          
          if ((status & 0x80) === 0) {
            status = runningStatus
            offset--
          }
          
          runningStatus = status
          const eventType = status & 0xF0
          
          if (eventType === 0x90 && midiData[offset + 2] > 0) {
            const noteNum = midiData[offset + 1]
            const velocity = midiData[offset + 2] / 127
            const noteName = midiNumToNote(noteNum)
            if (noteName) {
              notes.push({ note: noteName, velocity, time, duration: 0.5 })
            }
            offset += 3
          } else if (eventType === 0x80 || (eventType === 0x90 && midiData[offset + 2] === 0)) {
            offset += 3
          } else if (status === 0xFF) {
            const metaType = midiData[offset + 1]
            let metaLength = midiData[offset + 2]
            offset += 3 + metaLength
            if (metaType === 0x2F) break
          } else {
            offset++
          }
        }
      } else {
        offset++
      }
    }
    
    notes.sort((a, b) => a.time - b.time)
    
    for (let i = 0; i < notes.length - 1; i++) {
      notes[i].duration = notes[i + 1].time - notes[i].time
    }
    if (notes.length > 0) {
      notes[notes.length - 1].duration = 0.5
    }
    
    midiNotesRef.current = notes
    setMidiNotes(notes)
  }

  const midiNumToNote = (num: number): string | null => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const octave = Math.floor(num / 12) - 1
    const note = notes[num % 12]
    return note ? `${note}${octave}` : null
  }

  const playMidi = useCallback(async () => {
    if (midiNotesRef.current.length === 0) return
    
    if (!synthRef.current) {
      await startAudio()
    }
    
    setIsPlaying(true)
    setIsPaused(false)
    
    Tone.getTransport().position = 0
    Tone.getTransport().start()
    
    let noteIndex = 0
    const notes = midiNotesRef.current
    
    const scheduleNote = () => {
      if (!isPlaying || isPaused) return
      
      while (noteIndex < notes.length) {
        const midiNote = notes[noteIndex]
        const timeInSeconds = midiNote.time * (120 / tempo)
        
        if (Tone.getTransport().seconds >= timeInSeconds) {
          setActiveKeys(prev => new Set(prev).add(midiNote.note))
          if (synthRef.current) {
            synthRef.current.triggerAttackRelease(
              midiNote.note,
              midiNote.duration,
              Tone.now(),
              midiNote.velocity
            )
          }
          noteIndex++
        } else {
          break
        }
      }
      
      if (noteIndex >= notes.length) {
        if (isLooping) {
          noteIndex = 0
          Tone.getTransport().position = 0
        } else {
          setIsPlaying(false)
          setActiveKeys(new Set())
          return
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(scheduleNote)
    }
    
    scheduleNote()
  }, [tempo, isLooping, isPlaying, isPaused, startAudio])

  const pauseMidi = () => {
    setIsPaused(true)
    Tone.getTransport().pause()
  }

  const stopMidi = () => {
    setIsPlaying(false)
    setIsPaused(false)
    setActiveKeys(new Set())
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const toggleRecording = async () => {
    if (!isRecording) {
      await startAudio()
      recordedStartTimeRef.current = Tone.now()
      setRecordedNotes([])
      setIsRecording(true)
    } else {
      setIsRecording(false)
    }
  }

  const toggleMetronome = async () => {
    if (!metronomeEnabled) {
      await startAudio()
      if (!metronomeRef.current) {
        metronomeRef.current = new Tone.Synth({
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).toDestination()
        metronomeRef.current.volume.value = -12
      }
      setMetronomeEnabled(true)
    } else {
      setMetronomeEnabled(false)
    }
  }

  useEffect(() => {
    if (!metronomeEnabled || !metronomeRef.current) return
    
    const loop = new Tone.Loop((time) => {
      metronomeRef.current?.triggerAttackRelease('C5', '32n', time)
    }, '4n').start(0)
    
    return () => {
      loop.dispose()
    }
  }, [metronomeEnabled])

  const numOctaves = isFullOctave ? 7 : 5

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#0f0f23] flex flex-col">
      {/* Header */}
      <header className="p-3 flex items-center justify-between border-b border-white/10 bg-[#16162a]">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          🎹 Virtual Piano
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Fullscreen"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="p-2 flex flex-wrap gap-2 items-center justify-center border-b border-white/5 bg-[#16162a]/50">
        {/* Volume */}
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
          <Volume2 size={16} className="text-purple-400" />
          <input
            type="range"
            min="-24"
            max="0"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-16 accent-purple-500"
          />
          <span className="text-xs text-slate-400 w-8">{volume}</span>
        </div>

        {/* Octave */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1.5">
          <button
            onClick={() => setCurrentOctave(prev => Math.max(1, prev - 1))}
            className="p-1 hover:bg-white/10 rounded disabled:opacity-50"
            disabled={currentOctave <= 1}
          >
            <SkipBack size={16} />
          </button>
          <span className="text-xs w-14 text-center">Oct {currentOctave}</span>
          <button
            onClick={() => setCurrentOctave(prev => Math.min(6, prev + 1))}
            className="p-1 hover:bg-white/10 rounded disabled:opacity-50"
            disabled={currentOctave >= 6}
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1.5">
          <button
            onClick={() => setIsFullOctave(false)}
            className={`p-1 rounded ${!isFullOctave ? 'bg-purple-500/30 text-purple-300' : 'hover:bg-white/10'}`}
            title="5 Octaves"
          >
            <ZoomOut size={16} />
          </button>
          <button
            onClick={() => setIsFullOctave(true)}
            className={`p-1 rounded ${isFullOctave ? 'bg-purple-500/30 text-purple-300' : 'hover:bg-white/10'}`}
            title="7 Octaves (Full)"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Toggle Letter Notes */}
        <button
          onClick={() => setShowLetters(!showLetters)}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
            showLetters ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-400'
          }`}
        >
          <Music size={14} /> Letters
        </button>

        {/* Toggle Real Keys */}
        <button
          onClick={() => setShowKeys(!showKeys)}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
            showKeys ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-400'
          }`}
        >
          <Keyboard size={14} /> Keys
        </button>

        {/* Sustain */}
        <button
          onClick={() => {
            setIsSustained(!isSustained)
            if (isSustained) releaseAllSustained()
          }}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
            isSustained ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-slate-400'
          }`}
        >
          ◯ Sustain
        </button>

        {/* MIDI Upload */}
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".mid,.midi"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs hover:text-purple-400 transition-colors"
          >
            <Upload size={14} />
            {midiFileName ? midiFileName.slice(0, 12) + '...' : 'MIDI'}
          </button>
        </div>

        {/* MIDI Controls */}
        {midiNotes.length > 0 && (
          <>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1.5">
              {!isPlaying ? (
                <button
                  onClick={playMidi}
                  className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 p-1"
                >
                  <Play size={14} />
                </button>
              ) : isPaused ? (
                <button
                  onClick={() => { setIsPaused(false); Tone.getTransport().start() }}
                  className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 p-1"
                >
                  <Play size={14} />
                </button>
              ) : (
                <button
                  onClick={pauseMidi}
                  className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300 p-1"
                >
                  <Pause size={14} />
                </button>
              )}
              <button
                onClick={stopMidi}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 p-1"
              >
                <Square size={14} />
              </button>
            </div>

            {/* Tempo */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1.5">
              <input
                type="range"
                min="40"
                max="240"
                value={tempo}
                onChange={(e) => setTempo(Number(e.target.value))}
                className="w-14 accent-purple-500"
              />
              <span className="text-xs text-slate-400 w-8">{tempo}</span>
            </div>

            {/* Loop */}
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-1.5 rounded-lg transition-colors ${
                isLooping ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-slate-400'
              }`}
            >
              <Repeat size={14} />
            </button>
          </>
        )}

        {/* Record */}
        <button
          onClick={toggleRecording}
          className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${
            isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 text-slate-400'
          }`}
        >
          <Mic size={14} />
        </button>

        {/* Metronome */}
        <button
          onClick={toggleMetronome}
          className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${
            metronomeEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-400'
          }`}
        >
          🎵
        </button>
      </div>

      {/* Piano */}
      <main className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div className="bg-gradient-to-b from-[#2d2d4a] to-[#1a1a2e] p-4 rounded-lg shadow-2xl border border-white/10">
          <Piano
            startOctave={currentOctave}
            numOctaves={numOctaves}
            activeKeys={activeKeys}
            onNoteOn={handleKeyDown}
            onNoteOff={handleKeyUp}
            showLetters={showLetters}
            showKeys={showKeys}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="p-2 text-center text-xs text-slate-500 border-t border-white/5">
        <p>Keys: Z S X D C V G B H N J M (Oct {currentOctave+1}) | Q W E R T Y U (Oct {currentOctave+2}) | Space: Sustain</p>
      </footer>
    </div>
  )
}

export default App
