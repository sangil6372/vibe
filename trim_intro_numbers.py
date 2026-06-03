#!/usr/bin/env python3
"""
OPIc 음원 앞 숫자 제거 스크립트

각 MP3 앞에 있는 "1." "2." ... 발화를 Whisper word-timestamp로 감지,
ffmpeg으로 그 구간을 잘라내고 원본 파일을 덮어씁니다.
transcripts.json 의 텍스트도 함께 정리합니다.
"""

import json, os, sys, re, subprocess, shutil, io

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

try:
    from faster_whisper import WhisperModel
except ImportError:
    print("faster-whisper 미설치: pip install faster-whisper")
    sys.exit(1)

BASE_DIR         = os.path.dirname(os.path.abspath(__file__))
QUESTIONS_JSON   = os.path.join(BASE_DIR, 'src', 'data', 'questions.json')
TRANSCRIPTS_JSON = os.path.join(BASE_DIR, 'src', 'data', 'transcripts.json')
ORIGINAL_DIR     = os.path.join(BASE_DIR, 'questions', 'original')
DONE_LOG         = os.path.join(BASE_DIR, 'src', 'data', 'trim_done.json')

NUMBER_WORDS = {
    'one','two','three','four','five','six','seven','eight','nine','ten',
    'eleven','twelve','thirteen','fourteen','fifteen'
}
NUM_PAT = re.compile(r'^\d{1,2}[.,]?$')   # "1." "2," "6" "10."
TXT_PAT = re.compile(r'^\d{1,2}\.\s+')    # 텍스트에서 "N. " 제거

SILENCE_BUF = 0.08   # 숫자 끝 이후 잘라낼 여유(초) — 너무 짧으면 뚝 끊김


def load_json(path, default=None):
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    return default if default is not None else {}


def save_json(path, obj):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def collect_files(data):
    files, seen = [], set()
    def add(f):
        if f not in seen:
            seen.add(f); files.append(f)
    for f in data['intro']['q'].get('1', []):
        add(f)
    for sec in ['selected', 'surprise', 'roleplayOnly']:
        for topic in data.get(sec, []):
            for lst in topic['q'].values():
                for f in lst: add(f)
    return files


def detect_trim_point(model, full_path):
    """첫 단어가 숫자면 그 end 시간 반환, 아니면 None"""
    segs, _ = model.transcribe(
        full_path, language='en', beam_size=3, word_timestamps=True
    )
    for seg in segs:
        if seg.words:
            w = seg.words[0]
            token = w.word.strip().lower().rstrip('.,')
            if NUM_PAT.match(w.word.strip()) or token in NUMBER_WORDS:
                trim_t = w.end + SILENCE_BUF
                return trim_t, w.word.strip()
        # 단어 없이 텍스트만 있으면 패턴으로 판단
        if TXT_PAT.match(seg.text):
            return seg.start + 0.5, '?'
        break   # 첫 세그먼트만 확인
    return None, None


def ffmpeg_trim(src, start_sec, dst):
    """ffmpeg으로 start_sec 이후만 추출 → dst에 저장"""
    cmd = [
        'ffmpeg', '-y',
        '-ss', f'{start_sec:.3f}',
        '-i', src,
        '-c', 'copy',
        dst
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.returncode == 0, r.stderr


def main():
    data        = load_json(QUESTIONS_JSON)
    transcripts = load_json(TRANSCRIPTS_JSON)
    done        = load_json(DONE_LOG)   # 이미 처리한 파일 기록

    all_files = collect_files(data)
    remaining = [f for f in all_files if f not in done]
    print(f"총 {len(all_files)}개  |  이미 처리: {len(done)}개  |  남은: {len(remaining)}개\n")

    if not remaining:
        print("모든 파일 처리 완료.")
        return

    print("Whisper 모델 로딩 중...")
    model = WhisperModel("base", device="cpu", compute_type="int8")
    print("준비 완료\n")

    trimmed = skipped = errors = 0

    for i, rel in enumerate(remaining, 1):
        full = os.path.join(ORIGINAL_DIR, rel.replace('/', os.sep))
        if not os.path.exists(full):
            print(f"[{i}/{len(remaining)}] SKIP (없음): {rel}")
            done[rel] = 'missing'
            continue

        # 트리밍 시작점 감지
        try:
            trim_t, num_word = detect_trim_point(model, full)
        except Exception as e:
            print(f"[{i}/{len(remaining)}] ERR (감지 실패): {os.path.basename(full)} — {e}")
            errors += 1
            continue

        if trim_t is None:
            print(f"[{i}/{len(remaining)}] SKIP (숫자 없음): {os.path.basename(full)}")
            done[rel] = 'no_number'
            # 텍스트도 정리
            if rel in transcripts:
                transcripts[rel] = TXT_PAT.sub('', transcripts[rel])
            skipped += 1
            continue

        # ffmpeg 트리밍 (임시 파일 → 원본 교체)
        tmp = full + '.tmp.mp3'
        ok, err = ffmpeg_trim(full, trim_t, tmp)
        if ok and os.path.exists(tmp):
            shutil.move(tmp, full)
            trimmed += 1
            print(f"[{i}/{len(remaining)}] OK  {num_word!r} 제거 ({trim_t:.2f}s) — {os.path.basename(full)}")
        else:
            if os.path.exists(tmp): os.remove(tmp)
            print(f"[{i}/{len(remaining)}] ERR (ffmpeg 실패): {os.path.basename(full)}")
            errors += 1
            continue

        # 텍스트 정리
        if rel in transcripts:
            transcripts[rel] = TXT_PAT.sub('', transcripts[rel])

        done[rel] = f'trimmed@{trim_t:.3f}'

        # 20개마다 중간 저장
        if i % 20 == 0:
            save_json(DONE_LOG, done)
            save_json(TRANSCRIPTS_JSON, transcripts)
            print(f"  → 중간 저장 ({trimmed}개 트리밍 완료)")

    save_json(DONE_LOG, done)
    save_json(TRANSCRIPTS_JSON, transcripts)
    print(f"\n완료!  트리밍: {trimmed}개  |  숫자없음(스킵): {skipped}개  |  오류: {errors}개")


if __name__ == '__main__':
    main()
