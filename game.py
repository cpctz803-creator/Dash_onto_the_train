# -*- coding: utf-8 -*-
"""
改札ダッシュ！駆け込み乗車シミュレーター (Python CUI版)

このスクリプトは、ブラウザ版「改札ダッシュ！」のルールと駆け引きを、
Pythonのターミナル（コマンドライン）上で再現したゲームです。
標準ライブラリのみで動作するため、特別なライブラリのインストールなしですぐに遊べます！

【遊び方】
ターミナルで以下を実行してください：
    python game.py
"""

import os
import sys
import time
import random

# ターミナルの表示をクリアする関数
def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

# ダイヤ設定
LEVELS = [
    {
        "id": 1,
        "name": "昼下がりの各駅停車",
        "desc": "閑散としたお昼の車内。混雑度は低く確実に乗れます。タイミングの練習に最適！",
        "timetable": "13:45発 渋谷・品川方面行 (5両編成)",
        "seconds_to_train": 15,
        "seconds_stays": 15,
        "congestion_range": (20, 45),
        "queue_range": (1, 3),
        "capacity": 30,
        "gold_target": 12.0
    },
    {
        "id": 2,
        "name": "平日朝の通勤特快",
        "desc": "最強の通勤ラッシュ！ホームは人で溢れ、車内はギチギチ。ギリギリを攻めないと乗れません！",
        "timetable": "08:12発 新宿・池袋方面行 (5両編成)",
        "seconds_to_train": 12,
        "seconds_stays": 10,
        "congestion_range": (78, 93),
        "queue_range": (6, 12),
        "capacity": 8,
        "gold_target": 10.0
    },
    {
        "id": 3,
        "name": "金曜深夜の終電間際",
        "desc": "酔客でごった返す金曜深夜。停車時間はたったの8秒！わずかな遅れが命取り！",
        "timetable": "24:28発 最終 東京行 (5両編成)",
        "seconds_to_train": 10,
        "seconds_stays": 8,
        "congestion_range": (85, 96),
        "queue_range": (5, 10),
        "capacity": 5,
        "gold_target": 8.0
    }
]

def main_menu():
    clear_screen()
    print("=" * 60)
    print("  🏃 改札ダッシュ！駆け込み乗車シミュレーター (Python CUI版) 🏃")
    print("=" * 60)
    print("「改札を通ってから、電車に乗るまでの最短秒数」を競うゲームです。")
    print("\n[ルール概要]:")
    print("  - 早く改札を入ると、ホームで待つ時間がすべてスコアに加算（ロス）されます。")
    print("  - ギリギリすぎると、前の行列のハケ待ちや満員電車により乗車失敗になります。")
    print("  - コンコースダッシュでは、歩行者を避けてタイムを縮めましょう！")
    print("-" * 60)
    print("挑戦するダイヤを選んでください：")
    for lvl in LEVELS:
        print(f"  [{lvl['id']}] {lvl['name']}")
        print(f"      時刻表: {lvl['timetable']}")
        print(f"      特徴  : {lvl['desc']}")
        print(f"      到着まで: {lvl['seconds_to_train']}秒 / 停車時間: {lvl['seconds_stays']}秒")
        print()
    print("  [Q] ゲーム終了")
    print("-" * 60)
    
    while True:
        choice = input("選択してください (1-3/Q) > ").strip().lower()
        if choice == 'q':
            print("乗車ありがとうございました。またの挑戦をお待ちしています！")
            sys.exit()
        if choice in ['1', '2', '3']:
            return LEVELS[int(choice) - 1]
        print("無効な入力です。1, 2, 3 または Q を入力してください。")

