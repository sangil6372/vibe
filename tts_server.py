"""
OPIc TTS Server (localhost:8765)
================================
실행: python tts_server.py
→ 서버 시작 후 브라우저에서 http://127.0.0.1:8765 자동 열림
"""
import os, json, webbrowser, threading
from aiohttp import web
import edge_tts

ROOT_DIR     = os.path.dirname(os.path.abspath(__file__))
BASE_DIR     = os.path.join(ROOT_DIR, 'questions', 'custom')
ORIGINAL_DIR = os.path.join(ROOT_DIR, 'questions', 'original')
ENV_PATH     = os.path.join(ROOT_DIR, '.env')

def _load_env():
    """프로젝트 루트의 .env 파일을 읽어 os.environ에 주입"""
    if not os.path.exists(ENV_PATH):
        return
    with open(ENV_PATH, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"\''))

_load_env()
PUBLIC_DIR = os.path.join(ROOT_DIR, 'public')
QJSON_PATH = os.path.join(ROOT_DIR, 'src', 'data', 'questions.json')
VOICES = ['en-US-JennyNeural']
DEFAULT_VOICE = 'en-US-JennyNeural'
def _get_apikey():
    return os.environ.get('OPENAI_API_KEY', '')

THEME_KIND_MAP = {'survey': 'selected', 'surprise': 'surprise', 'intro': 'intro'}

@web.middleware
async def cors(request, handler):
    if request.method == 'OPTIONS':
        return web.Response(headers={
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        })
    resp = await handler(request)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp

# GET /ping
async def ping(req):
    return web.json_response({'ok': True, 'voices': VOICES})

# POST /tts  { text, folder, filename, voice, rate }
async def tts(req):
    d = await req.json()
    folder   = d['folder']
    filename = d['filename']
    out_dir  = os.path.join(BASE_DIR, folder)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, filename)
    voice_param = d.get('voice') or DEFAULT_VOICE  # 빈 문자열이어도 기본값 사용
    rate_param  = d.get('rate')  or '-5%'
    comm = edge_tts.Communicate(d['text'], voice_param, rate=rate_param)
    await comm.save(out_path)
    return web.json_response({'ok': True})

# GET /original?path=...  → questions/original/ 음원 스트리밍
async def original_audio(req):
    path_param = req.rel_url.query.get('path', '')
    if not path_param:
        return web.Response(status=400)
    safe = os.path.normpath(os.path.join(ORIGINAL_DIR, path_param.replace('/', os.sep)))
    if not safe.startswith(ORIGINAL_DIR):
        return web.Response(status=403)
    if not os.path.exists(safe):
        return web.Response(status=404)
    return web.FileResponse(safe, headers={'Content-Type': 'audio/mpeg'})

# GET /topic-originals  → 주제별 qtype별 원본 파일 경로 반환
async def topic_originals(req):
    try:
        with open(QJSON_PATH, encoding='utf-8') as f:
            qdata = json.load(f)
    except Exception:
        return web.json_response({'originals': {}})
    result = {}
    for section in ['intro', 'selected', 'surprise', 'roleplayOnly']:
        topics = [qdata['intro']] if section == 'intro' and 'intro' in qdata else qdata.get(section, [])
        for topic in topics:
            result[topic['name']] = {k: v for k, v in topic['q'].items()}
    return web.json_response({'originals': result})

# GET /topic-texts  → questions.json + transcripts.json 기반 주제별 원문 텍스트 반환
async def topic_texts(req):
    import re
    num_pat = re.compile(r'^\d+[\.\-]?\s*')
    try:
        with open(QJSON_PATH, encoding='utf-8') as f:
            qdata = json.load(f)
        tr_path = os.path.join(ROOT_DIR, 'src', 'data', 'transcripts.json')
        with open(tr_path, encoding='utf-8') as f:
            transcripts = json.load(f)
    except Exception as e:
        return web.json_response({'texts': {}})

    result = {}
    for section in ['intro', 'selected', 'surprise', 'roleplayOnly']:
        topics = []
        if section == 'intro':
            if 'intro' in qdata:
                topics = [qdata['intro']]
        else:
            topics = qdata.get(section, [])
        for topic in topics:
            name = topic['name']
            result[name] = {}
            for qtype_str, paths in topic['q'].items():
                texts = []
                for p in paths:
                    t = transcripts.get(p, '').strip()
                    if t:
                        texts.append(num_pat.sub('', t).strip())
                if texts:
                    result[name][qtype_str] = texts
    return web.json_response({'texts': result})

