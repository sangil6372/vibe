#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
migrate_to_custom.py

questions/original/ 음성 파일을 custom 명명 규칙으로
questions/custom/ 에 복사하고 questions.json / transcripts.json 경로를 갱신한다.

사용법:
  python migrate_to_custom.py            # 실행
  python migrate_to_custom.py --dry-run  # 복사 없이 경로 출력만
"""

import json
import os
import shutil
import sys

DRY_RUN = '--dry-run' in sys.argv

QUESTIONS_JSON   = 'src/data/questions.json'
TRANSCRIPTS_JSON = 'src/data/transcripts.json'
ORIGINAL_BASE    = 'questions/original'
CUSTOM_BASE      = 'questions/custom'

# 구형 naming convention 파일 (삭제 대상)
LEGACY_FILES = [
    os.path.join(CUSTOM_BASE, '공원', '공원_1_Q.mp3'),
    os.path.join(CUSTOM_BASE, '공원', '공원_2_Q.mp3'),
    os.path.join(CUSTOM_BASE, '공원', '공원_3_Q.mp3'),
    os.path.join(CUSTOM_BASE, 'Q_1779712865578.mp3'),
]


def migrate():
    with open(QUESTIONS_JSON, encoding='utf-8') as f:
        data = json.load(f)

    with open(TRANSCRIPTS_JSON, encoding='utf-8') as f:
        transcripts = json.load(f)

    path_map = {}   # old_rel → new_rel
    missing  = []
    copied   = 0

    def process_section(topics):
        nonlocal copied
        for topic in topics:
            name = topic['name']
            for type_key, file_list in topic['q'].items():
                for idx, old_rel in enumerate(file_list):
                    variant      = idx + 1
                    new_filename = f'{name}_T{type_key}_{variant}_Q.mp3'
                    new_rel      = f'{name}/{new_filename}'
                    src          = os.path.join(ORIGINAL_BASE, old_rel)
                    dst          = os.path.join(CUSTOM_BASE,   new_rel)

                    if not os.path.exists(src):
                        missing.append(src)
                        print(f'[MISSING] {src}')
                        continue

                    if not DRY_RUN:
                        os.makedirs(os.path.dirname(dst), exist_ok=True)
                        shutil.copy2(src, dst)
                        copied += 1

                    path_map[old_rel] = new_rel
                    label = 'DRY' if DRY_RUN else 'COPY'
                    print(f'[{label}] {old_rel}')
                    print(f'       → {new_rel}')

    # intro는 단일 dict
    process_section([data['intro']])

    for section_key in ('selected', 'surprise', 'roleplayOnly'):
        if section_key in data:
            process_section(data[section_key])

    if DRY_RUN:
        print(f'\n[DRY RUN] {len(path_map)}개 복사 예정 / 누락 {len(missing)}개')
        return

    # ── questions.json 업데이트 ──────────────────────────────
    data['base'] = '../questions/custom/'

    def remap_paths(topics):
        for topic in topics:
            for type_key in topic['q']:
                topic['q'][type_key] = [
                    path_map.get(p, p) for p in topic['q'][type_key]
                ]

    remap_paths([data['intro']])
    for section_key in ('selected', 'surprise', 'roleplayOnly'):
        if section_key in data:
            remap_paths(data[section_key])
    # 'custom' 섹션은 customBase 경로 사용이므로 건드리지 않는다

    with open(QUESTIONS_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'\n[OK] {QUESTIONS_JSON} 업데이트 완료')

    # ── transcripts.json 업데이트 ──────────────────────────────
    new_transcripts = {
        path_map.get(k, k): v for k, v in transcripts.items()
    }
    with open(TRANSCRIPTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(new_transcripts, f, ensure_ascii=False, indent=2)
    print(f'[OK] {TRANSCRIPTS_JSON} 업데이트 완료')

    # ── 구형 파일 정리 ──────────────────────────────────────────
    cleaned = 0
    for path in LEGACY_FILES:
        if os.path.exists(path):
            os.remove(path)
            print(f'[DEL] {path}')
            cleaned += 1

    print(f'\n완료: {copied}개 복사 / {len(missing)}개 누락 / {cleaned}개 구형파일 삭제')


if __name__ == '__main__':
    migrate()
