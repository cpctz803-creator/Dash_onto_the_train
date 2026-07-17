import React, { useState, useEffect } from 'react';
import { Level, TrainCar, Rival } from '../types';
import { Users, AlertTriangle, ArrowDown, LogIn, Clock, Sparkles } from 'lucide-react';

interface PlatformViewProps {
  level: Level;
  trainCars: TrainCar[];
  rivals: Rival[];
  playerStaminaLeft: number;
  onCarSelected: (carIndex: number) => void;
}

export default function PlatformView({
  level,
  trainCars,
  rivals,
  playerStaminaLeft,
  onCarSelected
}: PlatformViewProps) {
  const [timeLeft, setTimeLeft] = useState<number>(5.0); // 5 seconds to choose
  const [activeCar, setActiveCar] = useState<number | null>(null);

  // Auto select a car if timer runs out
  useEffect(() => {
    if (timeLeft <= 0) {
      // Pick a random car
      const randomCar = Math.floor(Math.random() * 3) + 1;
      onCarSelected(randomCar);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 0.1));
    }, 100);

    return () => clearInterval(timer);
  }, [timeLeft, onCarSelected]);

  // Keyboard shortcut listeners (keys '1', '2', '3')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') {
        onCarSelected(1);
      } else if (e.key === '2') {
        onCarSelected(2);
      } else if (e.key === '3') {
        onCarSelected(3);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCarSelected]);

  // Determine car recommendation / tactical rating
  const getCarRating = (car: TrainCar) => {
    const seatsRemaining = car.carCapacity;
    const queueLength = car.waitingQueue;
    
    if (queueLength >= seatsRemaining) {
      return { text: '極めて危険（満員リスク大）', color: 'text-red-500 bg-red-500/10 border-red-500/20' };
    }
    if (queueLength > 8) {
      return { text: '混雑（タイムロス大）', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    }
    return { text: '比較的安全', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 p-6 shadow-2xl relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Platform Announcements Board */}
      <div className="led-panel p-4 rounded-2xl mb-6 relative border-2 border-slate-700">
        <div className="flex justify-between items-center mb-1 text-xs text-slate-500 font-mono">
          <span>PLATFORM BROADCAST</span>
          <span className="text-red-500 flex items-center gap-1 animate-pulse font-bold">
            <Clock className="w-3.5 h-3.5" /> 選択制限時間: {timeLeft.toFixed(1)}s
          </span>
        </div>
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-900">
          <p className="text-sm font-bold text-emerald-400 led-glow-green text-center">
            📢 「まもなく、1番線に電車がまいります。乗車ドア（1～3号車）を直ちに選択し、列にお並びください。」
          </p>
          <p className="text-[10px] text-slate-500 text-center mt-1">
            ※各号車の「待ち行列の人数」と「車内混雑度」を確認し、もっとも早く安全に乗車できるドアを1つ選んでください。
          </p>
        </div>
      </div>

      {/* Grid of the 3 Selectable Cars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {trainCars.map((car) => {
          const rating = getCarRating(car);
          const isSelected = activeCar === car.index;
          
          return (
            <button
              key={car.index}
              onClick={() => {
                setActiveCar(car.index);
                // small delay for feel
                setTimeout(() => onCarSelected(car.index), 200);
              }}
              onMouseEnter={() => setActiveCar(car.index)}
              onMouseLeave={() => setActiveCar(null)}
              className={`text-left bg-slate-950/80 rounded-2xl p-5 border-2 transition-all relative flex flex-col justify-between h-full group hover:shadow-xl cursor-pointer ${
                isSelected 
                  ? 'border-blue-500 bg-slate-900 scale-102 shadow-blue-500/15' 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Shortcut Tag */}
              <div className="absolute top-3 right-3 bg-slate-800 text-slate-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700">
                キー [ {car.index} ]
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-100 flex items-center gap-1.5 font-mono">
                  <span className="text-blue-500 font-bold">{car.index}号車</span>
                  <span className="text-xs text-slate-400 font-normal">乗車ドア</span>
                </h3>

                {/* Tactical Rating */}
                <div className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded mt-2 border ${rating.color}`}>
                  {rating.text}
                </div>

                <div className="space-y-4 mt-6">
                  {/* Inside Congestion */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                      <span>車内混雑度</span>
                      <span className="font-mono font-bold text-slate-200">{car.initialCongestion}%</span>
                    </div>
                    {/* Visual Meter */}
                    <div className="w-full h-2.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          car.initialCongestion >= 90 ? 'bg-rose-500' : car.initialCongestion >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${car.initialCongestion}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Platform Queue */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-blue-400" /> ホームの待機列</span>
                      <span className="font-mono font-bold text-blue-400 text-sm">{car.waitingQueue} 人並び</span>
                    </div>

                    {/* People Avatars visual */}
                    <div className="flex flex-wrap gap-1 bg-slate-900 p-2 rounded-lg border border-slate-800 min-h-[44px]">
                      {Array.from({ length: car.waitingQueue }).map((_, idx) => (
                        <span key={idx} className="text-lg select-none filter drop-shadow animate-pulse" style={{ animationDelay: `${idx * 150}ms` }}>
                          🧍
                        </span>
                      ))}
                      <div className="flex items-center justify-center border border-dashed border-blue-500/40 rounded px-1.5 py-0.5 text-[10px] text-blue-400 bg-blue-950/20 ml-auto self-center">
                        あなたが最後尾 (第 {car.waitingQueue + 1} 走者)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button Indicator */}
              <div className="mt-6 w-full bg-blue-600 group-hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors">
                <LogIn className="w-3.5 h-3.5" />
                <span>ここに並ぶ！</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Rivals position simulation info */}
      <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-xs">
        <h4 className="font-bold text-slate-300 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          他のライバルの選択状況：
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
          {rivals.map((rival, idx) => {
            let carText = 'ダッシュ中';
            if (rival.status === 'on_platform' || rival.status === 'boarded') {
              carText = `${rival.chosenCar}号車列に並んだ`;
            }

            return (
              <div key={idx} className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1">
                  <span>{rival.avatar}</span>
                  <span>{rival.name.split(' ')[0]}</span>
                </span>
                <span className="font-bold text-blue-400">{carText}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