# GET /scan-themes  → custom 폴더 구조를 테마/문항 형태로 반환
async def scan_themes(req):
    import re
    pattern = re.compile(r'^(.+)_T(\d+)_(\d+)_Q\.mp3$')

    # questions.json 에서 공식 분류 로드
    type_map = {}   # name → 'intro' | 'survey' | 'surprise'
    try:
        with open(QJSON_PATH, encoding='utf-8') as f:
            qdata = json.load(f)
        if 'intro' in qdata:
            type_map[qdata['intro']['name']] = 'intro'
        for t in qdata.get('selected', []):
            type_map[t['name']] = 'survey'
        for t in qdata.get('surprise', []):
            type_map[t['name']] = 'surprise'
        for t in qdata.get('roleplayOnly', []):
            type_map[t['name']] = 'survey'
    except Exception:
        pass

    result = {}
    if os.path.exists(BASE_DIR):
        for folder in sorted(os.listdir(BASE_DIR)):
            folder_path = os.path.join(BASE_DIR, folder)
            if not os.path.isdir(folder_path):
                continue
            questions = []
            for f in sorted(os.listdir(folder_path)):
                if not f.endswith('.mp3'):
                    continue
                m = pattern.match(f)
                if m:
                    questions.append({'filename': f, 'qtype': int(m.group(2))})
            if not questions:
                continue
            # questions.json 분류 우선, 없으면 파일 패턴으로 추론
            if folder in type_map:
                theme_type = type_map[folder]
            else:
                qtypes = {q['qtype'] for q in questions}
                if 0 in qtypes:
                    theme_type = 'intro'
                elif 9 in qtypes or 10 in qtypes:
                    theme_type = 'surprise'
                else:
                    theme_type = 'survey'
            result[folder] = {'themeType': theme_type, 'questions': questions}
    return web.json_response({'themes': result})

# GET /scan  → custom 폴더 내 MP3 파일 목록
async def scan(req):
    files = []
    if os.path.exists(BASE_DIR):
        for root, _, fs in os.walk(BASE_DIR):
            for f in fs:
                if f.endswith('.mp3'):
                    rel = os.path.relpath(os.path.join(root, f), BASE_DIR)
                    files.append(rel.replace('\\', '/'))
    return web.json_response({'files': files})

