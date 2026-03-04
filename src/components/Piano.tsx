import { useCallback } from 'react'

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
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onNoteOn(fullNote)
  }, [fullNote, onNoteOn])
  
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onNoteOff(fullNote)
  }, [fullNote, onNoteOff])
  
  const handleMouseLeave = useCallback(() => { 
    if (isActive) onNoteOff(fullNote)
  }, [isActive, fullNote, onNoteOff])
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    onNoteOn(fullNote)
  }, [fullNote, onNoteOn])
  
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    onNoteOff(fullNote)
  }, [fullNote, onNoteOff])

  // Photo-realistic black key
  if (isBlack) {
    return (
      <div
        className={`absolute top-0 left-0 w-7 h-28 rounded-b-md cursor-pointer select-none z-20 transition-all duration-100 ease-out ${
          isActive 
            ? 'translate-y-1 shadow-inner' 
            : 'hover:translate-y-0.5'
        }`}
        style={{
          background: isActive 
            ? 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)'
            : 'linear-gradient(180deg, #2d2d3a 0%, #0a0a0f 50%, #1a1a2e 100%)',
          boxShadow: isActive 
            ? 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05)'
            : '0 6px 12px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Glossy highlight */}
        <div className="absolute top-0 left-1 right-1 h-6 rounded-t-md opacity-30"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)'
          }}
        />
        
        {/* Key label area */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
          {showLetters && (
            <span 
              className="text-[7px] font-semibold tracking-wide"
              style={{ color: isActive ? '#818cf8' : '#9ca3af' }}
            >
              {note}
            </span>
          )}
          {showKeys && keyboardKey && (
            <span 
              className="text-[6px] font-bold px-1 py-0.5 rounded"
              style={{ 
                color: '#fef3c7',
                backgroundColor: 'rgba(245, 158, 11, 0.3)'
              }}
            >
              {keyboardKey}
            </span>
          )}
        </div>
      </div>
    )
  }

  // Photo-realistic white key with wood texture effect
  return (
    <div
      className={`w-12 h-52 rounded-b-lg cursor-pointer select-none flex flex-col items-center justify-end pb-2 transition-all duration-100 ease-out ${
        isActive ? 'active' : ''
      }`}
      style={{
        background: isActive
          ? 'linear-gradient(180deg, #e8e8e8 0%, #d4d4d4 50%, #c0c0c0 100%)'
          : 'linear-gradient(180deg, #fefefe 0%, #f5f5f5 30%, #e8e8e8 70%, #d9d9d9 100%)',
        boxShadow: isActive
          ? 'inset 0 2px 3px rgba(0,0,0,0.15), 0 1px 1px rgba(0,0,0,0.1)'
          : '0 8px 16px rgba(0,0,0,0.25), 0 3px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 3px rgba(0,0,0,0.05)',
        border: '1px solid #c9c9c9',
        borderTop: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Subtle wood grain / texture overlay */}
      <div 
        className="absolute inset-0 rounded-b-lg pointer-events-none opacity-20"
        style={{
          background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px)'
        }}
      />
      
      {/* Top edge highlight */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 rounded-t-lg pointer-events-none opacity-50"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 100%)'
        }}
      />

      {/* Key press depth indicator (visible when active) */}
      <div 
        className="absolute bottom-0 left-1 right-1 h-1 rounded-full transition-opacity duration-100 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)',
          opacity: isActive ? 1 : 0
        }}
      />
      
      {/* Labels */}
      <div className="flex flex-col items-center -space-y-0.5 relative z-10">
        {showLetters && (
          <span 
            className="text-[10px] font-semibold"
            style={{ color: isActive ? '#4f46e5' : '#6b7280' }}
          >
            {note}
          </span>
        )}
        {showKeys && keyboardKey && (
          <span 
            className="text-[8px] font-bold px-1.5 py-0.5 rounded"
            style={{ 
              color: isActive ? '#fff' : '#4f46e5',
              backgroundColor: isActive ? '#4f46e5' : '#e0e7ff'
            }}
          >
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

const KEYBOARD_MAP: Record<string, string> = {
  'z': 'C', 's': 'C#', 'x': 'D', 'd': 'D#', 'c': 'E', 'v': 'F',
  'g': 'F#', 'b': 'G', 'h': 'G#', 'n': 'A', 'j': 'A#', 'm': 'B',
  'q': 'C', '2': 'C#', 'w': 'D', '3': 'D#', 'e': 'E', 'r': 'F',
  '5': 'F#', 't': 'G', '6': 'G#', 'y': 'A', '7': 'A#', 'u': 'B'
}

function Piano({ startOctave = 3, numOctaves = 5, activeKeys, showLetters = true, showKeys = true, onNoteOn, onNoteOff }: PianoProps) {
  const octaves = Array.from({ length: numOctaves }, (_, i) => startOctave + i)

  const getKeyboardKey = useCallback((note: string, octave: number): string | undefined => {
    const targetNote = Object.entries(KEYBOARD_MAP).find(([_, n]) => n === note)
    if (targetNote && (octave === 4 || octave === 5)) {
      return targetNote[0].toUpperCase()
    }
    return undefined
  }, [])

  return (
    <div 
      className="flex relative"
      style={{
        // Piano body with wood texture
        background: 'linear-gradient(180deg, #3d2914 0%, #2a1c0e 50%, #1f1408 100%)',
        padding: '16px 12px 20px 12px',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.1), inset 0 -2px 0 rgba(0,0,0,0.3)'
      }}
    >
      {/* Wood grain overlay */}
      <div 
        className="absolute inset-0 rounded-xl pointer-events-none opacity-10"
        style={{
          background: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(139,90,43,0.3) 3px, rgba(139,90,43,0.3) 6px)'
        }}
      />
      
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
          <div 
            className="absolute top-0 left-0 flex pointer-events-none" 
            style={{ width: `${WHITE_KEYS.length * 48}px`, paddingLeft: '6px' }}
          >
            {BLACK_KEYS.map((note, idx) => {
              if (note === null) return <div key={idx} className="w-0" />
              const positions: Record<number, string> = { 0: '30px', 1: '90px', 3: '210px', 4: '270px', 5: '330px' }
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
