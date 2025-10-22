import React, { useState, useEffect, useCallback } from 'react';
import { Trend, StoryPrompts } from './types';
import { fetchTrends } from './services/twitterService';
import { generateStoryPrompts, generateVideo } from './services/geminiService';
import Button from './components/Button';
import Spinner from './components/Spinner';
import TrendCard from './components/TrendCard';

type StoryPart = keyof StoryPrompts;

enum AppState {
  Initial,
  AwaitingKey,
  Ready,
  FetchingTrends,
  GeneratingStory,
  StoryReady,
  Error
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.Initial);
  const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [storyPrompts, setStoryPrompts] = useState<StoryPrompts | null>(null);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [generationStatuses, setGenerationStatuses] = useState<Record<string, string>>({});
  const [loadingVideos, setLoadingVideos] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>('');

  // FIX: Split reset logic into two functions to fix state management bug
  const resetData = (keepError = false) => {
    setTrends([]);
    setStoryPrompts(null);
    setVideoUrls({});
    setGenerationStatuses({});
    setLoadingVideos({});
    if (!keepError) {
        setError('');
    }
  };

  const resetApp = (keepError = false) => {
    resetData(keepError);
    setAppState(apiKeySelected ? AppState.Ready : AppState.AwaitingKey);
  };

  const checkApiKey = useCallback(async () => {
    try {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setApiKeySelected(hasKey);
      setAppState(hasKey ? AppState.Ready : AppState.AwaitingKey);
    } catch (e) {
      console.error("aistudio is not available. Running in a non-dev environment.", e);
      setAppState(AppState.AwaitingKey);
    }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);
  
  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      setApiKeySelected(true);
      setAppState(AppState.Ready);
    } catch (e) {
      setError("Could not open API key selection. Please ensure you are in a supported environment.");
      setAppState(AppState.Error);
    }
  };

  const handleStartProcess = async () => {
    setAppState(AppState.FetchingTrends);
    // FIX: Call resetData instead of resetApp to avoid incorrect state transitions
    resetData();
    try {
      const fetchedTrends = await fetchTrends();
      setTrends(fetchedTrends);
      setAppState(AppState.GeneratingStory);
      
      const topTrend = fetchedTrends[0];
      if (!topTrend) {
          throw new Error("Could not fetch any trends.");
      }

      const prompts = await generateStoryPrompts(topTrend);
      setStoryPrompts(prompts);
      setAppState(AppState.StoryReady);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
      setAppState(AppState.Error);
    }
  };

  const handleGenerateVideo = async (part: StoryPart, prompt: string) => {
    if (!prompt) return;
    
    setLoadingVideos(prev => ({ ...prev, [part]: true }));
    setGenerationStatuses(prev => ({ ...prev, [part]: '準備中...' }));
    setError('');

    try {
      const generator = generateVideo(prompt);
      for await (const result of generator) {
        setGenerationStatuses(prev => ({ ...prev, [part]: result.status }));
        if (result.videoUrl) {
          setVideoUrls(prev => ({ ...prev, [part]: result.videoUrl! }));
        }
      }
    } catch (err: any) {
      setError(`動画 (${part}) の生成中にエラーが発生しました: ${err.message}`);
      setAppState(AppState.Error); // Set global error state
       if (err.message.includes("API key not valid")) {
          setApiKeySelected(false);
          setAppState(AppState.AwaitingKey);
      }
    } finally {
      setLoadingVideos(prev => ({ ...prev, [part]: false }));
    }
  };
  
  const isLoading = [
      AppState.FetchingTrends, 
      AppState.GeneratingStory,
  ].includes(appState);

  const renderContent = () => {
    switch(appState) {
        case AppState.AwaitingKey:
            return (
                 <div className="text-center bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
                    <h2 className="text-2xl font-bold text-yellow-400 mb-4">APIキーが必要です</h2>
                    <p className="mb-6 text-gray-300 max-w-md mx-auto">このアプリはVeoで動画を生成するためにGoogle AI APIキーが必要です。続行するにはキーを選択してください。</p>
                    <p className="text-sm text-gray-400 mb-6">料金については、<a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">ai.google.dev/gemini-api/docs/billing</a> をご覧ください。</p>
                    <Button onClick={handleSelectKey}>APIキーを選択</Button>
                </div>
            );
        case AppState.Ready:
        case AppState.FetchingTrends:
        case AppState.GeneratingStory:
             return (
                <div className="w-full">
                    <Button onClick={handleStartProcess} disabled={isLoading} className="w-full md:w-auto">
                        {isLoading ? <span className="flex items-center justify-center"><Spinner className="w-6 h-6 mr-3" /> 処理中...</span> : 'トレンドを調査し物語を作成'}
                    </Button>
                </div>
             );
        case AppState.StoryReady: {
            const storyParts = storyPrompts ? (Object.keys(storyPrompts) as StoryPart[]) : [];
            const titleMap: Record<StoryPart, string> = { ki: '起', sho: '承', ten: '転', ketsu: '結' };
            const descriptionMap: Record<StoryPart, string> = { 
                ki: '物語の始まり', 
                sho: '物語の展開', 
                ten: '意外な転換点', 
                ketsu: '物語の締めくくり' 
            };
             const allVideosGenerated = storyParts.length > 0 && storyParts.every(part => videoUrls[part]);

            return (
                <div className="w-full space-y-12">
                    <div>
                        <h2 className="text-2xl font-light text-gray-300 mb-4 text-center">1. トップトレンドを検出</h2>
                        <div className="flex justify-center">
                            {trends.length > 0 && <TrendCard trend={trends[0]}/>}
                        </div>
                    </div>
                     <div className="space-y-6">
                        <h2 className="text-2xl font-light text-gray-300 mb-4 text-center">2. AIが生成した「起承転結」の物語</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {storyParts.map(part => (
                            <div key={part} className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700 shadow-lg flex flex-col space-y-4">
                                <div className="flex items-baseline space-x-3">
                                    <h3 className="text-4xl font-bold text-indigo-400">{titleMap[part]}</h3>
                                    <p className="text-gray-400">{descriptionMap[part]}</p>
                                </div>
                                <p className="italic text-gray-300 h-24">"{storyPrompts?.[part]}"</p>
                                <div className="flex-grow flex items-center justify-center">
                                    {loadingVideos[part] ? (
                                        <div className="text-center">
                                            <Spinner className="w-12 h-12 mx-auto mb-2" />
                                            <p>{generationStatuses[part]}</p>
                                        </div>
                                    ) : videoUrls[part] ? (
                                        <video src={videoUrls[part]} controls loop className="w-full rounded-md shadow-lg" />
                                    ) : (
                                        <Button onClick={() => handleGenerateVideo(part, storyPrompts![part])}>動画を生成</Button>
                                    )}
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                    
                    {allVideosGenerated && (
                        <div className="text-center pt-8">
                             <Button onClick={() => resetApp()} variant="secondary">新しい物語を作成する</Button>
                        </div>
                    )}
                </div>
            );
        }
        case AppState.Error:
             return (
                <div className="text-center bg-red-900/50 p-8 rounded-xl shadow-2xl border border-red-700">
                    <h2 className="text-2xl font-bold text-red-400 mb-4">エラーが発生しました</h2>
                    <p className="mb-6 text-red-200">{error}</p>
                    <Button onClick={() => resetApp()} variant="secondary">もう一度試す</Button>
                </div>
             );
        default: return null;
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl mx-auto">
        <header className="text-center mb-12">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-600">
                    頑固おやじビデオジェネレーター
                </span>
            </h1>
            <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                Twitterトレンドと日本の頑固おやじをテーマに、GeminiとVeoの力でユニークなショートムービーを作成します。
            </p>
        </header>

        <main className="flex flex-col items-center justify-center gap-10">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