# POST /update-qjson  { topic, themeType, qtype, filename }
# TTS 생성 후 questions.json의 custom 섹션에 자동 반영
async def update_qjson(req):
    d = await req.json()
    topic_name = d['topic']
    theme_type = d.get('themeType', 'surprise')
    topic_kind = THEME_KIND_MAP.get(theme_type, 'surprise')
    qtype      = str(int(d['qtype']))
    filename   = d['filename']
    rel_path   = f'custom/{topic_name}/{filename}'

    try:
        with open(QJSON_PATH, encoding='utf-8') as f:
            data = json.load(f)

        custom = data.get('custom', [])
        topic  = next((t for t in custom if t['name'] == topic_name), None)
        if not topic:
            topic = {'name': topic_name, 'topicKind': topic_kind, 'q': {}}
            custom.append(topic)

        if qtype not in topic['q']:
            topic['q'][qtype] = []
        if rel_path not in topic['q'][qtype]:
            topic['q'][qtype].append(rel_path)

        data['custom'] = custom
        if 'customBase' not in data:
            data['customBase'] = '../questions/'

        with open(QJSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return web.json_response({'ok': True})
    except Exception as e:
        return web.json_response({'ok': False, 'error': str(e)}, status=500)

# GET /custom-status  → custom 섹션의 T9/T10 현황 반환
async def custom_status(req):
    try:
        with open(QJSON_PATH, encoding='utf-8') as f:
            data = json.load(f)
        custom = data.get('custom', [])
        topics_t9  = [t['name'] for t in custom if '9'  in t.get('q', {})]
        topics_t10 = [t['name'] for t in custom if '10' in t.get('q', {})]
        return web.json_response({'t9': topics_t9, 't10': topics_t10, 'total': len(custom)})
    except Exception as e:
        return web.json_response({'t9': [], 't10': [], 'total': 0})

# POST /delete  { folder, filename }
async def delete(req):
    d = await req.json()
    path = os.path.join(BASE_DIR, d['folder'], d['filename'])
    if os.path.exists(path): os.remove(path)
    return web.json_response({'ok': True})

# GET /audio?folder=xxx&filename=yyy  → MP3 스트리밍
async def audio(req):
    folder   = req.rel_url.query.get('folder', '')
    filename = req.rel_url.query.get('filename', '')
    path = os.path.join(BASE_DIR, folder, filename)
    if not os.path.exists(path):
        return web.Response(status=404)
    return web.FileResponse(path, headers={'Content-Type': 'audio/mpeg'})

# GET /apikey-status  → API 키 설정 여부 반환
async def apikey_status(req):
    key = _get_apikey()
    return web.json_response({
        'ok': bool(key),
        'masked': (key[:8] + '...' + key[-4:]) if key else ''
    })

# POST /apikey-save  { key } → .env 파일에 저장
async def apikey_save(req):
    d = await req.json()
    key = d.get('key', '').strip()
    if not key.startswith('sk-'):
        return web.json_response({'ok': False, 'error': '올바른 OpenAI API 키 형식이 아닙니다 (sk-로 시작해야 합니다)'})

    lines = []
    found = False
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, encoding='utf-8') as f:
            for line in f:
                if line.startswith('OPENAI_API_KEY='):
                    lines.append(f'OPENAI_API_KEY={key}\n')
                    found = True
                else:
                    lines.append(line)
    if not found:
        lines.append(f'OPENAI_API_KEY={key}\n')

    with open(ENV_PATH, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    os.environ['OPENAI_API_KEY'] = key
    return web.json_response({'ok': True})

# POST /feedback  { questionText, transcript } → Claude AI 피드백 반환
async def feedback(req):
    d = await req.json()
    question_text = d.get('questionText', '').strip()
    transcript    = d.get('transcript', '').strip()

    api_key = _get_apikey()
    if not api_key:
        return web.json_response({'ok': False, 'error': 'OPENAI_API_KEY가 .env 파일에 없습니다.'})

    if not transcript:
        return web.json_response({'ok': False, 'error':
            '음성 인식 결과가 없습니다.\n'
            'Chrome 브라우저에서 마이크 권한을 허용하고 다시 시도해 주세요.'})

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        # ── 1단계: STT 오인식 정제 ──────────────────────────────
        refine_resp = client.chat.completions.create(
            model='gpt-4o',
            max_tokens=600,
            messages=[
                {'role': 'system', 'content':
                    '아래는 수험자가 영어로 말한 내용을 음성인식(STT)한 텍스트입니다. '
                    '음성인식 오류(오인식 단어, 누락된 구두점, 붙어쓰기 등)만 문맥에 맞게 교정하세요. '
                    '내용·의미는 절대 바꾸지 말고, 수험자가 실제로 말한 수준 그대로 유지하세요. '
                    '교정된 텍스트만 반환하세요.'},
                {'role': 'user', 'content': transcript}
            ]
        )
        transcript = refine_resp.choices[0].message.content.strip()

        # ── 2단계: 피드백 생성 ──────────────────────────────────
        system_prompt = """당신은 OPIc 공인 평가관입니다. 수험자의 영어 말하기 답변을 정확히 분석하고, 실질적인 피드백과 완성된 모범 답변을 한국어로 제공합니다.

## OPIc 등급 핵심 기준

**IM2**: 익숙한 주제를 단순 문장 나열로 설명. 어휘·문법 제한적, 시제 오류 빈번, 연결어 거의 없음, 단편적 정보 나열.

**IH**: 단락 수준의 담화 가능. 과거·현재·미래 시제 비교적 정확히 사용. 구체적 세부사항 포함. 예상치 못한 주제에도 대응. 간단한 비교·대조 가능. 연결어(however, therefore, in addition 등) 사용.

**AL**: 긴 담화 구성 가능. 풍부하고 정확한 어휘. 복잡한 문장 구조(관계절, 가정법 등). 논리적 흐름과 생생한 묘사. 비교·추측·가설 표현. 원어민 수준의 자연스러운 연결. 스토리텔링 구조(배경→전개→결말)."""

        user_prompt = f"""**질문:** {question_text}

**수험자 답변:** {transcript}

---

아래 형식으로 피드백을 작성해주세요:

## 📊 현재 수준 진단
예상 등급(IM2 / IH / AL)을 명시하고, 답변의 구체적인 표현을 인용하며 판단 근거를 2~3문장으로 설명.

## 🔍 세부 분석

**어휘 (Vocabulary)**
사용된 어휘 수준을 평가하고, 더 높은 수준으로 올릴 수 있는 대체 표현을 구체적으로 제시.
예) "good" → "remarkable / outstanding", "went" → "ventured / embarked"

**문법 / 시제 (Grammar & Tense)**
오류나 어색한 부분을 원문 그대로 인용 후 수정 버전 제시.

**내용 구성 (Content & Structure)**
답변 구조의 논리성, 세부사항의 충분성, 스토리텔링 여부 평가.

**연결어 (Connectors & Flow)**
사용된 연결어를 평가하고, 답변 흐름을 자연스럽게 할 추가 연결어 제안.

## ⬆️ 다음 등급을 위한 핵심 포인트 (3가지)
매우 구체적으로, 즉시 적용 가능한 실천 방법으로.

## 💎 AL 수준 모범 답변 (완전 재작성)
단순 다듬기가 아닌 완전한 재작성. 반드시 아래 규칙을 지킬 것:
- 주제(topic)만 유지하고 수험자의 문장 구조·표현은 버릴 것
- 150단어 이상 (실제 2분 스피치 분량)
- 구조: 도입 1문장 → 구체적 경험/묘사 3~4문장 → 감정·교훈·마무리 1~2문장
- 필수 AL 요소:
  · 관계절 1개 이상 (which / that / who)
  · 부사절 또는 분사구문 1개 이상 (Having done~ / While I was~ / Given that~)
  · 고급 어휘 5개 이상 — 수험자가 쓴 평범한 단어를 반드시 업그레이드
  · 생생한 감각 묘사 (시각·청각·감정 중 최소 1가지)
- 읽는 글이 아닌 실제로 말하는 듯한 자연스러운 구어체로 작성"""

        resp = client.chat.completions.create(
            model='gpt-4o',
            max_tokens=2000,
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user',   'content': user_prompt}
            ]
        )
        return web.json_response({
            'ok': True,
            'feedback': resp.choices[0].message.content,
            'refinedTranscript': transcript
        })
    except ImportError:
        return web.json_response({'ok': False, 'error': 'openai 패키지 미설치\n터미널: pip install openai'})
    except Exception as e:
        return web.json_response({'ok': False, 'error': str(e)})

