# OPIc 시뮬레이터 프로젝트 가이드

## 프로젝트 개요
- Edge TTS 기반 OPIc 시험 시뮬레이터
- GPT-4o 연동 AI 채점 및 피드백
- Python(aiohttp) 백엔드 + 순수 HTML/JS 프론트엔드

## 서버 실행
```
터미널 1: python -m http.server 3000      # 프론트엔드
터미널 2: python tts_server.py             # TTS + AI API (port 8765)
```
접속: http://localhost:3000/pages/opic-test.html

## 커밋 컨벤션
Conventional Commits 사용:
- feat: 새 기능
- fix: 버그 수정
- refactor: 로직 변경 없는 코드 개선
- style: CSS/UI 변경
- docs: 문서
- chore: 설정, 빌드

---

## 블로그 포스트 작성 가이드

### 트리거
"블로그 써줘" / "포스트 작성해줘" / "회고 작성" 등의 요청 시 아래 가이드를 따른다.

### 블로그 레포 경로
`C:\Users\sangil\Desktop\sangil6372.github.io`

### 포스트 파일 규칙
- 위치: `_posts/YYYY-MM-DD-제목-슬러그.md`
- 파일명의 날짜: 오늘 날짜
- 슬러그: 영어 소문자, 하이픈 구분

### Front Matter 형식
```yaml
---
layout: post
title: "제목 (한국어)"
date: YYYY-MM-DD
categories: [개발, 회고]
tags: [관련태그1, 태그2]
---
```

### 포스트 구성 (이 순서와 형식을 반드시 지킨다)
1. **오늘 한 일** — 작업 목록을 3~5줄로 요약
2. **핵심 작업 해설** — 기술적으로 흥미로운 부분 2~3개를 코드 블록과 함께 설명
3. **문제 & 해결** — 막혔던 부분과 해결 방법 (없으면 생략)
4. **배운 점** — 짧게 2~3가지
5. **다음 작업** — 내일 또는 다음에 할 것

### 작성 톤
- 한국어, 구어체보다 약간 격식 있는 개발자 블로그 톤
- 코드는 실제 프로젝트 코드를 인용
- 분량: 800~1500자

### 포스트 작성 후 처리 (반드시 순서대로)
1. `_posts/` 에 파일 저장
2. `git add . && git commit -m "docs: YYYY-MM-DD 개발 회고"` (sangil6372.github.io 레포에서)
3. `git push origin main`
4. 완료 후 URL 알려주기: `https://sangil6372.github.io`
