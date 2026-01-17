
import React, { useState, useRef, useEffect } from 'react';
import { StoryConfig, StoryState, StoryChoice, StorySegment, CartoonTheme, ColorMode, PersonalityProfile, User, SavedStory } from './types';
import { generateInitialSegment, generateNextSegment, generateIllustration, generateNarration } from './services/geminiService';
import { analyzeSoulShift } from './services/personalityService';
import { saveStoryToHistory } from './services/storageService';
import StoryConfigForm from './components/StoryConfigForm';
import StoryView from './components/StoryView';
import ThemeVisuals from './components/ThemeVisuals';
import SoulMirror from './components/SoulMirror';
import AuthForm from './components/AuthForm';
import HistoryView from './components/HistoryView';
import ShareModal from './components/ShareModal';

const INITIAL_PERSONALITY: PersonalityProfile = {
  traits: { valiance: 50, empathy: 50, shadow: 10, logic: 50, chaos: 20 },
  summary: "A soul yet to be tested, standing at the precipice of destiny.",
  archetypeMatch: "The Unwritten"
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [shareData, setShareData] = useState<{ segment: StorySegment; personality: PersonalityProfile } | null>(null);
  const [theme, setTheme] = useState<CartoonTheme>('Default');
  const [colorMode, setColorMode] = useState<ColorMode>('Dark');
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [state, setState] = useState<StoryState>({
    title: '',
    genre: '',
    segments: [],
    isGenerating: false,
    isNarrating: false,
    personality: INITIAL_PERSONALITY
  });
  
  const [config, setConfig] = useState<StoryConfig | null>(null);

  // Sync state with local storage
  useEffect(() => {
    if (user && state.segments.length > 0 && currentStoryId) {
      const savedStory: SavedStory = {
        id: currentStoryId,
        title: state.title,
        genre: state.genre,
        timestamp: Date.now(),
        segments: state.segments,
        personality: state.personality
      };
      saveStoryToHistory(user.username, savedStory);
    }
  }, [state.segments, state.personality, state.title, currentStoryId, user]);

  const handleStartStory = async (storyConfig: StoryConfig) => {
    setConfig(storyConfig);
    setState(prev => ({ ...prev, isGenerating: true, segments: [] }));
    const newId = crypto.randomUUID();
    setCurrentStoryId(newId);
    
    try {
      const { title, segment } = await generateInitialSegment(storyConfig);
      
      const [imageUrl, audioData] = await Promise.all([
        generateIllustration(segment.visualPrompt).catch(() => undefined),
        generateNarration(segment.text).catch(() => undefined)
      ]);

      setState(prev => ({
        ...prev,
        title,
        genre: storyConfig.genre,
        segments: [{ ...segment, imageUrl, audioData }],
        isGenerating: false,
      }));
    } catch (error) {
      console.error("Story initiation failed:", error);
      alert("The tapestry of fate is tangled. Please try starting your legend again.");
      setState(prev => ({ ...prev, isGenerating: false }));
      setConfig(null);
    }
  };

  const handleChoiceSelection = async (choice: StoryChoice) => {
    if (!config || state.isGenerating) return;
    
    setState(prev => ({ ...prev, isGenerating: true }));

    try {
      const historyStr = state.segments.map(s => s.text).join(" ");
      
      const [newPersonality, nextSegment] = await Promise.all([
        analyzeSoulShift(state.personality, choice, historyStr).catch(() => state.personality),
        generateNextSegment(state.segments, choice, config)
      ]);

      const [imageUrl, audioData] = await Promise.all([
        generateIllustration(nextSegment.visualPrompt).catch(() => undefined),
        generateNarration(nextSegment.text).catch(() => undefined)
      ]);

      setState(prev => ({
        ...prev,
        personality: newPersonality,
        segments: [...prev.segments, { ...nextSegment, imageUrl, audioData }],
        isGenerating: false
      }));
    } catch (error) {
      console.error("Next segment generation failed:", error);
      alert("The thread of destiny snapped. Please try choosing that path again.");
      setState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const handleSelectHistory = (story: SavedStory) => {
    setCurrentStoryId(story.id);
    setState({
      title: story.title,
      genre: story.genre,
      segments: story.segments,
      isGenerating: false,
      isNarrating: false,
      personality: story.personality
    });
    setConfig({
       genre: story.genre as any,
       archetype: 'Hero',
       protagonistName: 'Chronicle Traveler',
       setting: 'The Past',
       tone: 'Nostalgic'
    });
    setShowHistory(false);
  };

  const resetStory = () => {
    if (state.segments.length > 0 && !window.confirm("Abandon this legend to start a new one?")) return;
    setConfig(null);
    setCurrentStoryId(null);
    setState({
      title: '',
      genre: '',
      segments: [],
      isGenerating: false,
      isNarrating: false,
      personality: INITIAL_PERSONALITY
    });
  };

  const isDarkMode = colorMode === 'Dark';
  const themeColors = {
    Default: 'amber', Marvel: 'red', DC: 'blue', Mickey: 'yellow', Barbie: 'pink', TomJerry: 'orange', Anime: 'indigo'
  }[theme];

  const bgColor = isDarkMode ? 'bg-slate-950' : 'bg-slate-50';
  const textColor = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const headerBg = isDarkMode ? 'bg-slate-950/95 border-slate-800' : 'bg-white/95 border-slate-200';

  return (
    <div className={`min-h-screen transition-colors duration-700 ${bgColor} ${textColor} selection:bg-${themeColors}-500/30 overflow-x-hidden relative flex flex-col`}>
      <ThemeVisuals theme={theme} mode={colorMode} />
      
      {user && (
        <div className="fixed top-24 right-4 md:right-8 z-[100] flex flex-col space-y-4">
           <button 
             onClick={() => setShowHistory(true)}
             className={`w-12 h-12 md:w-14 md:h-14 rounded-full border flex items-center justify-center backdrop-blur-xl shadow-2xl hover:scale-110 transition-all ${isDarkMode ? 'bg-slate-900/80 border-white/10' : 'bg-white/80 border-slate-900/10'}`}
             title="Open Chronicles"
           >
             📖
           </button>
           {config && <SoulMirror profile={state.personality} mode={colorMode} />}
        </div>
      )}

      {shareData && (
        <ShareModal 
          title={state.title}
          segment={shareData.segment}
          personality={shareData.personality}
          mode={colorMode}
          onClose={() => setShareData(null)}
        />
      )}

      {showHistory && user && (
        <HistoryView 
          user={user}
          mode={colorMode}
          onSelectStory={handleSelectHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      <header className={`sticky top-0 z-[110] backdrop-blur-md border-b h-20 transition-all ${headerBg} flex-shrink-0`}>
        <div className="container mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={resetStory}>
            <div className={`w-10 h-10 bg-${themeColors}-500 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6`}>
              <span className="text-slate-900 font-black text-xl">T</span>
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight hidden sm:block">TellATale</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setColorMode(prev => prev === 'Dark' ? 'Light' : 'Dark')}
              className={`p-2.5 rounded-full border transition-all ${isDarkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'}`}
            >
              {isDarkMode ? '🌙' : '☀️'}
            </button>

            <div className="relative group">
              <button className={`px-4 py-2 rounded-full border text-xs font-black uppercase tracking-widest flex items-center space-x-2 transition-all ${isDarkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'}`}>
                <span>{theme}</span>
                <span className="text-[10px] opacity-40">▼</span>
              </button>
              <div className={`absolute top-full right-0 mt-2 w-48 py-2 rounded-2xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-[120] border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                {['Default', 'Marvel', 'DC', 'Mickey', 'Barbie', 'TomJerry', 'Anime'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t as CartoonTheme)}
                    className={`w-full px-4 py-2 text-left text-xs font-black uppercase tracking-widest hover:bg-slate-500/10 transition-colors ${theme === t ? `text-${themeColors}-500` : ''}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 md:py-20 relative z-[10] flex-1">
        {!user ? (
          <div className="max-w-md mx-auto animate-in fade-in zoom-in duration-500">
            <AuthForm mode={colorMode} onAuthSuccess={setUser} />
          </div>
        ) : !config ? (
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="text-center mb-12 md:mb-20 space-y-6">
              <h1 className="text-4xl md:text-7xl lg:text-8xl font-serif font-black tracking-tighter">
                Craft Your <span className={`text-${themeColors}-500 drop-shadow-sm`}>Legend</span>
              </h1>
              <p className="text-base md:text-xl lg:text-2xl opacity-50 max-w-2xl mx-auto font-light px-4">
                Step into a world woven from your soul. Every choice transforms the canvas of destiny.
              </p>
            </div>
            <StoryConfigForm onSubmit={handleStartStory} />
          </div>
        ) : (
          <div className="w-full max-w-5xl mx-auto pb-40">
            {state.segments.length === 0 && state.isGenerating && (
              <div className="flex flex-col items-center justify-center py-40 space-y-10 animate-in fade-in duration-500">
                <div className="relative w-20 h-20 md:w-32 md:h-32">
                  <div className={`absolute inset-0 border-4 border-${themeColors}-500/20 rounded-full animate-pulse`}></div>
                  <div className={`absolute inset-0 border-4 border-${themeColors}-500 border-t-transparent rounded-full animate-spin`}></div>
                </div>
                <div className="text-center space-y-4">
                  <h3 className={`text-xl md:text-3xl font-serif font-bold text-${themeColors}-500`}>Whispering to the Void...</h3>
                  <p className="opacity-40 text-sm md:text-lg">Your adventure is being prepared.</p>
                </div>
              </div>
            )}
            
            <div className="relative">
              {state.segments.map((segment, idx) => (
                <StoryView 
                  key={segment.id} 
                  segment={segment} 
                  onChoice={handleChoiceSelection}
                  onShare={() => setShareData({ segment, personality: state.personality })}
                  isGenerating={state.isGenerating}
                  isLast={idx === state.segments.length - 1}
                  mode={colorMode}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