# POST /overall-feedback  → 전체 답변 종합 평가 + 최종 등급
async def overall_feedback(req):
    api_key = _get_apikey()
    if not api_key:
        return web.json_response({'ok': False, 'error': 'OpenAI API 키가 없습니다.'})
    d = await req.json()
    questions = [q for q in d.get('questions', []) if q.get('transcript', '').strip()]
    if not questions:
        return web.json_response({'ok': False, 'error': '음성 인식된 답변이 없습니다.'})

    def _q_line(q):
        base = (f"[Q{q['idx']+1} | {q.get('meta',{}).get('combo','?')} | {q.get('meta',{}).get('topicKind','?')}]\n"
                f"질문: {q['questionText']}\n답변: {q['transcript']}")
        pron = ', '.join(q.get('pronunciation_issues', []))
        return base + (f"\n음성 분석: {pron}" if pron else "")
    q_text = '\n\n'.join(_q_line(q) for q in questions)

    system_prompt = """당신은 ACTFL OPIc 공인 평가관입니다. 수험자의 전체 시험 답변을 분석하여 최종 등급을 결정하고 OPIc 공식 Diagnostic Comments Form을 작성합니다.

## OPIc 등급 상세 기준

**NH (Novice High)**
Intermediate 수준 기능 대부분 수행 가능하나 일부 붕괴 발생. 자신만의 표현을 만드는 능력(create with language) 부족 또는 단순 문장 유지 실패.

**IL (Intermediate Low)**
모든 Intermediate 기준 충족하나 겨우 통과 수준. 주로 암기된 표현 조합. 짧고 단편적 문장, 잦은 망설임, 강한 모국어 영향.

**IM1 (Intermediate Mid 1)**
Intermediate 기준 충족, 약간의 질적 수준. 익숙한 주제에서 문장 생성 가능. 어휘·문법 제한, 자기수정 빈번.

**IM2 (Intermediate Mid 2)**
Intermediate 기준을 양적·질적으로 충족. 문장들의 연결 가능. 익숙한 주제에서 편안하게 소통. 제한된 어휘·발음·문법으로 이해 가능.

**IM3 (Intermediate Mid 3)**
모든 Intermediate 기준에서 일관되게 강함. Advanced 기능 일부 시도하지만 유지 못함. 단락 수준 담화 시도.

**IH (Intermediate High)**
Advanced 수준 기능 대부분 수행하나 완전히 유지 못함. 단락 수준 담화 시도, 시제 전환 시 혼동, 서술/묘사 시 breakdown 발생.

**AL (Advanced Low)**
모든 주요 시제에서 서술·묘사 가능. 단락 수준의 연결된 담화. 예상치 못한 상황 처리. 원어민에게 일관되게 이해됨.

**AM (Advanced Mid)**
AL보다 더 풍부하고 복잡한 담화. 다양한 주제에서 자신감 있게 표현. 고급 어휘와 복잡한 문장 구조.

**AH (Advanced High)**
Superior 수준에 근접. 추상적 주제 처리 가능. 가설·추측·논쟁 표현. 간헐적 breakdown만 있음.

## 평가 요소
1. Function: 수행하는 언어 기능 수준
2. Content: 주제 범위와 표현 깊이
3. Accuracy: 문법·어휘·발음 정확도
4. Text Type: 단어→구→문장→단락 수준

## OPIc Diagnostic Form 작성 지침

"diagnostic" 객체의 각 필드를 아래 기준으로 채웁니다.

### performance 값 (4단계)
"Does Not Meet Criteria" | "Developing Ability" | "Meets Criteria Minimally" | "Meets Criteria Fully"

### 등급별 performance 매핑
| Grade | int1~int4      | adv1~adv3         | adv4~adv5              |
|-------|----------------|-------------------|------------------------|
| NH    | Minimally      | Does Not Meet     | Does Not Meet          |
| IL    | Minimally      | Does Not Meet     | Does Not Meet          |
| IM1   | Fully          | Developing        | Developing             |
| IM2   | Fully          | Developing        | Developing             |
| IM3   | Fully          | Developing        | Meets Criteria Minimally|
| IH    | Fully          | Meets Minimally   | Meets Minimally        |
| AL    | Fully          | Meets Minimally   | Meets Criteria Fully   |
| AM/AH | Fully          | Fully             | Fully                  |

### adv2.discourse_level (묘사 문제 Q2/Q5/Q8 기준, 반드시 하나)
- "words_phrases"      → IL  (단어/구 나열)
- "sentences"          → IM1 (단순 문장)
- "strings_sentences"  → IM2 (문장 연속, 접속사 미사용)
- "connected_sentences"→ IM3 (접속사·관계절 사용)
- "skeletal_paragraphs"→ IH/AL (서론-본론-결론 구조)

### adv4.complication (롤플레이 D문항 기준, 반드시 하나)
- "struggles_succeeds" → IH/AL (어려웠지만 해결)
- "attempts_fails"     → IM   (시도했으나 실패)
- "no_ability"         → IL-  (전혀 대응 불가)
롤플레이 문항 없으면 전반적 능동적 의사소통 능력으로 판단.

### 체크 항목 (해당하면 배열에 포함, 없으면 빈 배열)
- adv1.time_checks: present_desc, past_desc, future_desc, present_narr, past_narr, future_narr
- adv1.narr_problems: logical_seq, verb_forms, person_markers
- adv1.desc_lacks: clarity, detail
- adv2.word_order: phrases, sentences, paragraphs
- adv2.cohesive: not_used, used_inaccurately, repetitive
- adv3.vocab_checks: lacks_breadth, other_languages, false_cognates
- adv4.improve_checks: communicative_devices
- adv5.fluency_checks: rate_of_speech, fluidity, connectedness (음성 분석 결과에서 판단)
- adv5.grammar_checks: word_structure, syntax, cases, prepositions, agreement (수일치 오류→agreement 반드시 포함)
- adv5.pragmatic_checks: lacks_strategies
- adv5.pronunciation_checks: articulation, pitch, stress, intonation (음성 분석 결과에서 판단)
- int1.needs: increase_vocab, improve_listening, produce_sentence_level
- int2.needs: words_phrases, some_sentences, mostly_sentences
- int3.needs: formulate_questions, produce_enough_questions
- int4.fluency_checks: rate_of_speech, reduce_pauses, dead_ending, false_starts, repetition (음성 분석 결과 + 텍스트 혼합 판단)
- int4.pronunciation_checks: articulation, pitch, stress, intonation (음성 분석 결과에서 판단)
- int4.grammar_checks: control_simple_grammar, create_complete_sentences
- int4.syntax_checks: improve_word_order

### 음성 분석 결과 활용
각 문항에 '음성 분석:' 항목이 있으면 GPT-4o 오디오 모델이 실제 녹음에서 감지한 발음/유창성 이슈입니다.
여러 문항의 이슈를 집계해 adv5/int4의 fluency_checks/pronunciation_checks를 결정하세요.
예: 3문항 이상에서 'stress' 감지 → adv5.pronunciation_checks에 'stress' 포함"""

    user_prompt = f"""아래는 수험자의 OPIc 전체 답변입니다:

{q_text}

반드시 유효한 JSON만 반환하세요 (다른 텍스트 없이):

{{
  "grade": "IH",
  "gradeRationale": "이 등급 부여 근거 — 실제 답변 인용 포함 2-3문장",
  "overallSummary": "수험자 전반적 수준 총평 2-3문장",
  "strengths": ["강점1 (근거)", "강점2", "강점3"],
  "improvements": ["개선점1 (근거+방법)", "개선점2", "개선점3"],
  "nextLevelAdvice": "다음 등급 달성 위한 구체적 학습 방향 2-3문장",
  "perQuestion": [
    {{"idx": 0, "grade": "IH", "oneLiner": "핵심 코멘트 한 줄"}}
  ],
  "diagnostic": {{
    "adv1": {{"performance": "Developing Ability", "time_checks": [], "narr_problems": [], "desc_lacks": []}},
    "adv2": {{"performance": "Developing Ability", "discourse_level": "strings_sentences", "word_order": [], "cohesive": []}},
    "adv3": {{"performance": "Meets Criteria Minimally", "vocab_checks": []}},
    "adv4": {{"performance": "Meets Criteria Minimally", "complication": "struggles_succeeds", "improve_checks": []}},
    "adv5": {{"performance": "Developing Ability", "fluency_checks": [], "grammar_checks": [], "pragmatic_checks": [], "pronunciation_checks": []}},
    "int1": {{"performance": "Meets Criteria Fully", "needs": []}},
    "int2": {{"performance": "Meets Criteria Fully", "needs": []}},
    "int3": {{"performance": "Meets Criteria Fully", "needs": []}},
    "int4": {{"performance": "Meets Criteria Fully", "fluency_checks": [], "pronunciation_checks": [], "grammar_checks": [], "syntax_checks": []}}
  }}
}}"""

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model='gpt-4o',
            max_tokens=4000,
            response_format={'type': 'json_object'},
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user',   'content': user_prompt}
            ]
        )
        result = json.loads(resp.choices[0].message.content)
        return web.json_response({'ok': True, 'result': result})
    except ImportError:
        return web.json_response({'ok': False, 'error': 'openai 패키지 미설치'})
    except Exception as e:
        return web.json_response({'ok': False, 'error': str(e)})

