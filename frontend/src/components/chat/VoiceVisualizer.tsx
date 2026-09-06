import React from 'react'
import { motion } from 'framer-motion'
import {
  Mic, Square, Play, Pause, RotateCcw,
  Volume2, VolumeX, Sparkles, AlertCircle
} from 'lucide-react'
import { VoiceState, PlaybackState } from '../../services/voice/voiceTypes'

interface VoiceVisualizerProps {
  voiceState: VoiceState
  playbackState: PlaybackState
  isMuted: boolean
  transcript?: string
  onStopListening?: () => void
  onPauseSpeaking?: () => void
  onResumeSpeaking?: () => void
  onStopSpeaking?: () => void
  onReplaySpeaking?: () => void
  onToggleMute?: () => void
  className?: string
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
  voiceState,
  playbackState,
  isMuted,
  transcript,
  onStopListening,
  onPauseSpeaking,
  onResumeSpeaking,
  onStopSpeaking,
  onReplaySpeaking,
  onToggleMute,
  className = ''
}) => {
  if (voiceState === 'IDLE' && playbackState === 'STOPPED') {
    return null
  }

  return (
    <div
      role="region"
      aria-label="Voice Assistant Status"
      aria-live="polite"
      className={`p-3 rounded-2xl border transition-all duration-200 shadow-sm ${
        voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING' || voiceState === 'TRANSCRIBING'
          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60'
          : voiceState === 'PROCESSING' || voiceState === 'AI_THINKING' || voiceState === 'EXECUTING_ACTION'
          ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60'
          : voiceState === 'AI_SPEAKING'
          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60'
          : voiceState === 'ERROR'
          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Icon & Status Text */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING' || voiceState === 'TRANSCRIBING'
                ? 'bg-blue-600 text-white animate-pulse'
                : voiceState === 'PROCESSING' || voiceState === 'AI_THINKING' || voiceState === 'EXECUTING_ACTION'
                ? 'bg-purple-600 text-white'
                : voiceState === 'AI_SPEAKING'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-600 text-white'
            }`}
          >
            {voiceState === 'LISTENING' || voiceState === 'USER_SPEAKING' || voiceState === 'TRANSCRIBING' ? (
              <Mic className="w-4 h-4" />
            ) : voiceState === 'PROCESSING' || voiceState === 'AI_THINKING' || voiceState === 'EXECUTING_ACTION' ? (
              <Sparkles className="w-4 h-4 animate-spin text-cyan-200" />
            ) : voiceState === 'AI_SPEAKING' ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-300" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {voiceState === 'LISTENING' && 'Listening...'}
                {voiceState === 'USER_SPEAKING' && 'Hearing you...'}
                {voiceState === 'TRANSCRIBING' && 'Transcribing speech...'}
                {(voiceState === 'PROCESSING' || voiceState === 'AI_THINKING') && 'Understanding your request...'}
                {voiceState === 'EXECUTING_ACTION' && 'Performing action...'}
                {voiceState === 'AI_SPEAKING' && 'CampusResolve is speaking...'}
                {voiceState === 'ERROR' && 'Voice processing error'}
              </span>

              {/* Animated Equalizer Bars */}
              {(voiceState === 'LISTENING' ||
                voiceState === 'USER_SPEAKING' ||
                voiceState === 'TRANSCRIBING' ||
                voiceState === 'AI_SPEAKING') && (
                <div className="flex items-end gap-0.5 h-3 ml-1">
                  <motion.span
                    animate={{ height: ['4px', '12px', '6px'] }}
                    transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}
                    className="w-1 rounded-full bg-current opacity-80"
                  />
                  <motion.span
                    animate={{ height: ['8px', '4px', '14px'] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: 0.1, ease: 'easeInOut' }}
                    className="w-1 rounded-full bg-current opacity-80"
                  />
                  <motion.span
                    animate={{ height: ['6px', '14px', '5px'] }}
                    transition={{ repeat: Infinity, duration: 0.7, delay: 0.2, ease: 'easeInOut' }}
                    className="w-1 rounded-full bg-current opacity-80"
                  />
                  <motion.span
                    animate={{ height: ['10px', '5px', '12px'] }}
                    transition={{ repeat: Infinity, duration: 0.55, delay: 0.15, ease: 'easeInOut' }}
                    className="w-1 rounded-full bg-current opacity-80"
                  />
                </div>
              )}
            </div>

            {transcript && (
              <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate font-medium mt-0.5 max-w-[240px] sm:max-w-xs">
                "{transcript}"
              </p>
            )}
          </div>
        </div>

        {/* Right: Speaker & Recording Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Stop Listening Button */}
          {(voiceState === 'LISTENING' || voiceState === 'TRANSCRIBING') && onStopListening && (
            <button
              onClick={onStopListening}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              title="Stop Recording"
              aria-label="Stop recording"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          )}

          {/* Speaker Playback Controls when Speaking */}
          {voiceState === 'AI_SPEAKING' && (
            <>
              {playbackState === 'PLAYING' && onPauseSpeaking && (
                <button
                  onClick={onPauseSpeaking}
                  className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Pause speech"
                  aria-label="Pause speech"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              )}

              {playbackState === 'PAUSED' && onResumeSpeaking && (
                <button
                  onClick={onResumeSpeaking}
                  className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                  title="Resume speech"
                  aria-label="Resume speech"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              )}

              {onStopSpeaking && (
                <button
                  onClick={onStopSpeaking}
                  className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Stop speech"
                  aria-label="Stop speech"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              )}

              {onReplaySpeaking && (
                <button
                  onClick={onReplaySpeaking}
                  className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Replay speech"
                  aria-label="Replay speech"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {onToggleMute && (
                <button
                  onClick={onToggleMute}
                  className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title={isMuted ? 'Unmute AI voice' : 'Mute AI voice'}
                  aria-label={isMuted ? 'Unmute AI voice' : 'Mute AI voice'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default VoiceVisualizer
