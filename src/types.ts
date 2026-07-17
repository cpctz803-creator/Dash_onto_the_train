export interface Level {
  id: string;
  name: string;
  description: string;
  timetableText: string;
  secondsToTrain: number; // Seconds until train arrives at platform
  secondsTrainStays: number; // Seconds train stays before departing
  rushIntensity: 'low' | 'medium' | 'high';
  baseCongestionMin: number; // Min congestion % inside train
  baseCongestionMax: number; // Max congestion % inside train
  queueMin: number; // Min queue length on platform
  queueMax: number; // Max queue length on platform
  carCapacity: number; // Max additional people a car can take
  bgClass: string;
}

export interface TrainCar {
  index: number;
  initialCongestion: number; // % full
  currentCongestion: number; // % full
  waitingQueue: number; // number of people waiting on platform
  carCapacity: number; // max additional passengers before 100% full
  boardedCount: number; // passengers boarded from queue
  isFull: boolean;
}

export interface Rival {
  name: string;
  avatar: string;
  gateTime: number; // Time in seconds relative to level start when they tapped
  dashSpeed: 'slow' | 'normal' | 'fast';
  status: 'waiting' | 'dashing' | 'on_platform' | 'boarded' | 'failed';
  chosenCar: number;
  score: number | null; // boarding duration
  failReason?: string;
}

export interface GameState {
  phase: 'intro' | 'gate_waiting' | 'concourse_dash' | 'platform_select' | 'boarding_sim' | 'result';
  currentLevel: Level | null;
  gateTapTime: number | null; // time when gate was tapped (relative to start, in seconds)
  gateAbsoluteTime: number | null; // performance.now() or timestamp
  boardedAbsoluteTime: number | null;
  elapsedGateToBoard: number | null; // final score
  playerStamina: number; // 0 to 100
  playerPosition: number; // 0 to 100 (concourse progress)
  playerStunDuration: number; // seconds player is stunned (obstacle collision)
  chosenCarIndex: number | null;
  trainCars: TrainCar[];
  rivals: Rival[];
  simulationTime: number; // elapsed seconds from game start
  trainStatus: 'not_arrived' | 'arrived' | 'doors_opening' | 'boarding' | 'doors_closing' | 'departed';
  boardingMessage: string;
  isFailed: boolean;
  failReason: string; // "満員" or "ドア閉まり" or "時間切れ"
}

export interface ScoreRecord {
  levelId: string;
  levelName: string;
  score: number; // seconds
  date: string;
  rating: 'gold' | 'silver' | 'bronze';
}
