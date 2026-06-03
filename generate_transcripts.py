#!/usr/bin/env python3
"""
OPIc MP3 영문 원문 추출 스크립트 (Whisper STT)

사용법:
  pip install faster-whisper
  python generate_transcripts.py

questions/original 폴더의 모든 Q(질문) MP3를 Whisper로 전사하여
src/data/transcripts.json 에 저장합니다.

이미 처리된 파일은 건너뛰므로 중단 후 재시작해도 됩니다.
"""

import json, os, sys, io

# Windows cp949 콘솔에서 UTF-8 출력 강제
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
QUESTIONS_JSON  = os.path.join(BASE_DIR, 'src', 'data', 'questions.json')
TRANSCRIPTS_JSON= os.path.join(BASE_DIR, 'src', 'data', 'transcripts.json')
ORIGINAL_DIR    = os.path.join(BASE_DIR, 'questions', 'original')


def collect_files(data):
    """questions.json에서 Q 파일 상대경로 전체 수집"""
    files = []
    seen  = set()

    def add(f):
        if f not in seen:
            seen.add(f)
            files.append(f)

    for f in data['intro']['q'].get('1', []):
        add(f)
    for section in ['selected', 'surprise', 'roleplayOnly']:
        for topic in data.get(section, []):
            for type_files in topic['q'].values():
                for f in type_files:
                    add(f)
    return files


def load_json(path, default=None):
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    return default if default is not None else {}


def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    # faster-whisper 확인
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("✗ faster-whisper 미설치")
        print("  설치: pip install faster-whisper")
        sys.exit(1)

    data  = load_json(QUESTIONS_JSON)
    all_files = collect_files(data)
    print(f"총 파일: {len(all_files)}개\n")

    transcripts = load_json(TRANSCRIPTS_JSON)
    remaining   = [f for f in all_files if f not in transcripts]
    print(f"이미 완료: {len(all_files)-len(remaining)}개  |  남은 파일: {len(remaining)}개\n")

    if not remaining:
        print("✓ 모든 파일 처리 완료 — transcripts.json 최신 상태")
        return

    # Whisper base 모델 (~148MB, 처음 실행 시 자동 다운로드)
    print("Whisper 모델 로딩 중...")
    model = WhisperModel("base", device="cpu", compute_type="int8")
    print("모델 준비 완료\n")

    done = errors = 0

    for i, rel in enumerate(remaining, 1):
        full = os.path.join(ORIGINAL_DIR, rel.replace('/', os.sep))

        if not os.path.exists(full):
            print(f"[{i}/{len(remaining)}] SKIP (없음): {rel}")
            continue

        try:
            segs, _ = model.transcribe(full, language='en', beam_size=3)
            text = ' '.join(s.text.strip() for s in segs).strip()
            transcripts[rel] = text
            done += 1
            print(f"[{i}/{len(remaining)}] ✓  {os.path.basename(full)}")
            print(f"            {text[:110]}")
        except Exception as e:
            errors += 1
            print(f"[{i}/{len(remaining)}] ✗  ERROR: {e}")

        # 10개마다 중간 저장 (중단 대비)
        if i % 10 == 0:
            save_json(TRANSCRIPTS_JSON, transcripts)
            print(f"  → 중간 저장 완료 ({len(transcripts)}개)")

    save_json(TRANSCRIPTS_JSON, transcripts)
    print(f"\n완료! 처리: {done}개  |  오류: {errors}개")
    print(f"저장: {TRANSCRIPTS_JSON}")


if __name__ == '__main__':
    main()