# POST /stt-evaluate  → GPT-4o Audio: 음성 전사 + 발음/유창성 평가
async def stt_evaluate(req):
    api_key = _get_apikey()
    if not api_key:
        return web.json_response({'ok': False, 'error': 'API 키 없음'})

    reader = await req.multipart()
    audio_bytes = None
    question_text = ''
    async for field in reader:
        if field.name == 'audio':
            audio_bytes = await field.read()
        elif field.name == 'questionText':
            question_text = (await field.text())[:300]

    if not audio_bytes:
        return web.json_response({'ok': False, 'error': '오디오 데이터 없음'})

    import base64
    audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')

    prompt_text = (
        "You are an ACTFL OPIc speech evaluator. Listen carefully to the English speech recording.\n"
        "Return ONLY valid JSON, no extra text:\n"
        '{"transcript": "<exact transcription>", "pronunciation_issues": ["<issue>", ...]}\n\n'
        "pronunciation_issues must be a subset of (include only issues you clearly detect):\n"
        "- rate_of_speech: unusually fast or slow delivery\n"
        "- fluidity: halting, frequent mid-sentence pauses\n"
        "- connectedness: speech sounds disconnected or fragmented\n"
        "- articulation: words pronounced unclearly\n"
        "- stress: incorrect word stress patterns\n"
        "- intonation: flat or unnatural pitch variation\n"
        "- dead_ending: sentences trail off or end incompletely\n"
        "- false_starts: frequent restarts mid-sentence\n"
        "- repetition: excessive repetition of words or phrases"
    )
    if question_text:
        prompt_text += f"\n\nQuestion context: {question_text}"

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model='gpt-4o-audio-preview',
            max_tokens=600,
            messages=[{
                'role': 'user',
                'content': [
                    {'type': 'input_audio', 'input_audio': {'data': audio_b64, 'format': 'webm'}},
                    {'type': 'text', 'text': prompt_text}
                ]
            }]
        )
        raw = resp.choices[0].message.content.strip()
        # strip markdown code fences if present
        raw = re.sub(r'^```[^\n]*\n?', '', raw)
        raw = re.sub(r'\n?```$', '', raw.strip())
        result = json.loads(raw)
        return web.json_response({
            'ok': True,
            'transcript': result.get('transcript', ''),
            'pronunciation_issues': result.get('pronunciation_issues', [])
        })
    except ImportError:
        return web.json_response({'ok': False, 'error': 'openai 패키지 미설치'})
    except Exception as e:
        return web.json_response({'ok': False, 'error': str(e)})


