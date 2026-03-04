import { useState, useCallback, useEffect, useRef } from 'react'
import * as Tone from 'tone'
import {
  Play,
  Pause,
  Square,
  Upload,
  Repeat,
  SkipBack,
  SkipForward,
  Maximize2,
  Mic,
  Music,
  Keyboard,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Volume1,
  VolumeX,
  Power
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
  const [volume, setVolumeState] = useState(-6)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [tempo, setTempo] = useState(120)
  const [isLooping, setIsLooping] = useState(false)
  const [currentOctave, setCurrentOctave] = useState(3)
  const [numOctaves, setNumOctaves] = useState(5)
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set())
  const [midiNotes, setMidiNotes] = useState<MidiNote[]>([])
  const [midiFileName, setMidiFileName] = useState<string>('')
  const [isRecording, setIsRecording] = useState(false)
  const [, setRecordedNotes] = useState<MidiNote[]>([])
  const [metronomeEnabled, setMetronomeEnabled] = useState(false)
  const [showLetters, setShowLetters] = useState(true)
  const [showKeys, setShowKeys] = useState(true)
  const [isSustained, setIsSustained] = useState(false)
  const [showFallingNotes, setShowFallingNotes] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [audioReady, setAudioReady] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const metronomeRef = useRef<Tone.Synth | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const recordedStartTimeRef = useRef<number>(0)
  const midiNotesRef = useRef<MidiNote[]>([])
  const sustainedNotesRef = useRef<Set<string>>(new Set())
  const fallingNotesRef = useRef<FallingNote[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playbackStartTimeRef = useRef<number>(0)
  const canvasAnimationRef = useRef<number | null>(null)
  
  const { startAudio, synthRef } = usePianoAudio()
  
  const updateVolume = useCallback((vol: number) => {
    setVolumeState(vol)
  }, [])
  
  const handleInitAudio = useCallback(async () => {
    console.log('Initializing audio...')
    await startAudio()
    setAudioReady(true)
  }, [startAudio])
  
  const playNote = useCallback(async (note: string, velocity = 0.8) => {
    if (!audioReady) {
      await handleInitAudio()
    }
    if (synthRef.current) {
      if (isSustained) sustainedNotesRef.current.add(note)
      synthRef.current.triggerAttack(note, Tone.now(), velocity)
    }
    if (isRecording) setRecordedNotes(prev => [...prev, { note, velocity, time: Tone.now() - recordedStartTimeRef.current, duration: 0 }])
  }, [audioReady, handleInitAudio, isSustained, isRecording])
  
  const stopNote = useCallback((note: string) => {
    if (synthRef.current && !isSustained) {
      sustainedNotesRef.current.delete(note)
      synthRef.current.triggerRelease(note, Tone.now())
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

  useEffect(() => { 
    if (synthRef.current) {
      synthRef.current.volume.value = isMuted ? -60 : volume 
    }
  }, [volume, isMuted])

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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !showFallingNotes) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const updateCanvasSize = () => {
      const containerWidth = Math.min(window.innerWidth - 40, numOctaves * 7 * 40)
      canvas.width = containerWidth
      canvas.height = 180
    }
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)

    const render = () => {
      const width = canvas.width
      const height = canvas.height
      const laneWidth = width / 88
      const currentTime = isPlaying && !isPaused ? (Tone.now() - playbackStartTimeRef.current) * (tempo / 120) : 0

      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = 'rgba(30, 41, 59, 0.95)'
      ctx.fillRect(0, 0, width, height)
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1
      for (let i = 0; i <= 88; i++) { ctx.beginPath(); ctx.moveTo(i * laneWidth, 0); ctx.lineTo(i * laneWidth, height); ctx.stroke() }

      fallingNotesRef.current.forEach((note) => {
        const lane = noteToLane(note.note)
        if (lane < 0) return
        const x = lane * laneWidth
        const noteHeight = 22
        const barWidth = Math.max(laneWidth - 2, 8)
        const timeUntilPlay = (note.startTime - currentTime) * 80
        const y = height - timeUntilPlay - noteHeight

        if (y > -noteHeight && y < height + 50) {
          const gradient = ctx.createLinearGradient(x, y, x, y + noteHeight)
          gradient.addColorStop(0, `hsl(${note.velocity * 120}, 80%, 55%)`)
          gradient.addColorStop(1, `hsl(${note.velocity * 120}, 70%, 40%)`)
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.roundRect(x + 1, y, barWidth, noteHeight, 3)
          ctx.fill()
          ctx.shadowColor = `hsl(${note.velocity * 120}, 80%, 55%)`
          ctx.shadowBlur = 8
          ctx.fill()
          ctx.shadowBlur = 0
        }

        if (note.endTime > note.startTime) {
          const endTimeUntilPlay = (note.endTime - currentTime) * 80
          const endY = height - endTimeUntilPlay - noteHeight
          if (endY > 0 && endY < height && endY < y) {
            ctx.fillStyle = `hsla(${note.velocity * 120}, 70%, 45%, 0.4)`
            ctx.fillRect(x + 1, endY, barWidth, y - endY)
          }
        }
      })

      const playheadY = height - 35
      ctx.strokeStyle = '#818cf8'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, playheadY)
      ctx.lineTo(width, playheadY)
      ctx.stroke()
      ctx.shadowColor = '#818cf8'
      ctx.shadowBlur = 15
      ctx.stroke()
      ctx.shadowBlur = 0

      canvasAnimationRef.current = requestAnimationFrame(render)
    }
    render()
    return () => { 
      window.removeEventListener('resize', updateCanvasSize)
      if (canvasAnimationRef.current) cancelAnimationFrame(canvasAnimationRef.current) 
    }
  }, [showFallingNotes, isPlaying, isPaused, tempo, numOctaves])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!audioReady) await handleInitAudio()
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
    setShowFallingNotes(true)
  }

  const midiNumToNote = (num: number): string | null => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const octave = Math.floor(num / 12) - 1
    const note = notes[num % 12]
    return note ? `${note}${octave}` : null
  }

  const playMidi = useCallback(async () => {
    if (midiNotesRef.current.length === 0) return
    if (!audioReady) await handleInitAudio()
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
  }, [tempo, isLooping, isPlaying, isPaused, audioReady, handleInitAudio])

  const pauseMidi = () => { setIsPaused(true); Tone.getTransport().pause() }
  const stopMidi = () => { setIsPlaying(false); setIsPaused(false); setActiveKeys(new Set()); Tone.getTransport().stop(); Tone.getTransport().position = 0; if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) }

  const toggleFullscreen = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen() }
  
  const toggleRecording = async () => {
    if (!isRecording) {
      if (!audioReady) await handleInitAudio()
      recordedStartTimeRef.current = Tone.now()
      setRecordedNotes([])
      setIsRecording(true)
    } else setIsRecording(false)
  }

  const toggleMetronome = async () => {
    if (!metronomeEnabled) {
      if (!audioReady) await handleInitAudio()
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-200 flex flex-col">
      {/* Audio Init Overlay */}
      {!audioReady && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
          <button
            onClick={handleInitAudio}
            className="flex flex-col items-center gap-4 px-8 py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all transform hover:scale-105"
          >
            <Power size={48} />
            <span className="text-xl font-bold">Click to Start Piano</span>
            <span className="text-sm text-indigo-200">Enable audio to play</span>
          </button>
        </div>
      )}

      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between bg-white border-b border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          🎹 Virtual Piano
        </h1>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowControls(!showControls)} className="p-2 rounded-lg hover:bg-slate-100">
            {showControls ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-slate-100"><Maximize2 size={18} /></button>
        </div>
      </header>

      {/* Controls */}
      {showControls && (
        <div className="px-3 py-2.5 flex flex-wrap gap-2 items-center justify-center bg-white border-b border-slate-200 shadow-sm">
          {/* Volume */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
            <button onClick={() => setIsMuted(!isMuted)} className="text-slate-600 hover:text-indigo-600">
              {isMuted ? <VolumeX size={14} /> : <Volume1 size={14} />}
            </button>
            <input type="range" min="-24" max="0" value={isMuted ? -60 : volume} onChange={(e) => updateVolume(Number(e.target.value))} className="w-16 accent-indigo-600" />
          </div>

          {/* Octave */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1.5">
            <button onClick={() => setCurrentOctave(prev => Math.max(1, prev - 1))} disabled={currentOctave <= 1} className="p-1 hover:bg-white rounded disabled:opacity-50"><SkipBack size={14} /></button>
            <span className="text-xs font-medium w-10 text-center">C{currentOctave}</span>
            <button onClick={() => setCurrentOctave(prev => Math.min(6, prev + 1))} disabled={currentOctave >= 6} className="p-1 hover:bg-white rounded disabled:opacity-50"><SkipForward size={14} /></button>
          </div>

          {/* Keys Count */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button onClick={() => setNumOctaves(5)} className={`px-3 py-1 rounded text-xs font-medium ${numOctaves === 5 ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white'}`}>5 Oct</button>
            <button onClick={() => setNumOctaves(7)} className={`px-3 py-1 rounded text-xs font-medium ${numOctaves === 7 ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white'}`}>7 Oct</button>
          </div>

          {/* Toggles */}
          <button onClick={() => setShowLetters(!showLetters)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium ${showLetters ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
            <Music size={12} /> Notes
          </button>
          <button onClick={() => setShowKeys(!showKeys)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium ${showKeys ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
            <Keyboard size={12} /> Keys
          </button>
          <button onClick={() => setShowFallingNotes(!showFallingNotes)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium ${showFallingNotes ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
            {showFallingNotes ? <Eye size={12} /> : <EyeOff size={12} />} MIDI View
          </button>
          
          {/* Sustain */}
          <button onClick={() => { setIsSustained(!isSustained); if (isSustained) releaseAllSustained() }} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium ${isSustained ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
            ◯ Sustain
          </button>

          {/* MIDI Upload */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
            <input ref={fileInputRef} type="file" accept=".mid,.midi" onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              <Upload size={12} />{midiFileName ? midiFileName.slice(0, 10) : 'Load MIDI'}
            </button>
          </div>

          {/* Playback */}
          {midiNotes.length > 0 && (
            <>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                {!isPlaying ? <button onClick={playMidi} className="p-1.5 rounded bg-green-600 text-white hover:bg-green-700"><Play size={14} /></button> : isPaused ? <button onClick={() => { setIsPaused(false); Tone.getTransport().start() }} className="p-1.5 rounded bg-amber-500 text-white hover:bg-amber-600"><Play size={14} /></button> : <button onClick={pauseMidi} className="p-1.5 rounded bg-amber-500 text-white hover:bg-amber-600"><Pause size={14} /></button>}
                <button onClick={stopMidi} className="p-1.5 rounded bg-red-500 text-white hover:bg-red-600"><Square size={14} /></button>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1.5">
                <span className="text-xs text-slate-500">BPM</span>
                <input type="range" min="40" max="240" value={tempo} onChange={(e) => setTempo(Number(e.target.value))} className="w-14 accent-indigo-600" />
                <span className="text-xs font-medium w-8">{tempo}</span>
              </div>
              <button onClick={() => setIsLooping(!isLooping)} className={`p-1.5 rounded-lg ${isLooping ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}><Repeat size={14} /></button>
            </>
          )}

          <button onClick={toggleRecording} className={`p-1.5 rounded-lg ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}><Mic size={14} /></button>
          <button onClick={toggleMetronome} className={`p-1.5 rounded-lg ${metronomeEnabled ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-500'}`}>🎵</button>
        </div>
      )}

      {/* Canvas */}
      {showFallingNotes && midiNotes.length > 0 && (
        <div className="flex justify-center px-4 py-2">
          <canvas ref={canvasRef} className="rounded-xl shadow-lg" />
        </div>
      )}

      {/* Piano */}
      <main className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-200">
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
      <footer className="px-4 py-2 text-center text-xs text-slate-500 bg-white border-t border-slate-200">
        <p><span className="font-medium">Keyboard:</span> Z S X D C V G B H N J M (C{currentOctave+1}) | Q W E R T Y U (C{currentOctave+2}) | Space: Sustain</p>
      </footer>
    </div>
  )
}

export default App