def run_game(level):
    clear_screen()
    print(f"=== 【出発進行: {level['name']}】 ===")
    print(f"運行ダイヤ: {level['timetable']}")
    print("-" * 60)
    print("改札機の前に立っています。ICカードをタッチするベストタイミングを計ってください。")
    print(f"※電車は {level['seconds_to_train']} 秒後に到着します。")
    print("※改札タッチが早すぎるとホームでの無駄な待機時間がスコアに加算されます！")
    print("-" * 60)
    input("【Enterキー】を押すと、時間の計測とタイミング監視を開始します...")

    # Phase 1: Gate timing
    start_time = time.time()
    clear_screen()
    
    print("⏰ 電車到着へのカウントダウン中...（リアルタイム）")
    print("「今だ！」と思う瞬間に 【Enterキー】 を押して改札をタッチしてください！")
    print("-" * 60)
    
    # ノンブロッキング風にキー入力を監視（簡易スリープ付きのループ）
    # ユーザーがEnterを押すまでの秒数を計測
    input("【Enterキー】で改札にタッチ！ >> ")
    gate_tap_delay = time.time() - start_time
    
    print(f"\n👉 改札をタッチしました！ (経過秒数: {gate_tap_delay:.2f}秒)")
    time.sleep(1.5)

    # 時間切れチェック（改札を抜ける前にすでに電車が発車してしまった場合）
    limit_time = level['seconds_to_train'] + level['seconds_stays']
    if gate_tap_delay >= limit_time:
        clear_screen()
        print("❌ 【乗車失敗】")
        print(f"改札口でモタモタしている間に、電車が到着し、出発してしまいました... (経過: {gate_tap_delay:.2f}秒 / リミット: {limit_time}秒)")
        input("\nEnterキーでメニューに戻ります...")
        return

    # Phase 2: Concourse Dash (CUI障害物避け)
    clear_screen()
    print("🏃 【コンコースダッシュ・スタート！】")
    print("改札からホーム階段まで駆け下ります！")
    print("前から歩行者が降ってきます。衝突すると1.5秒転倒して大ロスとなります。")
    print("操作方法: 衝突を避けるためにレーン(左・中・右)を選択してください。")
    print("         'a' で左、's' で中、'd' で右に素早く移動！")
    print("-" * 60)
    input("Enterキーでダッシュ開始...")

    player_lane = 1 # 0:左, 1:中, 2:右
    lanes_visual = ["左", "中", "右"]
    progress = 0
    collisions = 0
    dash_start_time = time.time()

    # 簡単な5ステップの障害物回避ミニゲーム
    for step in range(5):
        clear_screen()
        # 障害物のレーンを決定
        obs_lane = random.randint(0, 2)
        print(f"【進捗度: {step * 20}%】 階段へ向かって全力疾走中！")
        print("-" * 40)
        
        # 簡易グラフィック
        for r in range(4):
            if r == 1:
                row = ["  ", "  ", "  "]
                row[obs_lane] = "🚶" # 障害物
                print(f" | {row[0]} | {row[1]} | {row[2]} |  <-- 歩行者接近！")
            elif r == 3:
                row = ["  ", "  ", "  "]
                row[player_lane] = "🏃" # プレイヤー
                print(f" | {row[0]} | {row[1]} | {row[2]} |  <-- あなた (現在: {lanes_visual[player_lane]}レーン)")
            else:
                print(" |    |    |    |")
        print("-" * 40)
        
        # 回避入力
        action = input("移動方向を入力 (a:左 / s:中 / d:右) してEnter > ").strip().lower()
        if action == 'a':
            player_lane = 0
        elif action == 's':
            player_lane = 1
        elif action == 'd':
            player_lane = 2
            
        # 衝突判定
        if player_lane == obs_lane:
            collisions += 1
            print("💥 ドスン！ 歩行者とぶつかって転倒した！ (+1.5秒ペナルティ)")
            time.sleep(1.5)
        else:
            print("✨ ナイス回避！ 安全に走り抜けました。")
            time.sleep(0.8)

    dash_duration = (time.time() - dash_start_time) + (collisions * 1.5)
    print(f"\n階段を駆け下り、ホームに到着しました！ (ダッシュ所要時間: {dash_duration:.2f}秒)")
    time.sleep(2.0)

    # Phase 3: Platform Door Select
    # 各号車の混雑状況をランダム生成
    cars = []
    for i in range(1, 4):
        congestion = random.randint(level['congestion_range'][0], level['congestion_range'][1])
        queue = random.randint(level['queue_range'][0], level['queue_range'][1])
        cars.append({
            "index": i,
            "congestion": congestion,
            "queue": queue
        })

    clear_screen()
    print("🚉 【ホーム到着・乗車ドアの選択】")
    print("まもなく電車がまいります！並ぶドア（号車）を選んでください。")
    print("-" * 60)
    for car in cars:
        status = "比較的安全" if car['queue'] < 6 else "混雑(タイムロス大)" if car['queue'] < 10 else "極めて危険(満員リスク)"
        print(f"  [{car['index']}] {car['index']}号車 乗車口")
        print(f"      車内混雑度 : {car['congestion']}%")
        print(f"      ホーム待機列: {car['queue']} 人 (あなたは {car['queue'] + 1} 番目に並びます)")
        print(f"      評価        : {status}")
        print()
    print("-" * 60)

    chosen_car_idx = 1
    while True:
        door_choice = input("何号車の列に並びますか？ (1, 2, 3) > ").strip()
        if door_choice in ['1', '2', '3']:
            chosen_car_idx = int(door_choice)
            break
        print("1, 2, 3 のいずれかを選択してください。")

    chosen_car = cars[chosen_car_idx - 1]
    
    # Phase 4: Boarding Simulation
    clear_screen()
    print(f"🚪 【{chosen_car_idx}号車の乗車ドアの前に整列しました】")
    print("電車のドアが開きます。1人ずつ順番に乗車していきます...")
    print("-" * 60)
    time.sleep(1.5)

    # 電車のドアが開いてからの経過時間
    sim_time = 0.0
    queue_left = chosen_car['queue']
    current_congestion = chosen_car['congestion']
    boarding_success = False
    fail_reason = ""

    # ドアが開いた時の電車の残り停車可能時間
    # 改札入場からホームに並ぶまでにかかった合計時間
    total_time_before_doors = gate_tap_delay + dash_duration
    
    # ドアが開くのは電車到着(seconds_to_train)の時点。
    # すでに電車到着時間を過ぎていた場合、ホーム到着と同時にすでに乗車が進んでいるか、あるいは待ち時間が0になる。
    platform_wait_time = max(0.0, level['seconds_to_train'] - gate_tap_delay)
    
    # 電車の残り停車時間 = 発車予定時刻(seconds_to_train + stays) - 改札からホームまでの実経過時間
    train_remaining_stay = (level['seconds_to_train'] + level['seconds_stays']) - total_time_before_doors
    
    if train_remaining_stay <= 0:
        print("❌ 【乗車失敗】")
        print("あなたがホーム階段を降りきったとき、すでに電車のドアが閉まり発車していくところでした...")
        input("\nEnterキーで結果画面に進みます...")
        show_result(level, True, "発車閉め出し（階段ダッシュでのロス過多）", None)
        return

    # 1ステップずつ乗車が進むアニメーション
    while train_remaining_stay > 0:
        clear_screen()
        print(f"🚉 【乗車シミュレーション中】  残り停車時間: {train_remaining_stay:.1f}秒")
        print("=" * 60)
        
        # 電車と行列のビジュアル
        train_bar = "█" * int(current_congestion / 5) + "░" * (20 - int(current_congestion / 5))
        print(f"【{chosen_car_idx}号車 車内混雑】: [{train_bar}] {current_congestion}%")
        
        queue_str = "🧍" * queue_left + "🏃 (あなた)"
        print(f"【ドア前の待機列】: {queue_str}")
        print("=" * 60)
        
        time.sleep(0.5)
        sim_time += 0.5
        train_remaining_stay -= 0.5

        # 1人乗車処理（0.5秒ごとに誰かが乗る）
        if queue_left > 0:
            queue_left -= 1
            # 車内混雑度が上昇
            current_congestion = min(100, current_congestion + random.randint(2, 4))
            print("👉 前の人が1人乗車しました。")
            if current_congestion >= 100:
                print("🚫 車内が超満員になりました！")
                time.sleep(1.0)
                show_result(level, True, "車内満員のため乗車制限（ドア前で駅員に止められました）", None)
                return
        else:
            # プレイヤーの番！
            if current_congestion >= 100:
                show_result(level, True, "車内満員のため乗車制限（ドア前で駅員に止められました）", None)
                return
            else:
                boarding_success = True
                break

    if not boarding_success:
        show_result(level, True, "目の前でドアが閉まりました（ドア閉め切りタイムアップ）", None)
    else:
        # スコア計算
        # スコア = 改札入場から乗車が完了するまでの時間
        # = ホームでの待ち時間 + コンコースダッシュ時間 + 乗車が完了するまでのシミュレーション時間
        final_score = platform_wait_time + dash_duration + sim_time
        show_result(level, False, None, final_score)

