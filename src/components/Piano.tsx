interface KeyProps {
  note: string
  octave: number
  isBlack: boolean
  isActive: boolean
  showLetters: boolean
  showKeys: boolean
  keyboardKey?: string
  onNoteOn: (note: string) => void
  onNoteOff: (note: string) => void
}

function Key({ note, octave, isBlack, isActive, showLetters, showKeys, keyboardKey, onNoteOn, onNoteOff }: KeyProps) {
  const fullNote = `${note}${octave}`
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    onNoteOn(fullNote)
  }
  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault()
    onNoteOff(fullNote)
  }
  const handleMouseLeave = () => { if (isActive) onNoteOff(fullNote) }
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    onNoteOn(fullNote)
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    onNoteOff(fullNote)
  }

  if (isBlack) {
    return (
      <div
        className={`absolute top-0 left-0 w-6 h-24 rounded-b-md cursor-pointer select-none z-20 transition-all duration-75 ${
          isActive 
            ? 'bg-gradient-to-b from-indigo-500 to-indigo-700 translate-y-0.5 shadow-lg shadow-indigo-500/40' 
            : 'bg-gradient-to-b from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800'
        }`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
          {showLetters && <span className="text-[5px] text-slate-300 font-medium">{note}</span>}
          {showKeys && keyboardKey && <span className="text-[6px] text-yellow-300 font-bold bg-yellow-500/30 px-0.5 rounded">{keyboardKey}</span>}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`w-10 h-44 rounded-b-md cursor-pointer select-none flex flex-col items-center justify-end pb-1 transition-all duration-75 ${
        isActive 
          ? 'active' 
          : 'piano-key-white'
      }`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex flex-col items-center -space-y-0.5">
        {showLetters && <span className="text-[8px] text-slate-500 font-medium">{note}</span>}
        {showKeys && keyboardKey && <span className="text-[7px] text-indigo-700 font-bold bg-indigo-100 px-1 rounded">{keyboardKey}</span>}
      </div>
    </div>
  )
}

interface PianoProps {
  startOctave?: number
  numOctaves?: number
  activeKeys: Set<string>
  showLetters?: boolean
  showKeys?: boolean
  onNoteOn: (note: string) => void
  onNoteOff: (note: string) => void
}

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const BLACK_KEYS = ['C#', 'D#', null, 'F#', 'G#', 'A#', null]

const KEYBOARD_MAP: Record<string, string> = {
  'z': 'C', 's': 'C#', 'x': 'D', 'd': 'D#', 'c': 'E', 'v': 'F',
  'g': 'F#', 'b': 'G', 'h': 'G#', 'n': 'A', 'j': 'A#', 'm': 'B',
  'q': 'C', '2': 'C#', 'w': 'D', '3': 'D#', 'e': 'E', 'r': 'F',
  '5': 'F#', 't': 'G', '6': 'G#', 'y': 'A', '7': 'A#', 'u': 'B'
}

function Piano({ startOctave = 3, numOctaves = 5, activeKeys, showLetters = true, showKeys = true, onNoteOn, onNoteOff }: PianoProps) {
  const octaves = Array.from({ length: numOctaves }, (_, i) => startOctave + i)

  const getKeyboardKey = (note: string, octave: number): string | undefined => {
    const targetNote = Object.entries(KEYBOARD_MAP).find(([_, n]) => n === note)
    if (targetNote && (octave === 4 || octave === 5)) {
      return targetNote[0].toUpperCase()
    }
    return undefined
  }

  return (
    <div className="flex relative select-none">
      {octaves.map((octave) => (
        <div key={octave} className="flex relative">
          {/* White keys */}
          {WHITE_KEYS.map((note) => (
            <Key
              key={`${note}${octave}`}
              note={note}
              octave={octave}
              isBlack={false}
              isActive={activeKeys.has(`${note}${octave}`)}
              showLetters={showLetters}
              showKeys={showKeys}
              keyboardKey={getKeyboardKey(note, octave)}
              onNoteOn={onNoteOn}
              onNoteOff={onNoteOff}
            />
          ))}
          
          {/* Black keys */}
          <div className="absolute top-0 left-0 flex pointer-events-none" style={{ width: `${WHITE_KEYS.length * 40}px` }}>
            {BLACK_KEYS.map((note, idx) => {
              if (note === null) return <div key={idx} className="w-0" />
              const positions: Record<number, string> = { 0: '20px', 1: '60px', 3: '140px', 4: '180px', 5: '220px' }
              return (
                <div key={`black-${note}`} className="absolute pointer-events-auto" style={{ left: positions[idx] }}>
                  <Key
                    note={note}
                    octave={octave}
                    isBlack={true}
                    isActive={activeKeys.has(`${note}${octave}`)}
                    showLetters={showLetters}
                    showKeys={showKeys}
                    keyboardKey={getKeyboardKey(note, octave)}
                    onNoteOn={onNoteOn}
                    onNoteOff={onNoteOff}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default Piano
