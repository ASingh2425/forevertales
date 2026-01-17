
import React, { useEffect, useRef, useState } from 'react';
import { StorySegment, StoryChoice, ColorMode } from '../types';
import { decodeBase64, decodeAudioData } from '../utils/audio';

interface StoryViewProps {
  segment: StorySegment;
  onChoice: (choice: StoryChoice) => void;
  onShare?: () => void;
  isGenerating: boolean;
  isLast: boolean;
  mode: ColorMode;
}

const StoryView: React.FC<StoryViewProps> = ({ segment, onChoice, onShare, isGenerating, isLast, mode }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Scroll this specific segment into view when it becomes the last one
  useEffect(() => {
    if (isLast && containerRef.current) {
      const timer = setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLast, segment.id]);

  useEffect(() => {
    if (segment.audioData && isLast) {
      playNarration(segment.audioData);
    }
    return () => {
      stopNarration();
    };
  }, [segment.audioData, isLast]);

  const playNarration = async (base64Data: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const bytes = decodeBase64(base64Data);
      const audioBuffer = await decodeAudioData(bytes, ctx);
      
      stopNarration();
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      
      currentSourceRef.current = source;
      setIsPlaying(true);
    } catch (error) {
      console.error("Narration playback failed:", error);
      setIsPlaying(false);
    }
  };

  const stopNarration = () => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) { /* ignore */ }
      currentSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const isDarkMode = mode === 'Dark';
  const containerBg = isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const mainTextColor = isDarkMode ? 'text-white' : 'text-slate-900';
  const choiceBtnBg = isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100';
  
  // Simplified visibility for stability
  const visibilityClass = isLast 
    ? 'opacity-100 translate-y-0 z-10' 
    : 'opacity-50 translate-y-2 pointer-events-none z-0';

  return (
    <div 
      ref={containerRef}
      className={`transition-all duration-700 ease-out relative w-full mb-12 md:mb-24 ${visibilityClass}`}
    >
      <div className={`w-full ${containerBg} rounded-[2rem] md:rounded-[3rem] overflow-hidden border shadow-2xl min-h-[300px] flex flex-col`}>
        {segment.imageUrl && (
          <div className="w-full aspect-video md:aspect-[21/9] relative overflow-hidden bg-slate-800 shrink-0">
            <img 
              src={segment.imageUrl} 
              alt="Scene" 
              className="w-full h-full object-cover transition-transform duration-[10s] hover:scale-105"
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${isDarkMode ? 'from-slate-900' : 'from-white/40'} via-transparent to-transparent`}></div>
            
            {isPlaying && (
              <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Narrating</span>
              </div>
            )}
          </div>
        )}

        <div className="p-6 md:p-12 lg:p-16 flex-1">
          <p className={`text-lg md:text-2xl lg:text-3xl font-serif leading-relaxed mb-8 md:mb-12 whitespace-pre-wrap tracking-tight ${mainTextColor} transition-colors duration-500`}>
            {segment.text}
          </p>

          {isLast && !isGenerating && segment.choices && segment.choices.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mt-8 animate-in fade-in duration-500">
              {segment.choices.map((choice, idx) => (
                <button
                  key={idx}
                  onClick={() => onChoice(choice)}
                  className={`group relative p-5 md:p-8 ${choiceBtnBg} border border-transparent hover:border-amber-500/50 rounded-2xl transition-all duration-200 text-left hover:shadow-lg`}
                >
                  <span className="block text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1 opacity-80">
                    Pathway {idx + 1}
                  </span>
                  <span className={`text-sm md:text-base font-bold leading-snug block ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {choice.text}
                  </span>
                  <div className="mt-3 text-[9px] opacity-40 group-hover:opacity-100 flex items-center">
                    <span>Choose Path</span>
                    <span className="ml-1.5 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {isLast && isGenerating && (
            <div className="flex flex-col items-center space-y-4 py-8 border-t border-slate-500/10">
              <div className="flex space-x-2">
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce"></div>
              </div>
              <span className="text-[10px] font-black tracking-widest uppercase opacity-40">The oracle is dreaming...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryView;
