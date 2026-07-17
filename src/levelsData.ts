import { Level, TrainCar, Rival } from './types';

export const LEVELS: Level[] = [
  {
    id: 'afternoon_local',
    name: '昼下がりの各駅停車 (Afternoon Local)',
    description: '閑散としたお昼の車内。混雑度は非常に低く、誰でも確実に乗車可能。まずは改札通過のタイミングと、階段を降りてホームに並ぶまでの動きを練習しよう！',
    timetableText: '13:45発 渋谷・品川方面行 (5両編成)',
    secondsToTrain: 30, // seconds until train arrives
    secondsTrainStays: 20, // stays for 20s
    rushIntensity: 'low',
    baseCongestionMin: 20,
    baseCongestionMax: 45,
    queueMin: 1,
    queueMax: 4,
    carCapacity: 30,
    bgClass: 'from-sky-50 to-blue-100 border-blue-200 text-blue-900',
  },
  {
    id: 'morning_rush',
    name: '平日朝の通勤特快 (Morning Rapid Rush)',
    description: '最凶の通勤混雑！ホームはすでに人が溢れ、車内もギチギチ。改札を早く通りすぎるとホーム待ち時間が無駄になりタイムが落ちるが、ギリギリすぎると列の後ろに並び、満員でドアが閉まって乗車失敗になる！',
    timetableText: '08:12発 新宿・池袋方面行 (5両編成)',
    secondsToTrain: 25,
    secondsTrainStays: 15,
    rushIntensity: 'high',
    baseCongestionMin: 78,
    baseCongestionMax: 93,
    queueMin: 7,
    queueMax: 14,
    carCapacity: 8, // very few spots left!
    bgClass: 'from-amber-50 to-orange-100 border-orange-200 text-orange-950',
  },
  {
    id: 'friday_last_train',
    name: '金曜深夜の終電間際 (Friday Last Train)',
    description: 'お酒の入ったサラリーマンでごった返す金曜24時。電車はすでに超満員、停車時間はたったの12秒！わずかな遅れが命取り。列のハケが遅ければ、目の前で無情にもドアが閉まる！',
    timetableText: '24:28発 最終 東京行 (5両編成)',
    secondsToTrain: 20,
    secondsTrainStays: 12, // stays for only 12 seconds
    rushIntensity: 'high',
    baseCongestionMin: 85,
    baseCongestionMax: 96,
    queueMin: 5,
    queueMax: 11,
    carCapacity: 5, // extremely tight!
    bgClass: 'from-indigo-950 to-slate-900 border-indigo-900 text-indigo-50',
  }
];

export function generateTrainCars(level: Level): TrainCar[] {
  const cars: TrainCar[] = [];
  // We simulate 3 selectable cars (Car 1, Car 2, Car 3) for simplicity and clarity in UI
  for (let i = 1; i <= 3; i++) {
    const initialCongestion = Math.floor(
      Math.random() * (level.baseCongestionMax - level.baseCongestionMin + 1) + level.baseCongestionMin
    );
    const waitingQueue = Math.floor(
      Math.random() * (level.queueMax - level.queueMin + 1) + level.queueMin
    );
    
    cars.push({
      index: i,
      initialCongestion,
      currentCongestion: initialCongestion,
      waitingQueue,
      carCapacity: level.carCapacity,
      boardedCount: 0,
      isFull: initialCongestion >= 100,
    });
  }
  return cars;
}

export function generateRivals(level: Level): Rival[] {
  const rivalNames = [
    { name: '佐藤さん (慎重派)', avatar: '💼', gateTimeOffset: -8, speed: 'slow' }, // Taps early
    { name: '鈴木さん (ベテラン)', avatar: '🧥', gateTimeOffset: -3, speed: 'normal' }, // Taps medium
    { name: '田中くん (無謀なダッシュ)', avatar: '🏃', gateTimeOffset: 1, speed: 'fast' }, // Taps last-minute and runs
  ];

  return rivalNames.map(r => {
    // Determine relative tap time based on level settings
    // Positive values mean they wait, negative means they tap early
    const baseArrival = level.secondsToTrain; // Train arrival time
    // Satou taps early, Suzuki is optimal, Tanaka is very close
    let tapTime = baseArrival + r.gateTimeOffset;
    if (tapTime < 2) tapTime = 2; // bound checks

    return {
      name: r.name,
      avatar: r.avatar,
      gateTime: Math.round(tapTime),
      dashSpeed: r.speed as 'slow' | 'normal' | 'fast',
      status: 'waiting',
      chosenCar: Math.floor(Math.random() * 3) + 1, // Will choose Car 1, 2, or 3
      score: null,
    };
  });
}
