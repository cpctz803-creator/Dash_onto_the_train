import React, { useState, useEffect } from 'react';
import { Level, Rival, ScoreRecord } from '../types';
import { Award, RotateCcw, Home, Trophy, Star, ShieldAlert, Sparkles, UserCheck, TrendingDown } from 'lucide-react';

interface GameResultsProps {
  level: Level;
  isFailed: boolean;
  failReason: string;
  finalScore: number | null; // boarding duration
  rivals: Rival[];
  onRestart: () => void;
  onGoHome: () => void;
}

export default function GameResults({
  level,
  isFailed,
  failReason,
  finalScore,
  rivals,
  onRestart,
  onGoHome
}: GameResultsProps) {
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [allScores, setAllScores] = useState<ScoreRecord[]>([]);

  // 1. Calculate and save score
  useEffect(() => {
    if (isFailed || finalScore === null) return;

    try {
      const stored = localStorage.getItem('train_gate_rush_scores');
      let scoresList: ScoreRecord[] = stored ? JSON.parse(stored) : [];

      // Determine medal rating
      let rating: 'gold' | 'silver' | 'bronze' = 'bronze';
      if (finalScore < 12.0) rating = 'gold';
      else if (finalScore < 18.0) rating = 'silver';

      const currentBest = scoresList
        .filter(s => s.levelId === level.id)
        .reduce((min, s) => (s.score < min ? s.score : min), Infinity);

      const isNewBest = finalScore < currentBest;
      setIsNewRecord(isNewBest || currentBest === Infinity);

      // Save new score
      const newRecord: ScoreRecord = {
        levelId: level.id,
        levelName: level.name,
        score: finalScore,
        date: new Date().toLocaleDateString('ja-JP'),
        rating
      };

      const updatedList = [...scoresList, newRecord];
      localStorage.setItem('train_gate_rush_scores', JSON.stringify(updatedList));
      setAllScores(updatedList);

      setPersonalBest(isNewBest || currentBest === Infinity ? finalScore : currentBest);
    } catch (e) {
      console.error('Failed to save score', e);
    }
  }, [isFailed, finalScore, level]);

  // Determine feedback evaluation message
  const getFeedbackMessage = () => {
    if (isFailed) {
      if (failReason.includes('満員')) {
        return {
          title: '乗車失敗：車内満員のため乗車制限',
          desc: 'あなたがドアに着いたとき、すでに車内はギチギチの超満員！無理に押し入ろうとしたため、駅員に止められました。車内空き容量（混雑度）が少なすぎるドアを避けるか、もう少し早く改札を通って行列の前に並びましょう。',
          tips: '💡 コツ：ホーム到着後、混雑率（％）と待機列（人）のバランスを瞬時に計算し、空いている車両に滑り込むのがコツです。'
        };
      }
      return {
        title: '乗車失敗：発車閉め出し',
        desc: '目の前で無情にもプシュー…とドアが閉まりました！発車タイムリミットまでに乗車が間に合いませんでした。改札入場をもう少し早くするか、コンコースでの歩行者衝突をゼロに抑えて、階段ダッシュの速度を上げましょう！',
        tips: '💡 コツ：コンコースをダッシュするときは「左右キー」を機敏に操作し、他のサラリーマンやスマホ歩行者を華麗に避けてスタミナを温存してください。'
      };
    }

    if (finalScore !== null) {
      if (finalScore < 12.0) {
        return {
          title: '👑 【ゴールド評価】最強の通勤マスター！',
          desc: '素晴らしい！改札を通ってから無駄なホーム待ち時間をほぼ1秒も作らず、最短ルートで車内に吸い込まれました。完璧なタイミングと華麗な回避ダッシュの賜物です。プロの乗客です！',
          tips: '🏆 偉業達成：これ以上の時間短縮は不可能なレベルです。他の混雑路線でもゴールドを狙ってみましょう！'
        };
      }
      if (finalScore < 18.0) {
        return {
          title: '🥈 【シルバー評価】優秀なラッシュ通勤ランナー',
          desc: 'ナイス乗車！素早い階段ダッシュと的確な号車選択により、非常にスムーズに乗車できました。改札に入るタイミングをもう「あと1～2秒遅らせる」ことで、ホームでの待ち時間を極限まで削減し、ゴールドが狙えます！',
          tips: '💡 コツ：電車が到着する直前の「駆け込みギリギリ」を狙うとスコアが縮みますが、混雑に捕まるリスクも増えます。'
        };
      }
      return {
        title: '🥉 【ブロンズ評価】一般の駆け込み乗客',
        desc: 'なんとか乗車できましたが、改札に入るのが少し早すぎたようです。ホームに到着してから電車が滑り込んでくるまでの間、長くホームに佇んでいたためタイムロスが発生しました。',
        tips: '💡 コツ：ホーム待機時間がそのままスコアにペナルティとして加算されます。もっとリミットぎりぎりを攻めてみましょう！'
      };
    }

    return { title: '', desc: '', tips: '' };
  };

  const feedback = getFeedbackMessage();

  // Create combined standings list (Player + Rivals)
  const getStandings = () => {
    const list = rivals.map(r => ({
      name: r.name,
      avatar: r.avatar,
      score: r.status === 'boarded' ? r.score : null,
      status: r.status,
      isPlayer: false,
    }));

    if (!isFailed && finalScore !== null) {
      list.push({
        name: 'あなた (Player)',
        avatar: '🏃',
        score: finalScore,
        status: 'boarded',
        isPlayer: true
      });
    }

    // Sort standings: Successful boarding with lowest score (time) first, then failed ones
    return list.sort((a, b) => {
      if (a.status === 'boarded' && b.status === 'boarded') {
        return (a.score || 0) - (b.score || 0);
      }
      if (a.status === 'boarded') return -1;
      if (b.status === 'boarded') return 1;
      return 0;
    });
  };

  const standings = getStandings();
  const playerRank = standings.findIndex(s => s.isPlayer) + 1;

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 md:p-8">
      {/* Title result Header */}
      <div className="text-center mb-6">
        {isFailed ? (
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 text-rose-600 mb-4 animate-bounce">
            <ShieldAlert className="w-9 h-9" />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-500 mb-4 animate-pulse">
            <Trophy className="w-9 h-9 fill-amber-400" />
          </div>
        )}
        
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
          {isFailed ? '乗車ならず…！列車は出発しました' : '駆け込み乗車 成功！'}
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-mono uppercase tracking-wider">{level.name}</p>
      </div>

      {/* Main Score Metrics Banner */}
      {!isFailed && finalScore !== null ? (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 text-center shadow-lg mb-6 relative overflow-hidden">
          {isNewRecord && (
            <div className="absolute top-3 left-3 bg-red-600 text-white font-extrabold text-[9px] px-2 py-1 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-0.5">
              <Sparkles className="w-3 h-3 fill-white" />
              NEW RECORD!
            </div>
          )}

          <div className="text-slate-400 font-mono text-xs tracking-widest">GATE-TO-BOARD TIME (RECORD)</div>
          <div className="text-5xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 mt-2 led-glow-amber">
            {finalScore.toFixed(2)}s
          </div>

          <div className="border-t border-slate-800/80 my-4"></div>
          
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div>
              <span className="block">今回の評価メダル</span>
              <span className="font-bold text-slate-200 mt-1 text-sm block flex items-center justify-center gap-1">
                {finalScore < 12.0 ? (
                  <><Star className="w-4 h-4 fill-amber-500 text-amber-500" /> ゴールドメダル</>
                ) : finalScore < 18.0 ? (
                  <><Star className="w-4 h-4 fill-slate-300 text-slate-300" /> シルバーメダル</>
                ) : (
                  <><Star className="w-4 h-4 fill-amber-700 text-amber-700" /> ブロンズメダル</>
                )}
              </span>
            </div>
            <div>
              <span className="block">ライバル内順位</span>
              <span className="font-bold text-slate-200 mt-1 text-sm block flex items-center justify-center gap-1">
                <UserCheck className="w-4 h-4 text-blue-400" />
                {playerRank}位 / {standings.length}人中
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Failed banner display */
        <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-5 mb-6 text-slate-800 text-center">
          <div className="text-xs font-bold text-rose-700 tracking-wider">GAME OVER</div>
          <p className="text-sm font-semibold mt-1 text-rose-950">
            {failReason}
          </p>
        </div>
      )}

      {/* Feedback critique panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <span>📊</span>
          <span>駅務員からの講評・アドバイス</span>
        </h3>
        <p className="text-xs font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded inline-block">
          {feedback.title}
        </p>
        <p className="text-xs text-slate-600 leading-relaxed">
          {feedback.desc}
        </p>
        <p className="text-xs text-emerald-800 font-medium leading-relaxed bg-emerald-50/50 p-2.5 rounded border border-emerald-100/50">
          {feedback.tips}
        </p>
      </div>

      {/* Standings list (Competition aspect!) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>通勤乗車タイム 最終リザルト順位</span>
        </h3>

        <div className="space-y-2 font-mono text-xs">
          {standings.map((commuter, idx) => {
            const isSelf = commuter.isPlayer;
            const rank = idx + 1;
            
            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-2.5 rounded border ${
                  isSelf
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                    rank === 1 ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {rank}
                  </span>
                  <span className="text-sm shrink-0">{commuter.avatar}</span>
                  <span className="truncate max-w-[120px]">{commuter.name}</span>
                </div>

                <div className="text-right">
                  {commuter.status === 'boarded' && commuter.score !== null ? (
                    <span className="font-bold font-mono text-slate-900">{commuter.score.toFixed(2)}s</span>
                  ) : (
                    <span className="text-slate-400 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">乗車失敗</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buttons to restart or home */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onRestart}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          この路線に再挑戦
        </button>

        <button
          onClick={onGoHome}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
        >
          <Home className="w-4 h-4" />
          路線選択に戻る
        </button>
      </div>
    </div>
  );
}
