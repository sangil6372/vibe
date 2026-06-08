"""
OPIc MP3 Generator - edge-tts 사용
=====================================
사용법:
  python generate_mp3.py              → 전체 생성 (이미 있는 파일은 건너뜀)
  python generate_mp3.py --force      → 전체 재생성 (기존 파일 덮어씀)
  python generate_mp3.py --topic 공원 → 특정 주제만 생성
  python generate_mp3.py --list       → 사용 가능한 음성 목록 출력
  python generate_mp3.py --preview 공원 → 해당 주제 질문 텍스트 미리보기
"""

import asyncio
import json
import os
import sys
import argparse
import io
import edge_tts

# Windows 콘솔 UTF-8 출력 설정
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# ── 설정 ──────────────────────────────────────────────────────────────────────
VOICE = "en-US-JennyNeural"   # 변경 가능: en-US-AriaNeural, en-US-SaraNeural 등
RATE  = "-5%"                  # 말하기 속도 (-10%: 느리게, 0%: 기본, +5%: 빠르게)
BASE_DIR = os.path.join(os.path.dirname(__file__), "questions")
INPUT_FILE = os.path.join(os.path.dirname(__file__), "questions_input.json")
# ─────────────────────────────────────────────────────────────────────────────


def load_input():
    with open(INPUT_FILE, encoding="utf-8") as f:
        return json.load(f)


async def generate_one(text: str, output_path: str):
    communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
    await communicate.save(output_path)


async def generate_topic(topic: dict, force: bool = False):
    folder_path = os.path.join(BASE_DIR, *topic["folder"].split("/"))
    os.makedirs(folder_path, exist_ok=True)

    topic_id = topic["id"]
    questions = topic["questions"]
    generated = 0
    skipped = 0

    print(f"\n📂 [{topic_id}]  →  {folder_path}")

    for i, text in enumerate(questions, start=1):
        filename = f"{topic_id}_{i}_Q.mp3"
        output_path = os.path.join(folder_path, filename)

        if os.path.exists(output_path) and not force:
            print(f"   ⏭  Q{i} 건너뜀 (이미 존재)")
            skipped += 1
            continue

        print(f"   🔊 Q{i} 생성 중... {text[:60]}{'...' if len(text) > 60 else ''}")
        await generate_one(text, output_path)
        print(f"   ✅ 저장: {filename}")
        generated += 1

    for type_key in ("t9", "t10"):
        text = topic.get(type_key)
        if not text:
            continue
        tnum = type_key[1:]
        filename = f"{topic_id}_T{tnum}_1_Q.mp3"
        output_path = os.path.join(folder_path, filename)

        if os.path.exists(output_path) and not force:
            print(f"   ⏭  T{tnum} 건너뜀 (이미 존재)")
            skipped += 1
            continue

        print(f"   🔊 T{tnum} 생성 중... {text[:60]}{'...' if len(text) > 60 else ''}")
        await generate_one(text, output_path)
        print(f"   ✅ 저장: {filename}")
        generated += 1

    return generated, skipped


async def list_voices():
    voices = await edge_tts.list_voices()
    en_voices = [v for v in voices if v["Locale"].startswith("en-US")]
    print("\n🎙  사용 가능한 en-US 음성 목록:")
    print(f"{'이름':<35} {'성별':<8} {'설명'}")
    print("-" * 70)
    for v in en_voices:
        print(f"{v['ShortName']:<35} {v['Gender']:<8} {v.get('FriendlyName', '')}")
    print(f"\n현재 설정: {VOICE}  (speed: {RATE})")


def preview_topic(data: dict, topic_id: str):
    matches = [t for t in data["topics"] if topic_id.lower() in t["id"].lower()]
    if not matches:
        print(f"❌ '{topic_id}' 주제를 찾을 수 없습니다.")
        return
    for t in matches:
        print(f"\n📋 [{t['id']}]")
        for i, q in enumerate(t["questions"], 1):
            print(f"  Q{i}: {q}")


async def main():
    parser = argparse.ArgumentParser(description="OPIc MP3 Generator")
    parser.add_argument("--force",   action="store_true", help="기존 파일 덮어씀")
    parser.add_argument("--topic",   type=str,            help="특정 주제만 생성 (id 일부 매칭)")
    parser.add_argument("--list",    action="store_true", help="사용 가능한 음성 목록")
    parser.add_argument("--preview", type=str,            help="질문 텍스트 미리보기")
    args = parser.parse_args()

    if args.list:
        await list_voices()
        return

    data = load_input()

    if args.preview:
        preview_topic(data, args.preview)
        return

    topics = data["topics"]
    if args.topic:
        topics = [t for t in topics if args.topic.lower() in t["id"].lower()]
        if not topics:
            print(f"❌ '{args.topic}' 주제를 찾을 수 없습니다.")
            print("사용 가능한 id 목록:", [t["id"] for t in data["topics"]])
            return

    print(f"🚀 OPIc MP3 생성 시작")
    print(f"   음성: {VOICE}  |  속도: {RATE}  |  대상: {len(topics)}개 주제")
    print(f"   출력 폴더: {BASE_DIR}")
    if args.force:
        print("   ⚠️  --force 모드: 기존 파일 덮어씁니다")

    total_generated = 0
    total_skipped = 0

    for topic in topics:
        gen, skip = await generate_topic(topic, force=args.force)
        total_generated += gen
        total_skipped += skip

    print(f"\n{'='*50}")
    print(f"✅ 완료!  생성: {total_generated}개  |  건너뜀: {total_skipped}개")
    print(f"{'='*50}")


if __name__ == "__main__":
    asyncio.run(main())
