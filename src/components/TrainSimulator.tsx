import React, { useState, useEffect, useRef } from 'react';
import { Level, TrainCar, Rival } from '../types';
import { Train, ShieldAlert, Users, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface TrainSimulatorProps {
  level: Level;
  chosenCarIndex: number;
  trainCars: TrainCar[];
  rivals: Rival[];
  gateTapTime: number; // seconds when gate was tapped
  playerStamina: number;
  onBoardingSuccess: (finalScoreSeconds: number) => void;
  onBoardingFail: (reason: string) => void;
}

export default function TrainSimulator({
  level,
  chosenCarIndex,
  trainCars,
  rivals,
  gateTapTime,
  playerStamina,
  onBoardingSuccess,
  onBoardingFail
}: TrainSimulatorProps) {
  // Simulator core clocks
  const [timeLeft, setTimeLeft] = useState<number>(level.secondsTrainStays); // Train stay duration countdown
  const [simTime, setSimTime] = useState<number>(0); // Seconds elapsed since doors opened
  const [trainArrived, setTrainArrived] = useState<boolean>(false);
  const [doorsOpen, setDoorsOpen] = useState<boolean>(false);

  // Cars local mutable state
  const [localCars, setLocalCars] = useState<TrainCar[]>(() => [...trainCars]);
  
  // The queue of the chosen car
  const chosenCar = localCars.find(c => c.index === chosenCarIndex)!;
  const initialQueueCount = chosenCar.waitingQueue;
  // Queue representation: elements are index or 'player'. 0, 1, 2... are NPCs, 'player' is the player
  const [queue, setQueue] = useState<(number | 'player')[]>([]);

  // Track boarding status
  const [playerBoarded, setPlayerBoarded] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);
  const [failReasonState, setFailReasonState] = useState<string>('');

  // Rivals localized tracking
  const [localRivals, setLocalRivals] = useState<Rival[]>(() => {
    return rivals.map(r => ({
      ...r,
      // If they made it to platform, choose a car, otherwise failed in concourse
      status: r.status === 'on_platform' ? 'on_platform' : 'failed',
      failReason: r.status === 'failed' ? 'コンコースで迷子・転倒' : undefined
    }));
  });

  const simIntervalRef = useRef<number | null>(null);

  // 1. Initial Train Arrival Animation delay
  useEffect(() => {
    const arrivalTimer = setTimeout(() => {
      setTrainArrived(true);
      const doorsTimer = setTimeout(() => {
        setDoorsOpen(true);
        // Initialize the platform queue
        // Array of NPCs with length equal to car.waitingQueue, then player at the end!
        const initialQueue: (number | 'player')[] = [];
        for (let i = 0; i < initialQueueCount; i++) {
          initialQueue.push(i);
        }
        initialQueue.push('player');
        setQueue(initialQueue);
      }, 1500);

      return () => clearTimeout(doorsTimer);
    }, 1200);

    return () => clearTimeout(arrivalTimer);
  }, [initialQueueCount]);

  // 2. Active Boarding Loop
  useEffect(() => {
    if (!doorsOpen || playerBoarded || failed) return;

    const tickMs = 100; // Tick every 100ms
    const boardingIntervalSec = level.rushIntensity === 'high' ? 0.35 : 0.45; // seconds per passenger boarding
    let boardingAccumulator = 0;

    const timer = setInterval(() => {
      // A. Count down departure timer
      setTimeLeft(prev => {
        const next = prev - (tickMs / 1000);
        if (next <= 0) {
          clearInterval(timer);
          handleTrainDeparture();
          return 0;
        }
        return next;
      });

      setSimTime(prev => prev + (tickMs / 1000));

      // B. Process boarding
      boardingAccumulator += (tickMs / 1000);
      if (boardingAccumulator >= boardingIntervalSec) {
        boardingAccumulator = 0;
        processBoardingStep();
      }
    }, tickMs);

    return () => clearInterval(timer);
  }, [doorsOpen, playerBoarded, failed, localCars, queue]);

  // Core function to board 1 person from queue for all cars
  const processBoardingStep = () => {
    setLocalCars(prevCars => {
      let playerJustBoarded = false;
      let playerJustFailedFull = false;

      const updatedCars = prevCars.map(car => {
        // If car is already full or queue is empty, do nothing
        if (car.isFull || (car.index === chosenCarIndex && queue.length === 0)) {
          return car;
        }

        // 1. Calculate how many people can board
        // Each car boards 1 person if queue is not empty and car is not full
        let nextQueueLength = car.waitingQueue;
        let nextBoardedCount = car.boardedCount;
        let nextCongestion = car.currentCongestion;
        let isNowFull = car.isFull;

        // If it's the chosen car
        if (car.index === chosenCarIndex) {
          if (queue.length > 0) {
            const nextInQueue = queue[0];
            
            // Check if car has capacity left
            // Max capacity capacity limit
            const currentFilledCount = Math.floor((nextCongestion / 100) * 100); // normalized
            const maxAllowedPassengers = 100; // capped
            
            // Each person increases congestion by a random amount, e.g. 1% to 3%
            // In high intensity levels, congestion increases faster
            const congestionIncrease = level.rushIntensity === 'high' ? 3.0 : 2.0;

            if (nextCongestion + congestionIncrease > 100 && nextCongestion < 100) {
              // Capped
              nextCongestion = 100;
              isNowFull = true;
            } else if (nextCongestion >= 100) {
              isNowFull = true;
            } else {
              nextCongestion = Math.min(100, nextCongestion + congestionIncrease);
            }

            if (isNowFull) {
              // If the car became full, and it's the player's turn, they fail!
              if (nextInQueue === 'player') {
                playerJustFailedFull = true;
              }
            } else {
              // Passenger boarded!
              nextBoardedCount += 1;
              nextQueueLength = Math.max(0, nextQueueLength - 1);

              if (nextInQueue === 'player') {
                playerJustBoarded = true;
              }
            }
          }
        } else {
          // Other cars board NPCs randomly to simulate parallel queues
          if (car.waitingQueue > 0) {
            const congestionIncrease = level.rushIntensity === 'high' ? 2.5 : 1.5;
            if (nextCongestion + congestionIncrease >= 100) {
              nextCongestion = 100;
              isNowFull = true;
            } else {
              nextCongestion += congestionIncrease;
              nextBoardedCount += 1;
              nextQueueLength = Math.max(0, nextQueueLength - 1);
            }
          }
        }

        return {
          ...car,
          currentCongestion: Math.round(nextCongestion * 10) / 10,
          waitingQueue: nextQueueLength,
          boardedCount: nextBoardedCount,
          isFull: isNowFull
        };
      });

      // Update player queue state
      if (!playerJustFailedFull) {
        setQueue(prevQueue => {
          if (prevQueue.length > 0) {
            const nextQ = [...prevQueue];
            nextQ.shift(); // remove the person who just boarded
            return nextQ;
          }
          return prevQueue;
        });
      }

      // Handle outcomes
      if (playerJustBoarded) {
        setPlayerBoarded(true);
        // Score = Time from Gate Tap to Boarding
        // This includes: wait before gate tap + concourse transit (which we estimated/computed) + wait on platform before train doors opened + boarding simulator time
        // The total elapsed time since level start:
        // level.secondsToTrain is when train arrives, simTime is door-open elapsed
        // Let's sum it up:
        // Total time from gate tap = (Gate waiting time + Concourse time + Platform waiting time + Boarding simulator elapsed) - Gate Tap Time
        // To make it simple, robust and perfectly intuitive:
        // Score = GateWaitTime_passed + ConcourseRunTime + PlatformWaitTime + BoardingSimTime
        // GateWaitTime is exactly `gateTapTime`.
        // The boarding time is `gateTapTime + ConcourseRunTime + PlatformWaitTime + SimTime`.
        // So the elapsed time from gate to boarding is exactly:
        // (ConcourseRunTime + PlatformWaitTime + SimTime)
        // Which is: `(current_absolute_time - gate_absolute_time_in_seconds)`
        // Let's model it beautifully based on actual gameplay variables:
        // Concourse time was about 6 seconds (if dashed) or 8 seconds (if walked) + stun penalties
        // Platform wait time was: Max(0, level.secondsToTrain - gateTapTime)
        // Boarding simulated time is `simTime`.
        // So `finalScore = Max(0, level.secondsToTrain - gateTapTime) + 6.5 + simTime`
        // Let's make it extremely realistic:
        // The player actually ran in concourse. Let's calculate the transit duration:
        // If they dashed, transit was about 7.5s. If they had stuns, add 1.5s per stun.
        // Let's do a clean, consistent total:
        const platformWait = Math.max(0, level.secondsToTrain - gateTapTime);
        // Let's assume a standard 6.5s base transit time for the player (adjusted for stamina and stuns)
        const transitDuration = 6.2 + (playerStamina < 20 ? 2.5 : 0);
        const totalScore = platformWait + transitDuration + simTime;

        // Trigger parent success
        setTimeout(() => {
          onBoardingSuccess(totalScore);
        }, 1000);
      }

      if (playerJustFailedFull) {
        setFailed(true);
        setFailReasonState('満員');
        setTimeout(() => {
          onBoardingFail('車内混雑率が限界（100%）に達し、無理な乗車は危険と判断され駅員に止められました！');
        }, 1500);
      }

      return updatedCars;
    });

    // Board rivals parallel simulation
    setLocalRivals(prevRivals => {
      return prevRivals.map(rival => {
        if (rival.status === 'on_platform') {
          // Simulating rival boarding
          // Check if their chosen car has capacity
          const rivalCar = localCars.find(c => c.index === rival.chosenCar);
          if (rivalCar) {
            if (rivalCar.currentCongestion >= 100) {
              return { ...rival, status: 'failed', failReason: '車内満員で乗車不可' };
            }
            // 30% chance they board each step
            if (Math.random() < 0.3) {
              const platformWait = Math.max(0, level.secondsToTrain - rival.gateTime);
              const transit = 7.0;
              const rivalScore = platformWait + transit + simTime;
              return { ...rival, status: 'boarded', score: rivalScore };
            }
          }
        }
        return rival;
      });
    });
  };

  const handleTrainDeparture = () => {
    setFailed(true);
    setFailReasonState('ドア閉まり');
    onBoardingFail('目の前で無情にもドアが閉まりました！発車ベルが鳴り響く中、乗り遅れとなりました。');
  };

  // Passenger counts remaining before player
  const peopleInFrontCount = queue.indexOf('player');

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-6 p-4">
      {/* Visual Train Platform and Doors Animation (Left 2/3) */}
      <div className="flex-1 bg-slate-950 rounded-3xl border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden min-h-[440px]">
        
        {/* Shaking effect when train is arriving */}
        <div className={`absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none ${!doorsOpen ? 'animate-pulse' : ''}`}></div>

        {/* LED timetable display at the top of the platform */}
        <div className="w-full bg-slate-900 border-2 border-slate-700 p-3.5 rounded-xl font-mono relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-xs text-slate-400">乗車中ドア: <b className="text-blue-400">{chosenCarIndex}号車</b></span>
          </div>
          
          <div className="text-center">
            <span className="text-[10px] text-slate-500 block uppercase">TRAIN DEPARTING IN</span>
            <span className={`text-xl font-extrabold led-glow-red ${timeLeft < 5 ? 'animate-pulse text-red-500' : 'text-rose-400'}`}>
              {timeLeft.toFixed(1)}s
            </span>
          </div>

          <div className="text-right text-xs">
            <span className="text-slate-400 block">ドアの状態</span>
            <span className={`font-bold ${doorsOpen ? 'text-emerald-400 led-glow-green' : 'text-amber-500 led-glow-amber'}`}>
              {!trainArrived ? '列車接近中' : !doorsOpen ? 'ドア開動作中' : '乗車受付中'}
            </span>
          </div>
        </div>

        {/* Train Visualization Stage */}
        <div className="my-8 relative flex flex-col items-center justify-center min-h-[160px]">
          {!trainArrived ? (
            /* Train arriving state */
            <div className="flex flex-col items-center justify-center text-center py-6 animate-pulse">
              <Train className="w-16 h-16 text-slate-500 animate-bounce" />
              <p className="text-sm font-bold text-slate-400 mt-2">電車がまもなくホームに滑り込みます...</p>
              <span className="text-xs text-slate-600">ガタゴト…ガタゴト… (Rumbling Sound)</span>
            </div>
          ) : (
            /* Train doors open/closed simulator */
            <div className={`w-full max-w-md bg-slate-800 border-4 border-slate-600 rounded-2xl p-4 relative ${!doorsOpen ? 'train-rumble' : ''}`}>
              {/* Train Yellow Line Label */}
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-amber-500 text-slate-900 font-extrabold text-[9px] px-3 py-0.5 rounded-full uppercase tracking-widest">
                JR East Commuter series
              </div>

              {/* Inside Passenger Window rendering */}
              <div className="bg-slate-950 rounded-lg h-24 relative overflow-hidden border-2 border-slate-700 flex items-center justify-center">
                {/* Glowing backdrop filling up based on current congestion */}
                <div
                  className={`absolute left-0 bottom-0 top-0 transition-all duration-300 ${
                    chosenCar.currentCongestion >= 90 ? 'bg-rose-900/30' : chosenCar.currentCongestion >= 70 ? 'bg-amber-900/20' : 'bg-emerald-900/20'
                  }`}
                  style={{ width: `${chosenCar.currentCongestion}%` }}
                ></div>

                {/* Animated crowd figures */}
                <div className="absolute inset-0 flex items-center justify-center flex-wrap p-2 gap-1.5 opacity-60 overflow-hidden">
                  {Array.from({ length: Math.min(30, Math.floor(chosenCar.currentCongestion / 3)) }).map((_, idx) => (
                    <span key={idx} className="text-xl">👥</span>
                  ))}
                </div>

                <div className="absolute top-2 right-2 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-xs font-mono">
                  車内混雑度: <b className={`font-bold ${chosenCar.currentCongestion >= 90 ? 'text-red-400' : 'text-slate-200'}`}>{chosenCar.currentCongestion}%</b>
                </div>

                {!doorsOpen ? (
                  <span className="text-xs text-amber-500 font-bold led-glow-amber animate-pulse">
                    ⚠️ ドアが開くまで白線の内側でお待ちください
                  </span>
                ) : playerBoarded ? (
                  <span className="text-sm text-emerald-400 font-extrabold led-glow-green animate-bounce flex items-center gap-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    乗車成功！！
                  </span>
                ) : failed ? (
                  <span className="text-sm text-rose-500 font-extrabold led-glow-red animate-ping">
                    乗車失敗！
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 animate-pulse">
                    順次乗車中（ドア幅：乗客1名ずつ進入可）
                  </span>
                )}
              </div>

              {/* Doors physical representation */}
              <div className="flex justify-between mt-3 h-12">
                {/* Left door panel */}
                <div
                  className="bg-slate-500 border-r-2 border-slate-400 rounded-l h-full transition-all duration-1000"
                  style={{ width: doorsOpen && !playerBoarded && !failed ? '10%' : '48%' }}
                ></div>
                {/* Gap */}
                <div className="flex-1 bg-slate-950 flex items-center justify-center text-[10px] text-slate-600 font-mono">
                  {doorsOpen && !playerBoarded && !failed ? 'OPEN' : 'CLOSED'}
                </div>
                {/* Right door panel */}
                <div
                  className="bg-slate-500 border-l-2 border-slate-400 rounded-r h-full transition-all duration-1000"
                  style={{ width: doorsOpen && !playerBoarded && !failed ? '10%' : '48%' }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Platform Queue Line representation (Bottom) */}
        {doorsOpen && (
          <div className="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-2 font-mono">
              <span>👥 ホーム乗車待ち整列 ({chosenCarIndex}号車ドア)</span>
              <span className="text-blue-400 font-bold">
                {peopleInFrontCount > 0 ? `あなたの前に ${peopleInFrontCount} 人待ち` : playerBoarded ? '乗車完了' : 'あなたの番です！'}
              </span>
            </div>

            {/* Queue rendering */}
            <div className="flex items-center gap-3 overflow-x-auto py-2 no-scrollbar min-h-[60px] bg-slate-950 rounded-lg px-3 border border-slate-900">
              {/* Doors entrance indicator on the left */}
              <div className="bg-emerald-950 border border-emerald-500 text-emerald-400 text-[10px] font-bold py-2 px-3 rounded shrink-0 flex items-center justify-center animate-pulse">
                ➡ 乗車口
              </div>

              {queue.map((item, idx) => {
                if (item === 'player') {
                  return (
                    <div key="player" className="flex flex-col items-center shrink-0 bg-blue-950/80 border-2 border-blue-500 p-1.5 rounded-lg text-center animate-bounce">
                      <span className="text-2xl filter drop-shadow">🏃</span>
                      <span className="text-[9px] font-black text-blue-300 whitespace-nowrap mt-0.5">あなた</span>
                    </div>
                  );
                } else {
                  return (
                    <div key={idx} className="flex flex-col items-center shrink-0 bg-slate-900 p-1 rounded border border-slate-800 opacity-70">
                      <span className="text-2xl filter drop-shadow">🧍</span>
                      <span className="text-[9px] text-slate-500 font-mono mt-0.5">乗客 {item + 1}</span>
                    </div>
                  );
                }
              })}
              
              {queue.length === 0 && !playerBoarded && (
                <div className="text-xs text-slate-500 text-center w-full">整列中の乗客はいません。</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Parallel Cars Status Dashboard (Right 1/3) */}
      <div className="w-full md:w-72 flex flex-col gap-4">
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase border-b border-slate-800 pb-2">
            他車両の乗車ハケ進捗
          </h3>
          
          <div className="space-y-4 font-mono text-xs">
            {localCars.map((car) => {
              const isPlayerCar = car.index === chosenCarIndex;
              const hasQueue = car.waitingQueue > 0;
              const isFull = car.isFull;

              return (
                <div
                  key={car.index}
                  className={`p-3 rounded-lg border ${
                    isPlayerCar 
                      ? 'bg-blue-950/30 border-blue-900/60' 
                      : 'bg-slate-900/50 border-slate-800/80'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1.5 font-bold">
                    <span className={isPlayerCar ? 'text-blue-400 font-black' : 'text-slate-300'}>
                      {car.index}号車 {isPlayerCar && ' (あなた)'}
                    </span>
                    <span className={isFull ? 'text-rose-500' : 'text-slate-400'}>
                      {isFull ? '満員御礼 🚫' : '乗車受付中'}
                    </span>
                  </div>

                  {/* Congestion sub-bar */}
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                    <span>車内混雑度: {car.currentCongestion}%</span>
                    <span>待ち列: {car.waitingQueue}人</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${isFull ? 'bg-rose-500' : isPlayerCar ? 'bg-blue-500' : 'bg-slate-600'}`}
                      style={{ width: `${car.currentCongestion}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rivals Final outcomes */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex-1">
          <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase border-b border-slate-800 pb-2 mb-3">
            ライバルの乗車状況
          </h3>

          <div className="space-y-3 font-mono text-xs">
            {localRivals.map((rival, idx) => {
              let icon = '⏳';
              let color = 'text-slate-400';
              let statusText = '乗車待ち...';

              if (rival.status === 'boarded') {
                icon = '✅';
                color = 'text-emerald-400';
                statusText = `${rival.score?.toFixed(2)}s で乗車！`;
              } else if (rival.status === 'failed') {
                icon = '❌';
                color = 'text-rose-400';
                statusText = rival.failReason || '乗車不可';
              }

              return (
                <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="text-base">{rival.avatar}</span>
                    <span>{rival.name.split(' ')[0]}</span>
                  </span>
                  <span className={`text-right font-bold ${color} flex items-center gap-1`}>
                    <span>{icon}</span>
                    <span>{statusText}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
