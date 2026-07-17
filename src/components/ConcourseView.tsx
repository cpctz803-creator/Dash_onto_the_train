import React, { useState, useEffect, useRef } from 'react';
import { Level, Rival } from '../types';
import { CreditCard, ArrowLeft, ArrowRight, Zap, AlertOctagon, Flame, ChevronRight, HelpCircle, RefreshCw } from 'lucide-react';

interface ConcourseViewProps {
  level: Level;
  rivals: Rival[];
  onGateTapped: (tapTimeSeconds: number) => void;
  onReachPlatform: (playerStaminaLeft: number, rivalsState: Rival[]) => void;
  onTimeExpired: (reason: string) => void;
}

interface Obstacle {
  id: number;
  lane: number; // 0, 1, 2
  y: number; // 0 (top) to 100 (bottom)
  emoji: string;
  name: string;
  speed: number;
}

const OBSTACLE_TYPES = [
  { emoji: '📱', name: 'スマホ歩きスマホ', speed: 1.1 },
  { emoji: '🧳', name: '巨大スーツケース持ち', speed: 0.9 },
  { emoji: '🚶', name: 'のんびり歩行者', speed: 1.0 },
  { emoji: '🧹', name: '駅の清掃員さん', speed: 0.7 },
  { emoji: '📦', name: '台車を押す配達員', speed: 1.3 }
];