# POST /save-recordings  → 녹음 파일 영구 저장
async def save_recordings(req):
    from datetime import datetime as dt
    session_id = dt.now().strftime('%Y%m%d_%H%M%S')
    save_dir = os.path.join(ROOT_DIR, 'recordings', session_id)
    os.makedirs(save_dir, exist_ok=True)
    try:
        reader = await req.multipart()
        meta_raw = '[]'
        saved = []
        async for field in reader:
            if field.name == 'meta':
                meta_raw = await field.text()
            elif field.name and field.name.startswith('rec_'):
                q_num = int(field.name.replace('rec_', ''))
                fname = f'Q{q_num+1:02d}.webm'
                data  = await field.read()
                with open(os.path.join(save_dir, fname), 'wb') as f:
                    f.write(data)
                saved.append(fname)

        meta_path = os.path.join(save_dir, 'session_info.json')
        with open(meta_path, 'w', encoding='utf-8') as f:
            json.dump({'session': session_id, 'questions': json.loads(meta_raw)}, f,
                      ensure_ascii=False, indent=2)

        return web.json_response({'ok': True, 'session': session_id, 'saved': saved})
    except Exception as e:
        return web.json_response({'ok': False, 'error': str(e)}, status=500)

FEEDBACK_DIR = os.path.join(ROOT_DIR, 'recordings')

