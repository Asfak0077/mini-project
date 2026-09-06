import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Mic, Volume2, Timer, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { VoiceAgentSettings, VoiceMode, SpeechSpeed } from '../../services/voice/voiceTypes'

interface VoiceSettingsProps {
  isOpen: boolean
  settings: VoiceAgentSettings
  onToggleOpen: () => void
  onUpdateSettings: (partial: Partial<VoiceAgentSettings>) => void
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  isOpen,
  settings,
  onToggleOpen,
  onUpdateSettings
}) => {
  return (
    <div className="w-full">
      {/* Toggle Button */}
      <button
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <Settings className="w-3 h-3" />
          <span>Voice Settings</span>
        </div>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Settings Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-1 px-1 space-y-3">
              {/* Auto-Submit Speech */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    Auto-submit speech
                  </span>
                </div>
                <button
                  onClick={() => onUpdateSettings({ autoSubmitSpeech: !settings.autoSubmitSpeech })}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                    settings.autoSubmitSpeech
                      ? 'bg-blue-600'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <motion.div
                    animate={{ x: settings.autoSubmitSpeech ? 16 : 2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-xs"
                  />
                </button>
              </div>

              {/* Voice Response */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-3 h-3 text-emerald-500" />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    Voice response
                  </span>
                </div>
                <button
                  onClick={() => onUpdateSettings({ voiceResponseEnabled: !settings.voiceResponseEnabled })}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                    settings.voiceResponseEnabled
                      ? 'bg-blue-600'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <motion.div
                    animate={{ x: settings.voiceResponseEnabled ? 16 : 2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-xs"
                  />
                </button>
              </div>

              {/* Conversation Mode */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Mic className="w-3 h-3 text-blue-500" />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    Conversation mode
                  </span>
                </div>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-700/80">
                  {(['CONTINUOUS', 'PUSH_TO_TALK'] as VoiceMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => onUpdateSettings({ conversationMode: mode })}
                      className={`flex-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        settings.conversationMode === mode
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {mode === 'CONTINUOUS' ? 'Continuous' : 'Push to Talk'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Speech Speed */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-purple-500" />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    Speech speed
                  </span>
                </div>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-700/80">
                  {(['slow', 'normal', 'fast'] as SpeechSpeed[]).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => onUpdateSettings({ speechSpeed: speed })}
                      className={`flex-1 px-2 py-1 rounded-md text-[10px] font-bold capitalize transition-all cursor-pointer ${
                        settings.speechSpeed === speed
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {speed}
                    </button>
                  ))}
                </div>
              </div>

              {/* Silence Threshold */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Timer className="w-3 h-3 text-cyan-500" />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                      Silence detection
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    {(settings.silenceThresholdMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={3000}
                  step={100}
                  value={settings.silenceThresholdMs}
                  onChange={(e) => onUpdateSettings({ silenceThresholdMs: parseInt(e.target.value) })}
                  className="w-full h-1 rounded-full appearance-none bg-slate-200 dark:bg-slate-700 cursor-pointer accent-blue-600"
                />
                <div className="flex items-center justify-between text-[9px] text-slate-400">
                  <span>1.0s</span>
                  <span>3.0s</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default VoiceSettings