export default function ConcourseView({
  level,
  rivals,
  onGateTapped,
  onReachPlatform,
  onTimeExpired
}: ConcourseViewProps) {
  // Gate Phase state
  const [gateTapped, setGateTapped] = useState<boolean>(false);
  const [gateWaitTime, setGateWaitTime] = useState<number>(0); // Seconds elapsed in wait phase

  // Dash Phase state
  const [playerLane, setPlayerLane] = useState<number>(1); // Start in middle lane (1)
  const [progress, setProgress] = useState<number>(0); // 0 to 100%
  const [stamina, setStamina] = useState<number>(100);
  const [isDashing, setIsDashing] = useState<boolean>(false);
  const [stunTime, setStunTime] = useState<number>(0); // Seconds player is stunned
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [activeRivals, setActiveRivals] = useState<Rival[]>(() => [...rivals]);

  // Collisions tracker for messages
  const [collisionMessage, setCollisionMessage] = useState<string | null>(null);

  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const obstacleIdCounter = useRef<number>(0);
  const spawnTimer = useRef<number>(0);
  const progressRef = useRef<number>(0);

  // Total time limit checks
  const trainArrivalSeconds = level.secondsToTrain;
  const trainDepartureSeconds = level.secondsToTrain + level.secondsTrainStays;

  // Key event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gateTapped) {
        if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
          e.preventDefault();
          handleTapGate();
        }
        return;
      }

      if (stunTime > 0) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlayerLane(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlayerLane(prev => Math.min(2, prev + 1));
      } else if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsDashing(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowUp') {
        setIsDashing(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gateTapped, stunTime]);

  const handleTapGate = () => {
    if (gateTapped) return;
    setGateTapped(true);
    onGateTapped(gateWaitTime);
  };

  // Main game tick (60fps)
  useEffect(() => {
    const updateGame = (time: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(updateGame);
        return;
      }

      const deltaMs = time - lastTimeRef.current;
      const deltaSec = deltaMs / 1000;
      lastTimeRef.current = time;

      if (!gateTapped) {
        // Gate waiting tick
        setGateWaitTime(prev => {
          const nextVal = prev + deltaSec;
          // If arrival time is exceeded, the train arrives and departs without player even passing the gate!
          if (nextVal >= trainDepartureSeconds) {
            cancelAnimationFrame(requestRef.current!);
            onTimeExpired('改札前でモタモタしている間に、最終列車が出発してしまいました！');
            return nextVal;
          }
          return nextVal;
        });
      } else {
        // Runner Dash tick
        // 1. Handle stun timer
        if (stunTime > 0) {
          setStunTime(prev => Math.max(0, prev - deltaSec));
        }

        // 2. Handle Stamina
        let currentDashing = isDashing && stamina > 5 && stunTime <= 0;
        setStamina(prev => {
          if (currentDashing) {
            return Math.max(0, prev - deltaSec * 35); // consumes fast
          } else {
            return Math.min(100, prev + deltaSec * 15); // recovers slowly
          }
        });

        // 3. Update player progress
        let currentSpeed = 0;
        if (stunTime <= 0) {
          currentSpeed = currentDashing ? 20 : 11; // % progress per second
        }
        
        progressRef.current = Math.min(100, progressRef.current + currentSpeed * deltaSec);
        setProgress(progressRef.current);

        // 4. Update obstacles position
        setObstacles(prev => {
          const moved = prev.map(obs => ({
            ...obs,
            y: obs.y + deltaSec * obs.speed * 45 // scroll down
          }));

          // Filter out of bound
          const onScreen = moved.filter(obs => obs.y < 110);

          // Check collisions with active player
          let collided = false;
          if (stunTime <= 0) {
            onScreen.forEach(obs => {
              // Colllide if y is close to player (at y=90) and in the same lane
              if (obs.y >= 82 && obs.y <= 94 && obs.lane === playerLane) {
                collided = true;
                setCollisionMessage(`💥 ${obs.emoji} ${obs.name} と衝突した！`);
                setStunTime(1.5);
                setIsDashing(false);
                setTimeout(() => setCollisionMessage(null), 1500);
              }
            });
          }

          return onScreen;
        });

        // Spawn obstacles
        spawnTimer.current += deltaSec;
        const spawnInterval = level.rushIntensity === 'high' ? 1.0 : level.rushIntensity === 'medium' ? 1.4 : 2.0;
        if (spawnTimer.current >= spawnInterval) {
          spawnTimer.current = 0;
          const randomType = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
          const randomLane = Math.floor(Math.random() * 3);
          
          setObstacles(prev => [
            ...prev,
            {
              id: obstacleIdCounter.current++,
              lane: randomLane,
              y: -10,
              emoji: randomType.emoji,
              name: randomType.name,
              speed: randomType.speed * (level.rushIntensity === 'high' ? 1.2 : 1.0)
            }
          ]);
        }

        // 5. Update Rivals progress simulation in concourse
        setActiveRivals(prev => {
          return prev.map(rival => {
            if (rival.status === 'waiting') {
              // If simulation time is past their gateTime, they tap
              const totalSimTime = gateWaitTime + (progressRef.current / 11); // estimate
              if (totalSimTime >= rival.gateTime) {
                return { ...rival, status: 'dashing', score: 0 };
              }
              return rival;
            } else if (rival.status === 'dashing') {
              // Advance them
              const rivalSpeed = rival.dashSpeed === 'fast' ? 16 : rival.dashSpeed === 'normal' ? 11 : 8;
              const nextScore = (rival.score || 0) + deltaSec;
              
              // If they reach the platform (takes about 80m/speed)
              const rivalProgress = (nextScore * rivalSpeed) / 80;
              if (rivalProgress >= 1) {
                return { ...rival, status: 'on_platform', score: nextScore };
              }
              return { ...rival, score: nextScore };
            }
            return rival;
          });
        });

        // Check reach platform
        if (progressRef.current >= 100) {
          cancelAnimationFrame(requestRef.current!);
          onReachPlatform(stamina, activeRivals);
          return;
        }
      }

      requestRef.current = requestAnimationFrame(updateGame);
    };

    requestRef.current = requestAnimationFrame(updateGame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gateTapped, gateWaitTime, playerLane, isDashing, stamina, stunTime, level, activeRivals, onReachPlatform, onTimeExpired]);

  // Calculations for display
  const secondsLeft = Math.max(0, trainArrivalSeconds - gateWaitTime);
  const totalSecondsToDeparture = Math.max(0, trainDepartureSeconds - gateWaitTime);

  // Helper color for clock
  const getClockColor = () => {
    if (secondsLeft > 10) return 'text-emerald-400 led-glow-green';
    if (secondsLeft > 0) return 'text-amber-400 led-glow-amber';
    return 'text-red-500 led-glow-red';
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-100 rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
      {/* Station LED Display Banner */}
      <div className="led-panel p-4 text-slate-100 font-mono">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-700 pb-2 mb-3">
          <div className="flex items-center gap-3">
            <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
              {level.rushIntensity === 'high' ? 'Rush Hour' : 'Regular'}
            </span>
            <h2 className="text-sm font-bold text-slate-300">{level.name}</h2>
          </div>
          <div className="text-xs text-slate-400">
            ダイヤ: <span className="text-slate-100 font-bold">{level.timetableText}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <div className="text-[10px] text-slate-500">現在時刻 (擬似)</div>
            <div className="text-base font-bold text-slate-200">
              {level.id === 'friday_last_train'
                ? '24:27:'
                : level.id === 'afternoon_local'
                  ? '13:44:'
                  : '08:11:'}
              {Math.floor(gateWaitTime).toString().padStart(2, '0')}
            </div>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <div className="text-[10px] text-slate-500">電車到着まで</div>
            <div className={`text-base font-bold font-mono ${getClockColor()}`}>
              {secondsLeft > 0 ? `${secondsLeft.toFixed(2)}s` : '到着済'}
            </div>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <div className="text-[10px] text-slate-500">発車タイムリミット</div>
            <div className="text-base font-bold font-mono text-rose-400 led-glow-red">
              {totalSecondsToDeparture.toFixed(2)}s
            </div>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <div className="text-[10px] text-slate-500">改札通過スコア影響</div>
            <div className="text-base font-bold text-amber-500">
              {gateTapped ? `確定: +${gateWaitTime.toFixed(2)}s` : `現在: +${gateWaitTime.toFixed(1)}s`}
            </div>
          </div>
        </div>
      </div>

      {!gateTapped ? (
        /* --- PHASE 1: GATE WAITING --- */
        <div className="p-6 md:p-12 flex flex-col items-center justify-center bg-slate-900 text-slate-100 min-h-[450px]">
          <div className="max-w-md text-center space-y-6">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center gap-3">
              <span className="text-xs text-slate-500 tracking-wider">TICKET GATE WATCH</span>
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border-2 border-blue-500 flex items-center justify-center text-blue-400 animate-pulse">
                <CreditCard className="w-8 h-8" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                改札口。時刻表と到着秒数に注意してください。
                早く入りすぎると、ホームでただ電車を待つ時間がすべてスコア（乗車所要時間）に加算されます。
                ギリギリ（到着0〜3秒前）を狙うと高得点ですが、ホームの混雑状況によっては乗車できなくなります！
              </p>
            </div>

            {/* Tap Action area */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleTapGate}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xl font-extrabold py-5 px-8 rounded-2xl shadow-xl shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 border-2 border-emerald-400/30 cursor-pointer"
                id="btn-gate-tap"
              >
                <Zap className="w-6 h-6 fill-amber-300 text-amber-300 animate-bounce" />
                改札機にタッチして入場！
              </button>
              <p className="text-[11px] text-slate-400 font-mono">
                [キーボード操作: <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">SPACE</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">ENTER</kbd> キーでもタッチできます]
              </p>
            </div>

            {/* Live diagram */}
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-500 text-left space-y-1">
              <div className="font-bold text-slate-400 flex items-center gap-1">
                <span>🏃 ライバルの動向（擬似データ）:</span>
              </div>
              <ul className="space-y-1 mt-1 font-mono">
                <li>• 佐藤さん (慎重): 到着8秒前に入場予定（安全だがスコアは低い）</li>
                <li>• 鈴木さん (適正): 到着3秒前に入場予定（熟練の技）</li>
                <li>• 田中くん (無謀): 到着後にダッシュで突入予定（危険・満員敗退あり）</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* --- PHASE 2: CONCOURSE DASH RUNNER --- */
        <div className="p-4 md:p-6 bg-slate-900 flex flex-col md:flex-row gap-6 min-h-[480px]">
          {/* Main Concourse Runner Lane View (Left 2/3) */}
          <div className="flex-1 flex flex-col bg-slate-950 rounded-2xl border border-slate-800 p-4 relative overflow-hidden">
            <div className="text-xs text-slate-400 font-mono flex justify-between mb-2">
              <span>🚶 改札からホーム階段への通路 (Concourse)</span>
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <Flame className="w-3.5 h-3.5" /> 進行度: {Math.floor(progress)}%
              </span>
            </div>

            {/* Lanes Container */}
            <div className="flex-1 relative border-x-2 border-dashed border-slate-800 min-h-[280px] grid grid-cols-3 bg-gradient-to-b from-slate-950 to-slate-900">
              {/* Lane lines */}
              <div className="border-r border-dashed border-slate-800/60 h-full"></div>
              <div className="border-r border-dashed border-slate-800/60 h-full"></div>
              
              {/* Stairs threshold at the top */}
              <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-emerald-900/30 to-transparent border-t border-emerald-500/20 text-center flex items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase">STAIRS TO PLATFORM (階段)</span>
              </div>

              {/* Obstacles rendering */}
              {obstacles.map(obs => (
                <div
                  key={obs.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75 text-center flex flex-col items-center pointer-events-none"
                  style={{
                    left: `${(obs.lane * 33.3) + 16.6}%`,
                    top: `${obs.y}%`,
                  }}
                >
                  <span className="text-3xl filter drop-shadow">{obs.emoji}</span>
                  <span className="text-[9px] bg-slate-900/90 text-slate-300 px-1 py-0.5 rounded scale-75 mt-0.5 whitespace-nowrap">
                    {obs.name}
                  </span>
                </div>
              ))}

              {/* Player Rendering */}
              <div
                className={`absolute bottom-6 transform -translate-x-1/2 flex flex-col items-center transition-all duration-150 ${
                  stunTime > 0 ? 'animate-bounce opacity-70' : ''
                }`}
                style={{
                  left: `${(playerLane * 33.3) + 16.6}%`,
                }}
              >
                {stunTime > 0 ? (
                  <div className="absolute -top-10 bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded font-extrabold shadow animate-bounce flex items-center gap-0.5 z-10">
                    <AlertOctagon className="w-3 h-3" />
                    気絶中! {(stunTime).toFixed(1)}s
                  </div>
                ) : isDashing && stamina > 5 ? (
                  <div className="absolute -top-7 bg-amber-500 text-slate-950 text-[9px] px-1 py-0.5 rounded font-extrabold flex items-center gap-0.5 z-10 animate-pulse">
                    <Flame className="w-3 h-3 fill-slate-950" />
                    DASH!!
                  </div>
                ) : null}
                <div className={`text-4xl filter drop-shadow-lg ${stunTime > 0 ? 'rotate-12 scale-90' : isDashing ? 'scale-105' : ''}`}>
                  {stunTime > 0 ? '💫' : '🏃'}
                </div>
                <div className="text-[10px] font-extrabold bg-blue-600 text-white px-1.5 py-0.2 rounded-full mt-1 border border-blue-400">
                  あなた
                </div>
              </div>
            </div>

            {/* Collision Popup Overlay Message */}
            {collisionMessage && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 border-2 border-red-400 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-2xl z-20 text-xs animate-bounce flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" />
                <span>{collisionMessage}</span>
              </div>
            )}

            {/* Lane Control Buttons for Touch Users */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              <button
                onClick={() => setPlayerLane(prev => Math.max(0, prev - 1))}
                disabled={stunTime > 0}
                className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl flex items-center justify-center gap-1 text-xs cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                左へ移動
              </button>

              <button
                onMouseDown={() => setIsDashing(true)}
                onMouseUp={() => setIsDashing(false)}
                onTouchStart={() => setIsDashing(true)}
                onTouchEnd={() => setIsDashing(false)}
                disabled={stunTime > 0 || stamina <= 5}
                className={`col-span-2 text-white py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  isDashing ? 'bg-amber-600 ring-2 ring-amber-400' : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}
              >
                <Zap className="w-4 h-4 fill-white" />
                ダッシュ！ (長押し)
              </button>

              <button
                onClick={() => setPlayerLane(prev => Math.min(2, prev + 1))}
                disabled={stunTime > 0}
                className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl flex items-center justify-center gap-1 text-xs cursor-pointer disabled:opacity-50"
              >
                右へ移動
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[10px] text-slate-500 text-center mt-2">
              ⌨️ キーボード: <b>← / → 矢印キー</b> で移動 | <b>↑キー / スペースキー長押し</b> でダッシュ！
            </p>
          </div>

          {/* Dash Stats Panel (Right 1/3) */}
          <div className="w-full md:w-64 flex flex-col gap-4">
            {/* Stamina & Progress gauges */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase border-b border-slate-800 pb-2">選手コンディション</h3>
              
              {/* Stamina bar */}
              <div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> スタミナ</span>
                  <span className="font-mono font-bold text-slate-200">{Math.floor(stamina)}%</span>
                </div>
                <div className="w-full h-3 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      stamina < 30 ? 'bg-rose-500' : stamina < 60 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${stamina}%` }}
                  ></div>
                </div>
                {stamina <= 5 && (
                  <span className="text-[9px] text-rose-500 mt-0.5 block animate-pulse">※スタミナ切れ！速度が低下します</span>
                )}
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                  <span>ホームまでの距離</span>
                  <span className="font-mono text-slate-200">{Math.max(0, 100 - Math.floor(progress))}m</span>
                </div>
                <div className="w-full h-3 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Real-time race list */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex-1">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase border-b border-slate-800 pb-2 mb-2">
                通勤レース状況
              </h3>
              <div className="space-y-3 font-mono text-xs">
                {/* Player Row */}
                <div className="flex items-center justify-between bg-blue-950/40 p-2 rounded border border-blue-900/40">
                  <span className="flex items-center gap-1.5 font-bold text-blue-300">
                    <span>🏃</span>
                    <span>あなた</span>
                  </span>
                  <span className="text-right text-slate-200">
                    {progress >= 100 ? '到着済' : `${Math.floor(progress)}%`}
                  </span>
                </div>

                {/* Rivals rows */}
                {activeRivals.map((rival, idx) => {
                  let statusText = '改札待ち';
                  let statusColor = 'text-slate-500';
                  
                  if (rival.status === 'dashing') {
                    // Estimate their concourse progress
                    const rivalSpeed = rival.dashSpeed === 'fast' ? 16 : rival.dashSpeed === 'normal' ? 11 : 8;
                    const estimatedProgress = Math.min(99, Math.floor(((rival.score || 0) * rivalSpeed) / 80 * 100));
                    statusText = `${estimatedProgress}%`;
                    statusColor = 'text-amber-400';
                  } else if (rival.status === 'on_platform') {
                    statusText = 'ホーム到着';
                    statusColor = 'text-emerald-400';
                  }

                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span>{rival.avatar}</span>
                        <span>{rival.name.split(' ')[0]}</span>
                      </span>
                      <span className={`text-right font-bold ${statusColor}`}>{statusText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
