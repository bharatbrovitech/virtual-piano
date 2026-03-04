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
  
  const getLetterNote = (note: string): string => {
    const letterMap: Record<string, string> = {
      'C': 'C', 'C#': 'C#', 'D': 'D', 'D#': 'D#', 'E': 'E', 'F': 'F',
      'F#': 'F#', 'G': 'G', 'G#': 'G#', 'A': 'A', 'A#': 'A#', 'B': 'B'
    }
    return letterMap[note] || note
  }

  const handleMouseDown = () => {
    onNoteOn(fullNote)
  }
  
  const handleMouseUp = () => {
    onNoteOff(fullNote)
  }
  
  const handleMouseLeave = () => {
    if (isActive) {
      onNoteOff(fullNote)
    }
  }

  if (isBlack) {
    return (
      <div
        className={`piano-key-black relative w-8 h-24 cursor-pointer select-none ${
          isActive ? 'active' : ''
        }`}
        style={{ marginLeft: -5, marginRight: -5, zIndex: 10 }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
          {showLetters && (
            <span className="text-[7px] text-slate-400 font-medium">{getLetterNote(note)}</span>
          )}
          {showKeys && keyboardKey && (
            <span className="text-[8px] text-purple-300 font-bold bg-purple-500/30 px-1 rounded">
              {keyboardKey}
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`piano-key-white w-10 h-40 cursor-pointer select-none flex flex-col items-center justify-end pb-1 ${
        isActive ? 'active' : ''
      }`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex flex-col items-center gap-0.5">
        {showLetters && (
          <span className="text-[8px] text-slate-500 font-medium">{getLetterNote(note)}</span>
        )}
        {showKeys && keyboardKey && (
          <span className="text-[9px] text-purple-600 font-bold bg-purple-500/20 px-1 rounded">
            {keyboardKey}
          </span>
        )}
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

// Keyboard mapping for middle octaves (4-5)
const KEYBOARD_MAP_LOWER: Record<string, string> = {
  'z': 'C', 's': 'C#', 'x': 'D', 'd': 'D#', 'c': 'E', 'v': 'F',
  'g': 'F#', 'b': 'G', 'h': 'G#', 'n': 'A', 'j': 'A#', 'm': 'B'
}

const KEYBOARD_MAP_UPPER: Record<string, string> = {
  'q': 'C', '2': 'C#', 'w': 'D', '3': 'D#', 'e': 'E', 'r': 'F',
  '5': 'F#', 't': 'G', '6': 'G#', 'y': 'A', '7': 'A#', 'u': 'B'
}

function Piano({ 
  startOctave = 3, 
  numOctaves = 5, 
  activeKeys,
  showLetters = true,
  showKeys = true,
  onNoteOn, 
  onNoteOff 
}: PianoProps) {
  const octaves = Array.from({ length: numOctaves }, (_, i) => startOctave + i)

  const getKeyboardKey = (note: string, octave: number): string | undefined => {
    const targetOctave = octave
    // Map to middle octaves (4-5) for display
    if (targetOctave === 4 || targetOctave === 5) {
      const lowerKey = Object.entries(KEYBOARD_MAP_LOWER).find(([_, n]) => n === note)?.[0]
      if (lowerKey) return lowerKey.toUpperCase()
    }
    if (targetOctave === 5 || targetOctave === 6) {
      const upperKey = Object.entries(KEYBOARD_MAP_UPPER).find(([_, n]) => n === note)?.[0]
      if (upperKey) return upperKey.toUpperCase()
    }
    return undefined
  }

  return (
    <div className="flex">
      {octaves.map((octave) => (
        <div key={octave} className="flex">
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
          <div className="flex relative" style={{ marginLeft: -5 }}>
            {BLACK_KEYS.map((note) => {
              if (note === null) return null
              return (
                <Key
                  key={`${note}${octave}`}
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
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default Piano