def show_result(level, is_failed, fail_reason, score):
    clear_screen()
    print("=" * 60)
    print("🏆 【ゲーム結果発表】 🏆")
    print("=" * 60)
    print(f"路 線 : {level['name']}")
    print("-" * 60)

    if is_failed:
        print("❌ 乗車ならず...！ 乗り遅れました。")
        print(f"失敗原因: {fail_reason}")
    else:
        print("🎉 駆け込み乗車に成功しました！")
        print(f"乗車所要タイム: \033[33m{score:.2f} 秒\033[0m")
        
        # 評価判定
        if score < level['gold_target']:
            print("\n👑 評価: 【ゴールド】 最強の通勤マスター！(待ち時間ゼロの奇跡)")
        elif score < level['gold_target'] + 6.0:
            print("\n🥈 評価: 【シルバー】 優秀なラッシュランナー！(非常にスムーズ)")
        else:
            print("\n🥉 評価: 【ブロンズ】 一般の駆け込み乗客。(無駄な待ち時間が多め)")
            
    print("-" * 60)
    print("1. もう一度遊ぶ")
    print("2. メニューに戻る")
    
    while True:
        choice = input("選択してください (1/2) > ").strip()
        if choice == '1':
            run_game(level)
            break
        elif choice == '2':
            break

if __name__ == "__main__":
    while True:
        selected_level = main_menu()
        run_game(selected_level)
