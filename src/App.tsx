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
  Keyboard,
  Eye,
  EyeOff
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

interface FallingNote {
  note: string
  startTime: number
  endTime: number
  velocity: number
  color: string
  lane: number
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
  const [showFallingNotes, setShowFallingNotes] = useState(true)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const synthRef = useRef<Tone.PolySynth | null>(null)
  const metronomeRef = useRef<Tone.Synth | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const recordedStartTimeRef = useRef<number>(0)
  const midiNotesRef = useRef<MidiNote[]>([])
  const sustainedNotesRef = useRef<Set<string>>(new Set())
  const fallingNotesRef = useRef<FallingNote[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playbackStartTimeRef = useRef<number>(0)
  const canvasAnimationRef = useRef<number | null>(null)
  
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
      setRecordedNotes(prev => [...prev, { note, velocity, time: Tone.now() - recordedStartTimeRef.current, duration: 0 }])
    }
  }, [isRecording, isSustained, startAudio])
  
  const stopNote = useCallback((note: string) => {
    if (synthRef.current) {
      if (!isSustained) {
        sustainedNotesRef.current.delete(note)
        synthRef.current.triggerRelease(note, Tone.now())
      }
    }
  }, [isSustained])

  const releaseAllSustained = useCallback(() => {
    if (synthRef.current && sustainedNotesRef.current.size > 0) {
      sustainedNotesRef.current.forEach(note => synthRef.current?.triggerRelease(note, Tone.now()))
      sustainedNotesRef.current.clear()
    }
  }, [])

  const handleKeyDown = useCallback((note: string) => {
    setActiveKeys(prev => new Set(prev).add(note))
    playNote(note)
  }, [playNote])

  const handleKeyUp = useCallback((note: string) => {
    setActiveKeys(prev => { const next = new Set(prev); next.delete(note); return next })
    stopNote(note)
  }, [stopNote])

  useKeyboardInput({
    currentOctave,
    onNoteOn: handleKeyDown,
    onNoteOff: handleKeyUp,
    onSustain: (sustain) => {
      setIsSustained(sustain)
      if (!sustain) releaseAllSustained()
    }
  })

  useEffect(() => { if (synthRef.current) synthRef.current.volume.value = volume }, [volume])
  useEffect(() => { Tone.getTransport().bpm.value = tempo }, [tempo])

  const noteToLane = (note: string): number => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const match = note.match(/^([A-G]#?)(\d+)$/)
    if (!match) return -1
    const [, noteName, octaveStr] = match
    const octave = parseInt(octaveStr)
    const noteIndex = noteNames.indexOf(noteName)
    if (noteIndex === -1) return -1
    return (octave + 1) * 12 + noteIndex
  }

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !showFallingNotes) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      const width = canvas.width
      const height = canvas.height
      const laneWidth = width / 88
      const currentTime = isPlaying && !isPaused ? (Tone.now() - playbackStartTimeRef.current) * (tempo / 120) : 0

      ctx.clearRect(0, 0, width, height)

      // Draw lanes
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      for (let i = 0; i <= 88; i++) { ctx.beginPath(); ctx.moveTo(i * laneWidth, 0); ctx.lineTo(i * laneWidth, height); ctx.stroke() }

      // Draw falling notes
      fallingNotesRef.current.forEach((note) => {
        const lane = noteToLane(note.note)
        if (lane < 0) return
        const x = lane * laneWidth
        const noteHeight = 20
        const barWidth = laneWidth - 4
        const timeUntilPlay = (note.startTime - currentTime) * 50
        const y = height - timeUntilPlay - noteHeight

        if (y > -noteHeight && y < height + 50) {
          const hue = note.velocity * 120
          ctx.fillStyle = `hsl(${hue}, 70%, 60%)`
          ctx.beginPath()
          ctx.roundRect(x + 2, y, barWidth, noteHeight, 4)
          ctx.fill()
          ctx.shadowColor = `hsl(${hue}, 70%, 60%)`
          ctx.shadowBlur = 10
          ctx.fill()
          ctx.shadowBlur = 0
        }

        // Sustained notes
        if (note.endTime > note.startTime) {
          const endTimeUntilPlay = (note.endTime - currentTime) * 50
          const endY = height - endTimeUntilPlay - noteHeight
          if (endY > 0 && endY < height) {
            ctx.fillStyle = `hsla(${note.velocity * 120}, 70%, 60%, 0.3)`
            ctx.fillRect(x + 2, endY, barWidth, y - endY)
          }
        }
      })

      // Playhead
      const playheadY = height - 30
      ctx.strokeStyle = '#8b5cf6'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, playheadY)
      ctx.lineTo(width, playheadY)
      ctx.stroke()
      ctx.shadowColor = '#8b5cf6'
      ctx.shadowBlur = 15
      ctx.stroke()
      ctx.shadowBlur = 0

      canvasAnimationRef.current = requestAnimationFrame(render)
    }
    render()
    return () => { if (canvasAnimationRef.current) cancelAnimationFrame(canvasAnimationRef.current) }
  }, [showFallingNotes, isPlaying, isPaused, tempo])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMidiFileName(file.name)
    const arrayBuffer = await file.arrayBuffer()
    const midiData = new Uint8Array(arrayBuffer)
    const notes: MidiNote[] = []
    let offset = 0
    if (midiData[0] === 0x4D && midiData[1] === 0x54 && midiData[2] === 0x68 && midiData[3] === 0x64) offset = 22
    
    while (offset < midiData.length) {
      if (midiData[offset] === 0x4D && midiData[offset + 1] === 0x54 && midiData[offset + 2] === 0x72 && midiData[offset + 3] === 0x6B) {
        offset += 8
        let runningStatus = 0
        let time = 0
        while (offset < midiData.length) {
          let deltaTime = 0, bytesRead = 0
          for (let i = 0; i < 4; i++) { deltaTime = (deltaTime << 7) | (midiData[offset + i] & 0x7F); bytesRead++; if ((midiData[offset + i] & 0x80) === 0) break }
          offset += bytesRead
          time += deltaTime / 1000
          let status = midiData[offset]
          if (status === undefined) break
          if ((status & 0x80) === 0) { status = runningStatus; offset-- }
          runningStatus = status
          const eventType = status & 0xF0
          if (eventType === 0x90 && midiData[offset + 2] > 0) {
            const noteNum = midiData[offset + 1]
            const velocity = midiData[offset + 2] / 127
            const noteName = midiNumToNote(noteNum)
            if (noteName) notes.push({ note: noteName, velocity, time, duration: 0.5 })
            offset += 3
          } else if (eventType === 0x80 || (eventType === 0x90 && midiData[offset + 2] === 0)) {
            offset += 3
          } else if (status === 0xFF) {
            const metaType = midiData[offset + 1]
            let metaLength = midiData[offset + 2]
            offset += 3 + metaLength
            if (metaType === 0x2F) break
          } else { offset++ }
        }
      } else { offset++ }
    }
    
    notes.sort((a, b) => a.time - b.time)
    for (let i = 0; i < notes.length - 1; i++) notes[i].duration = notes[i + 1].time - notes[i].time
    if (notes.length > 0) notes[notes.length - 1].duration = 0.5
    
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
    fallingNotesRef.current = notes.map((note, i) => ({
      note: note.note,
      velocity: note.velocity,
      startTime: note.time,
      endTime: note.time + note.duration,
      color: colors[i % colors.length],
      lane: 0
    }))
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
    if (!synthRef.current) await startAudio()
    setIsPlaying(true)
    setIsPaused(false)
    playbackStartTimeRef.current = Tone.now()
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
          if (synthRef.current) synthRef.current.triggerAttackRelease(midiNote.note, midiNote.duration, Tone.now(), midiNote.velocity)
          noteIndex++
        } else break
      }
      if (noteIndex >= notes.length) {
        if (isLooping) { noteIndex = 0; playbackStartTimeRef.current = Tone.now(); Tone.getTransport().position = 0 }
        else { setIsPlaying(false); setActiveKeys(new Set()); return }
      }
      animationFrameRef.current = requestAnimationFrame(scheduleNote)
    }
    scheduleNote()
  }, [tempo, isLooping, isPlaying, isPaused, startAudio])

  const pauseMidi = () => { setIsPaused(true); Tone.getTransport().pause() }
  const stopMidi = () => { setIsPlaying(false); setIsPaused(false); setActiveKeys(new Set()); Tone.getTransport().stop(); Tone.getTransport().position = 0; if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) }

  const toggleFullscreen = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen() }

  const toggleRecording = async () => {
    if (!isRecording) { await startAudio(); recordedStartTimeRef.current = Tone.now(); setRecordedNotes([]); setIsRecording(true) }
    else setIsRecording(false)
  }

  const toggleMetronome = async () => {
    if (!metronomeEnabled) {
      await startAudio()
      if (!metronomeRef.current) {
        metronomeRef.current = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination()
        metronomeRef.current.volume.value = -12
      }
      setMetronomeEnabled(true)
    } else setMetronomeEnabled(false)
  }

  useEffect(() => {
    if (!metronomeEnabled || !metronomeRef.current) return
    const loop = new Tone.Loop((time) => metronomeRef.current?.triggerAttackRelease('C5', '32n', time), '4n').start(0)
    return () => { loop.dispose() }
  }, [metronomeEnabled])

  const numOctaves = isFullOctave ? 7 : 5

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#0f0f23] flex flex-col">
      {showFallingNotes && midiNotes.length > 0 && (
        <canvas ref={canvasRef} width={1400} height={300} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20" style={{ maxWidth: '90vw' }} />
      )}

      <header className="p-3 flex items-center justify-between border-b border-white/10 bg-[#16162a]">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">🎹 Virtual Piano</h1>
        <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-white/10"><Maximize2 size={18} /></button>
      </header>

      <div className="p-2 flex flex-wrap gap-2 items-center justify-center border-b border-white/5 bg-[#16162a]/50">
        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
          <Volume2 size={16} className="text-purple-400" />
          <input type="range" min="-24" max="0" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-16 accent-purple-500" />
          <span className="text-xs text-slate-400 w-8">{volume}</span>
        </div>

        <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1.5">
          <button onClick={() => setCurrentOctave(prev => Math.max(1, prev - 1))} disabled={currentOctave <= 1} className="p-1 hover:bg-white/10 rounded disabled:opacity-50"><SkipBack size={16} /></button>
          <span className="text-xs w-14 text-center">Oct {currentOctave}</span>
          <button onClick={() => setCurrentOctave(prev => Math.min(6, prev + 1))} disabled={currentOctave >= 6} className="p-1 hover:bg-white/10 rounded disabled:opacity-50"><SkipForward size={16} /></button>
        </div>

        <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1.5">
          <button onClick={() => setIsFullOctave(false)} className={`p-1 rounded ${!isFullOctave ? 'bg-purple-500/30 text-purple-300' : 'hover:bg-white/10'}`}><ZoomOut size={16} /></button>
          <button onClick={() => setIsFullOctave(true)} className={`p-1 rounded ${isFullOctave ? 'bg-purple-500/30 text-purple-300' : 'hover:bg-white/10'}`}><ZoomIn size={16} /></button>
        </div>

        <button onClick={() => setShowLetters(!showLetters)} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg ${showLetters ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-400'}`}><Music size={14} /> Letters</button>
        <button onClick={() => setShowKeys(!showKeys)} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg ${showKeys ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-400'}`}><Keyboard size={14} /> Keys</button>
        <button onClick={() => setShowFallingNotes(!showFallingNotes)} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg ${showFallingNotes ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-slate-400'}`}>{showFallingNotes ? <Eye size={14} /> : <EyeOff size={14} />} Synthesia</button>
        
        <button onClick={() => { setIsSustained(!isSustained); if (isSustained) releaseAllSustained() }} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg ${isSustained ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-slate-400'}`}>◯ Sustain</button>

        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
          <input ref={fileInputRef} type="file" accept=".mid,.midi" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 text-xs hover:text-purple-400"><Upload size={14} />{midiFileName ? midiFileName.slice(0, 12) + '...' : 'MIDI'}</button>
        </div>

        {midiNotes.length > 0 && (
          <>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1.5">
              {!isPlaying ? <button onClick={playMidi} className="text-green-400 p-1"><Play size={14} /></button> : isPaused ? <button onClick={() => { setIsPaused(false); Tone.getTransport().start() }} className="text-yellow-400 p-1"><Play size={14} /></button> : <button onClick={pauseMidi} className="text-yellow-400 p-1"><Pause size={14} /></button>}
              <button onClick={stopMidi} className="text-red-400 p-1"><Square size={14} /></button>
            </div>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1.5">
              <input type="range" min="40" max="240" value={tempo} onChange={(e) => setTempo(Number(e.target.value))} className="w-14 accent-purple-500" />
              <span className="text-xs text-slate-400 w-8">{tempo}</span>
            </div>
            <button onClick={() => setIsLooping(!isLooping)} className={`p-1.5 rounded-lg ${isLooping ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-slate-400'}`}><Repeat size={14} /></button>
          </>
        )}

        <button onClick={toggleRecording} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg ${isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 text-slate-400'}`}><Mic size={14} /></button>
        <button onClick={toggleMetronome} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg ${metronomeEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-400'}`}>🎵</button>
      </div>

      <main className="flex-1 flex items-center justify-center p-4 overflow-auto relative">
        <div className="bg-gradient-to-b from-[#2d2d4a] to-[#1a1a2e] p-4 rounded-lg shadow-2xl border border-white/10">
          <Piano startOctave={currentOctave} numOctaves={numOctaves} activeKeys={activeKeys} onNoteOn={handleKeyDown} onNoteOff={handleKeyUp} showLetters={showLetters} showKeys={showKeys} />
        </div>
      </main>

      <footer className="p-2 text-center text-xs text-slate-500 border-t border-white/5">
        <p>Keys: Z S X D C V G B H N J M (Oct {currentOctave+1}) | Q W E R T Y U (Oct {currentOctave+2}) | Space: Sustain</p>
      </footer>
    </div>
  )
}

export default App