# POST /save-feedback-item  → 피드백 팝업에서 저장
async def save_feedback_item(req):
    from datetime import datetime as dt
    fb_id = 'fb_' + dt.now().strftime('%Y%m%d_%H%M%S')
    save_dir = os.path.join(FEEDBACK_DIR, fb_id)
    os.makedirs(save_dir, exist_ok=True)
    try:
        reader = await req.multipart()
        info_raw = '{}'
        async for field in reader:
            if field.name == 'info':
                info_raw = await field.text()
            elif field.name == 'recording':
                data = await field.read()
                with open(os.path.join(save_dir, 'recording.webm'), 'wb') as f:
                    f.write(data)
        info = json.loads(info_raw)
        info['id'] = fb_id
        with open(os.path.join(save_dir, 'info.json'), 'w', encoding='utf-8') as f:
            json.dump(info, f, ensure_ascii=False, indent=2)
        return web.json_response({'ok': True, 'id': fb_id})
    except Exception as e:
        return web.json_response({'ok': False, 'error': str(e)}, status=500)

# POST /model-tts  { id, text, voice?, rate? } → 모범 답변 TTS 생성
async def model_tts(req):
    d = await req.json()
    fb_id = d.get('id', '')
    text  = d.get('text', '').strip()
    if not fb_id or not text:
        return web.json_response({'ok': False, 'error': 'id 또는 text 없음'})
    save_dir = os.path.join(FEEDBACK_DIR, fb_id)
    if not os.path.isdir(save_dir):
        return web.json_response({'ok': False, 'error': '저장 폴더 없음'})
    try:
        voice = d.get('voice') or DEFAULT_VOICE
        rate  = d.get('rate')  or '-5%'
        out_path = os.path.join(save_dir, 'model.mp3')
        comm = edge_tts.Communicate(text, voice, rate=rate)
        await comm.save(out_path)
        # info.json 업데이트
        info_path = os.path.join(save_dir, 'info.json')
        if os.path.exists(info_path):
            with open(info_path, encoding='utf-8') as f:
                info = json.load(f)
            info['hasModel'] = True
            with open(info_path, 'w', encoding='utf-8') as f:
                json.dump(info, f, ensure_ascii=False, indent=2)
        return web.json_response({'ok': True})
    except Exception as e:
        return web.json_response({'ok': False, 'error': str(e)}, status=500)

