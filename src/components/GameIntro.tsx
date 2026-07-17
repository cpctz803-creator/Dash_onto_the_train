import React, { useState, useEffect } from 'react';
import { Level, ScoreRecord } from '../types';
import { LEVELS } from '../levelsData';
import { Train, Clock, Users, ShieldAlert, Award, Star, Info, Play, Volume2 } from 'lucide-react';

interface GameIntroProps {
  onStartLevel: (level: Level) => void;
}

export default function GameIntro({ onStartLevel }: GameIntroProps) {
  const [selectedLevelId, setSelectedLevelId] = useState<string>(LEVELS[1].id); // Default to morning rush
  const [highScores, setHighScores] = useState<ScoreRecord[]>([]);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('train_gate_rush_scores');
      if (stored) {
        setHighScores(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load scores', e);
    }
  }, []);

  const selectedLevel = LEVELS.find(l => l.id === selectedLevelId) || LEVELS[1];

  const getBestScore = (levelId: string) => {
    const scores = highScores.filter(s => s.levelId === levelId);
    if (scores.length === 0) return null;
    return Math.min(...scores.map(s => s.score));
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-4 min-h-[85vh]">
      {/* Title Header with retro LED-board feel */}
      <div className="w-full text-center mb-8 relative">
        <div className="inline-flex items-center gap-2 mb-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-mono tracking-widest uppercase">
          <Train className="w-3.5 h-3.5 animate-pulse" /> 1.44MB Commuter Sports
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
          改札ダッシュ！<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            駆け込み乗車シミュレーター
          </span>
        </h1>
        <p className="text-slate-500 mt-2 text-sm md:text-base max-w-lg mx-auto">
          「改札を通ってから、電車に乗るまでの秒数」を競うタイミング・アクションゲーム。
          ラッシュを極め、無駄な待ち時間ゼロで乗車せよ！
        </p>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Level Select Panel (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Train className="text-blue-600 w-5 h-5" /> 混雑路線・時間帯を選択
            </h2>

            <div className="flex flex-col gap-3">
              {LEVELS.map((lvl) => {
                const isSelected = lvl.id === selectedLevelId;
                const bestScore = getBestScore(lvl.id);
                return (
                  <button
                    key={lvl.id}
                    onClick={() => setSelectedLevelId(lvl.id)}
                    className={`text-left p-4 rounded-xl border transition-all relative ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/10'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {lvl.name}
                          {lvl.rushIntensity === 'high' && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              極混雑
                            </span>
                          )}
                          {lvl.rushIntensity === 'medium' && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              中混雑
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-mono">
                          時刻表: {lvl.timetableText}
                        </p>
                      </div>
                      {bestScore !== null && (
                        <div className="text-right bg-emerald-50 text-emerald-700 rounded-lg px-2.5 py-1 text-xs font-mono font-bold border border-emerald-100 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                          自己ベスト: {bestScore.toFixed(2)}s
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {lvl.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick info bar */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800">💡 勝利の鍵 (スコア計測ルール)</p>
              <p className="mt-0.5 leading-relaxed">
                あなたの記録は<b>「改札をピッと通った瞬間」</b>から<b>「実際に電車のドア内に入った瞬間」</b>までの経過時間です。
                改札通過が早すぎるとホームでの待機時間がすべて加算されてしまいます。
                しかし、ギリギリすぎると長い待ち行列の最後に並ぶことになり、車内満員 or ドア閉めによって置いてきぼり（ゲームオーバー）になります！
              </p>
            </div>
          </div>
        </div>

        {/* Level details & Play Button (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="led-panel rounded-2xl p-5 text-slate-100 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="border-b border-slate-700 pb-3">
              <div className="text-slate-400 font-mono text-xs tracking-wider">SELECTED ROUTE DETAILS</div>
              <h3 className="text-xl font-bold mt-1 text-slate-100 font-mono flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                運行ダイヤ
              </h3>
            </div>

            {/* LED Screen Display style */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl font-mono flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>列車名</span>
                <span>行先・発車時刻</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-emerald-400">各停 / Local</span>
                <span className="text-amber-400 font-bold led-glow-amber text-right">
                  {selectedLevel.timetableText.split(' ')[0]}
                </span>
              </div>
              <div className="border-t border-dashed border-slate-800 my-1"></div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <div className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> 到着まで</div>
                  <div className="text-slate-200 font-bold text-sm mt-0.5">{selectedLevel.secondsToTrain} 秒</div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <div className="text-slate-500 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> 停車時間</div>
                  <div className="text-slate-200 font-bold text-sm mt-0.5">{selectedLevel.secondsTrainStays} 秒</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <div className="text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" /> 想定混雑度</div>
                  <div className="text-slate-200 font-bold text-sm mt-0.5">
                    {selectedLevel.baseCongestionMin}% ～ {selectedLevel.baseCongestionMax}%
                  </div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <div className="text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" /> ホーム待機列</div>
                  <div className="text-slate-200 font-bold text-sm mt-0.5">
                    {selectedLevel.queueMin}人 ～ {selectedLevel.queueMax}人程度
                  </div>
                </div>
              </div>
            </div>

            {/* Target Medals Info */}
            <div className="bg-slate-900/50 border border-slate-800 p-3.5 rounded-xl text-xs space-y-2">
              <div className="font-bold text-slate-300 flex items-center gap-1.5 mb-1">
                <Award className="w-4 h-4 text-amber-500" />
                <span>獲得目安タイム（改札～乗車）</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> ゴールド</span>
                <span className="font-mono font-bold text-amber-400">12.0 秒 未満</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-slate-400 text-slate-400" /> シルバー</span>
                <span className="font-mono font-bold text-slate-300">18.0 秒 未満</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-700 text-amber-700" /> ブロンズ</span>
                <span className="font-mono">25.0 秒 未満</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => onStartLevel(selectedLevel)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group text-base cursor-pointer"
                id="btn-play-game"
              >
                <Play className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" />
                このダイヤに挑戦する！
              </button>

              <button
                onClick={() => setShowHowToPlay(!showHowToPlay)}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
                詳しい遊び方・コツを読む
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions Modal or Collapsible */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              🎮 改札ダッシュ！詳細ルールとハイスコアのコツ
            </h3>
            
            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-800 mb-1">1. ゲーム全体の流れ</h4>
                <ol className="list-decimal pl-5 space-y-1">
                  <li><b>改札待機フェーズ</b>: 発車案内板を見ながら、改札機にSuica等のICカードをタッチして入場するタイミングを図ります。</li>
                  <li><b>コンコースダッシュフェーズ</b>: 改札からホームまでの「障害物競争」。左右移動で他の歩行者を避けながら、ダッシュボタンや方向キーで駆け下ります。ぶつかると1.5秒転倒して大ロス！</li>
                  <li><b>ドア選択フェーズ</b>: ホームに並ぶ1～3号車の中から、並ぶドアを瞬時に選択。ホームの混雑状況（待ち行列の人数）と、電車の車内混雑度はホームに着いて初めて判明します！</li>
                  <li><b>乗車シミュレーション</b>: ドアが開くと、1人ずつ自動的に乗車します。電車が満員になるか、ドア閉めのタイムアップまでに自分が乗車できれば成功です！</li>
                </ol>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-900 text-xs">
                <p className="font-bold">🎯 コツ：攻めのギリギリを見極めろ！</p>
                <p className="mt-1">
                  早く改札を通り過ぎると、ホームでただ電車が来るのを待つことになり、タイムは著しく悪化します。
                  ベストタイムを狙うには、<b>「電車のドアが開くほぼ同時、あるいはわずか数秒前にホームへ滑り込む」</b>ような改札タッチが理想です。
                  ただし、あまりにギリギリすぎると、前の待ち人数が多いときに乗車順が回ってこないか、車内が満員になり閉め出されます！
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">2. 操作方法</h4>
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded border">
                  <div>
                    <span className="font-bold text-slate-700 block">📱 マウス・タッチ操作</span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      <li>改札タッチ: 画面のICカードリーダーをクリック</li>
                      <li>コンコース移動: 画面の左右移動・ダッシュボタンをクリック</li>
                      <li>ドア選択: 各号車ドアを直接クリック</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block">⌨️ キーボード操作</span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      <li>改札タッチ: <b>スペースキー</b></li>
                      <li>コンコース移動: <b>← / → 矢印キー</b> で移動、<b>スペースキー / ↑キー</b> でダッシュ</li>
                      <li>ドア選択: <b>1, 2, 3 キー</b></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
