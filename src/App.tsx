import React, { useState } from 'react';
import { GameState, Level, TrainCar, Rival } from './types';
import { LEVELS, generateTrainCars, generateRivals } from './levelsData';
import GameIntro from './components/GameIntro';
import ConcourseView from './components/ConcourseView';
import PlatformView from './components/PlatformView';
import TrainSimulator from './components/TrainSimulator';
import GameResults from './components/GameResults';
import { Train, ShieldAlert, Award, Clock, HelpCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'intro',
    currentLevel: null,
    gateTapTime: null,
    gateAbsoluteTime: null,
    boardedAbsoluteTime: null,
    elapsedGateToBoard: null,
    playerStamina: 100,
    playerPosition: 0,
    playerStunDuration: 0,
    chosenCarIndex: null,
    trainCars: [],
    rivals: [],
    simulationTime: 0,
    trainStatus: 'not_arrived',
    boardingMessage: '',
    isFailed: false,
    failReason: ''
  });

  // Action handlers
  const handleStartLevel = (level: Level) => {
    const cars = generateTrainCars(level);
    const rivalsList = generateRivals(level);
    
    setGameState({
      phase: 'gate_waiting',
      currentLevel: level,
      gateTapTime: null,
      gateAbsoluteTime: null,
      boardedAbsoluteTime: null,
      elapsedGateToBoard: null,
      playerStamina: 100,
      playerPosition: 0,
      playerStunDuration: 0,
      chosenCarIndex: null,
      trainCars: cars,
      rivals: rivalsList,
      simulationTime: 0,
      trainStatus: 'not_arrived',
      boardingMessage: '',
      isFailed: false,
      failReason: ''
    });
  };

  const handleGateTapped = (tapTimeSeconds: number) => {
    setGameState(prev => ({
      ...prev,
      phase: 'concourse_dash',
      gateTapTime: tapTimeSeconds,
      gateAbsoluteTime: performance.now()
    }));
  };

  const handleReachPlatform = (playerStaminaLeft: number, rivalsState: Rival[]) => {
    setGameState(prev => ({
      ...prev,
      phase: 'platform_select',
      playerStamina: playerStaminaLeft,
      rivals: rivalsState
    }));
  };

  const handleCarSelected = (carIndex: number) => {
    // Distribute remaining rivals who reached platform to random other cars
    const updatedRivals = gameState.rivals.map(r => {
      if (r.status === 'on_platform') {
        // assign them to random cars they didn't already select, or keep
        return {
          ...r,
          chosenCar: r.chosenCar || Math.floor(Math.random() * 3) + 1
        };
      }
      return r;
    });

    setGameState(prev => ({
      ...prev,
      phase: 'boarding_sim',
      chosenCarIndex: carIndex,
      rivals: updatedRivals
    }));
  };

  const handleBoardingSuccess = (finalScoreSeconds: number) => {
    setGameState(prev => ({
      ...prev,
      phase: 'result',
      elapsedGateToBoard: finalScoreSeconds,
      isFailed: false
    }));
  };

  const handleBoardingFail = (reason: string) => {
    setGameState(prev => ({
      ...prev,
      phase: 'result',
      isFailed: true,
      failReason: reason
    }));
  };

  const handleTimeExpiredBeforeGate = (reason: string) => {
    setGameState(prev => ({
      ...prev,
      phase: 'result',
      isFailed: true,
      failReason: reason
    }));
  };

  const handleRestart = () => {
    if (gameState.currentLevel) {
      handleStartLevel(gameState.currentLevel);
    }
  };

  const handleGoHome = () => {
    setGameState(prev => ({
      ...prev,
      phase: 'intro',
      currentLevel: null
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans selection:bg-blue-500 selection:text-white">
      {/* Station Announcement Header */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-6 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <Train className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold tracking-wider font-mono uppercase block leading-none">JR EAST SPORTS</span>
              <h1 className="font-extrabold text-slate-900 text-sm tracking-tight">改札ダッシュ！駆け込み乗車</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {gameState.phase !== 'intro' && (
              <button
                onClick={handleGoHome}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                ギブアップ (戻る)
              </button>
            )}
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-400 font-mono block">PLATFORM STATUS</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                通常運行ダイヤ
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Stage Frame */}
      <main className="flex-1 py-8 px-4 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={gameState.phase === 'concourse_dash' ? 'gate_waiting' : gameState.phase}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            {gameState.phase === 'intro' && (
              <GameIntro onStartLevel={handleStartLevel} />
            )}

            {(gameState.phase === 'gate_waiting' || gameState.phase === 'concourse_dash') && gameState.currentLevel && (
              <ConcourseView
                level={gameState.currentLevel}
                rivals={gameState.rivals}
                onGateTapped={handleGateTapped}
                onReachPlatform={handleReachPlatform}
                onTimeExpired={handleTimeExpiredBeforeGate}
              />
            )}

            {gameState.phase === 'platform_select' && gameState.currentLevel && (
              <PlatformView
                level={gameState.currentLevel}
                trainCars={gameState.trainCars}
                rivals={gameState.rivals}
                playerStaminaLeft={gameState.playerStamina}
                onCarSelected={handleCarSelected}
              />
            )}

            {gameState.phase === 'boarding_sim' && gameState.currentLevel && gameState.chosenCarIndex !== null && (
              <TrainSimulator
                level={gameState.currentLevel}
                chosenCarIndex={gameState.chosenCarIndex}
                trainCars={gameState.trainCars}
                rivals={gameState.rivals}
                gateTapTime={gameState.gateTapTime || 0}
                playerStamina={gameState.playerStamina}
                onBoardingSuccess={handleBoardingSuccess}
                onBoardingFail={handleBoardingFail}
              />
            )}

            {gameState.phase === 'result' && gameState.currentLevel && (
              <GameResults
                level={gameState.currentLevel}
                isFailed={gameState.isFailed}
                failReason={gameState.failReason}
                finalScore={gameState.elapsedGateToBoard}
                rivals={gameState.rivals}
                onRestart={handleRestart}
                onGoHome={handleGoHome}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Station Platform Floor Footer details */}
      <footer className="bg-slate-100 border-t border-slate-200 py-6 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="text-center md:text-left">
            <p className="text-[11px] font-mono text-slate-400">
              © 2026 JR East Dash Sports Commuter Club. All Rights Reserved.
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              駆け込み乗車は非常に危険です。実際の駅では絶対に真似しないでください。
            </p>
          </div>

          {/* Retro small pixel train illustration sliding across */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-200 p-2 rounded-lg border border-slate-300/60 text-[10px] font-mono text-slate-500 max-w-xs overflow-hidden">
            <span className="animate-pulse">🚉 NEXT DEPARTURE EXPRESS LINE IN SERVICE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