# GET /feedback-items  → 저장된 피드백 목록 반환
async def feedback_items(req):
    items = []
    if os.path.exists(FEEDBACK_DIR):
        for name in sorted(os.listdir(FEEDBACK_DIR), reverse=True):
            if not name.startswith('fb_'):
                continue
            info_path = os.path.join(FEEDBACK_DIR, name, 'info.json')
            if not os.path.exists(info_path):
                continue
            try:
                with open(info_path, encoding='utf-8') as f:
                    info = json.load(f)
                items.append(info)
            except Exception:
                pass
    return web.json_response({'items': items})

# GET /feedback-audio?id=fb_xxx&file=recording.webm
async def feedback_audio(req):
    fb_id    = req.rel_url.query.get('id', '')
    filename = req.rel_url.query.get('file', '')
    if not fb_id or not filename:
        return web.Response(status=400)
    safe = os.path.normpath(os.path.join(FEEDBACK_DIR, fb_id, filename))
    if not safe.startswith(FEEDBACK_DIR):
        return web.Response(status=403)
    if not os.path.exists(safe):
        return web.Response(status=404)
    mime = 'audio/webm' if filename.endswith('.webm') else 'audio/mpeg'
    return web.FileResponse(safe, headers={'Content-Type': mime})

# GET /  →  admin.html 리다이렉트
async def index(req):
    raise web.HTTPFound('/admin.html')

# GET /admin.html  →  public/admin.html 서빙
async def serve_admin(req):
    path = os.path.join(PUBLIC_DIR, 'admin.html')
    return web.FileResponse(path)

async def serve_static(req):
    # req.path = '/assets/js/vue.global.js'  →  strip '/'  →  join ROOT_DIR
    rel  = req.path.lstrip('/')
    path = os.path.join(ROOT_DIR, rel)
    if not os.path.isfile(path):
        return web.Response(status=404, text=f'Not found: {rel}')
    return web.FileResponse(path)

app = web.Application(middlewares=[cors])
app.router.add_get('/',              index)
app.router.add_get('/admin.html',    serve_admin)
app.router.add_get('/assets/{tail:.*}', serve_static)
app.router.add_get('/ping',           ping)
app.router.add_post('/update-qjson', update_qjson)
app.router.add_get('/custom-status', custom_status)
app.router.add_post('/tts',          tts)
app.router.add_get('/scan',          scan)
app.router.add_get('/scan-themes',   scan_themes)
app.router.add_get('/topic-texts',   topic_texts)
app.router.add_get('/topic-originals', topic_originals)
app.router.add_get('/original',      original_audio)
app.router.add_post('/feedback',         feedback)
app.router.add_post('/overall-feedback', overall_feedback)
app.router.add_post('/stt-evaluate',     stt_evaluate)
app.router.add_post('/save-recordings',    save_recordings)
app.router.add_post('/save-feedback-item', save_feedback_item)
app.router.add_post('/model-tts',          model_tts)
app.router.add_get('/feedback-items',      feedback_items)
app.router.add_get('/feedback-audio',      feedback_audio)
app.router.add_get('/apikey-status',   apikey_status)
app.router.add_post('/apikey-save',    apikey_save)
app.router.add_post('/delete',       delete)
app.router.add_get('/audio',         audio)
app.router.add_route('OPTIONS', '/{path_info:.*}', lambda r: web.Response())

if __name__ == '__main__':
    ADMIN_URL = 'http://localhost:3000/public/admin.html'
    print('=' * 45)
    print(f' OPIc Admin  →  {ADMIN_URL}')
    print(' TTS API     →  http://127.0.0.1:8765')
    print(' 종료: Ctrl+C')
    print('=' * 45)
    # 1.2초 후 브라우저 자동 실행
    threading.Timer(1.2, lambda: webbrowser.open(ADMIN_URL)).start()
    web.run_app(app, host='127.0.0.1', port=8765, print=None, access_log=None)
