import json, asyncio
from playwright.async_api import async_playwright

SESSION = {
  "questions": [
    {
      "idx": 0,
      "questionText": "Can you please tell me a little bit about yourself?",
      "transcript": "Hello, my name is Minjun. I am 27 years old and I work at a IT company in Seoul. I am working as a software developer. In my free time, I like to listen to music and watch movies. I also like to go hiking on weekends. I think I am a hardworking person and I enjoy learning new things.",
      "meta": {"combo": "자기소개", "qtype": 0, "topicKind": "intro", "topic": "자기소개"},
      "feedback": "## 📊 현재 수준 진단\n예상 등급: **IM2**\n자신을 소개하는 기본적인 내용은 전달되었으나, '\"I am 27 years old\"', '\"I like to listen to music\"' 등 단순한 문장이 반복됩니다. 연결어 없이 정보를 나열하는 구조로 IM2 수준에 해당합니다.\n\n## 🔍 세부 분석\n\n**어휘 (Vocabulary)**\n- \"work at a IT company\" → \"am employed at an IT firm\"\n- \"like to\" 3회 반복 → \"enjoy\", \"am passionate about\" 등으로 다양화\n- \"hardworking\" → \"dedicated\", \"diligent\"\n\n**문법 / 시제 (Grammar & Tense)**\n- \"work at a IT company\" → \"work at **an** IT company\" (관사 오류)\n- 전반적으로 현재 시제는 정확하나 문장이 지나치게 단순함\n\n**내용 구성 (Content & Structure)**\n나이·직업·취미를 열거하는 단편적 구성. 각 정보를 뒷받침하는 구체적 에피소드나 이유가 없어 깊이가 부족합니다.\n\n**연결어 (Connectors & Flow)**\n- \"and\", \"also\" 외에 연결어 부재\n- 추가 권장: \"In addition\", \"What I enjoy most is\", \"Not only... but also\"\n\n## ⬆️ 다음 등급을 위한 핵심 포인트\n- 단순 나열 대신 관계절(which, that) 사용 — \"I have been working as a developer for two years, which has taught me...\"\n- 취미 하나를 골라 구체적인 경험으로 확장 (언제, 어디서, 왜)\n- 시간 프레임 다양화 — \"On weekends\", \"After work\", \"Whenever I have a chance\"\n\n## 💎 AL 수준 모범 답변\nHi, my name is Minjun, and I'm a software developer based in Seoul, where I've been working for a mid-sized IT firm for the past two years. What I find most rewarding about my job is the constant problem-solving — there's always something new to figure out, which keeps me genuinely motivated. Outside of work, I'm quite passionate about hiking, particularly exploring the trails around Bukhansan on weekends. Having grown up in a small town surrounded by mountains, being in nature is something that truly recharges me. I also enjoy listening to jazz while I code — it helps me concentrate and stay in a creative mindset. Overall, I'd describe myself as someone who values continuous learning and finding balance between a demanding career and an active lifestyle."
    },
    {"idx": 1, "questionText": "Describe your home. What does it look like?", "transcript": "I live in an apartment in Seoul. My apartment is not very big but it is comfortable. There is a living room, a kitchen, and two bedrooms. I have a sofa and a TV in the living room. I like my apartment because it is near the subway station. It is very convenient for me.", "meta": {"combo": "I", "qtype": 1, "topicKind": "selected", "topic": "집"}, "feedback": None},
    {"idx": 2, "questionText": "What do you usually do at home in your free time?", "transcript": "In my free time at home, I usually watch Netflix. I like to watch drama and action movies. Sometimes I play mobile games on my phone. I also cook simple food like pasta or fried rice. I think cooking is good because it saves money. On Sunday I clean my room and do laundry.", "meta": {"combo": "I", "qtype": 2, "topicKind": "selected", "topic": "집"}, "feedback": None},
    {"idx": 3, "questionText": "Tell me about a memorable experience you had at home.", "transcript": "Last year I had a birthday party at my home. I invited five friends. We ate pizza and chicken. We played games and talked a lot. It was very fun. I remember we laughed a lot that night. It was a good memory for me.", "meta": {"combo": "I", "qtype": 3, "topicKind": "selected", "topic": "집"}, "feedback": None},
    {"idx": 4, "questionText": "Describe a park you often visit. What does it look like?", "transcript": "I sometimes go to Han River Park. It is a very big park near Han River. There are many people there on weekends. You can see the river and the bridge. There are also some trees and grass. I like to go there because it is relaxing. The air is fresh.", "meta": {"combo": "II", "qtype": 1, "topicKind": "selected", "topic": "공원"}, "feedback": None},
    {"idx": 5, "questionText": "What do you usually do when you go to the park?", "transcript": "When I go to the park I usually walk or jog. Sometimes I bring my earphones and listen to music while walking. I also take photos of the scenery. If the weather is nice I sit on the grass and read a book. Sometimes I eat convenience store food near the park. I enjoy it.", "meta": {"combo": "II", "qtype": 2, "topicKind": "selected", "topic": "공원"}, "feedback": None},
    {"idx": 6, "questionText": "Tell me about a memorable experience you had at a park.", "transcript": "One time I went to the park and I saw a music festival. Many people were there. There was a live band playing. I did not plan to go there but I enjoyed it. The music was good and the atmosphere was nice. I stayed for about two hours. It was a good surprise for me.", "meta": {"combo": "II", "qtype": 4, "topicKind": "selected", "topic": "공원"}, "feedback": None},
    {"idx": 7, "questionText": "Tell me about a time when you had a health problem.", "transcript": "About two years ago I got very sick. I had a high fever and I could not go to work. I went to the hospital and the doctor said I had flu. I stayed home for five days. My mother made me soup every day. I drank a lot of water and took medicine. After one week I was better.", "meta": {"combo": "III", "qtype": 1, "topicKind": "surprise", "topic": "건강"}, "feedback": None},
    {"idx": 8, "questionText": "How do you stay healthy?", "transcript": "To stay healthy I try to exercise three times a week. I usually jog in the morning for thirty minutes. I also try to eat vegetables and not eat too much fast food. I drink a lot of water every day. I try to sleep eight hours. But sometimes it is hard because I am busy with work.", "meta": {"combo": "III", "qtype": 2, "topicKind": "surprise", "topic": "건강"}, "feedback": None},
    {"idx": 9, "questionText": "What do you usually do when you get sick?", "transcript": "When I get sick I go to the pharmacy first. I buy medicine and rest at home. I drink warm water or tea. If I feel worse after two days then I go to the hospital. I also try to sleep more and eat light food like porridge. I think rest is the most important thing.", "meta": {"combo": "III", "qtype": 3, "topicKind": "surprise", "topic": "건강"}, "feedback": None},
    {"idx": 10, "questionText": "Call a bicycle rental shop and ask three or four questions about renting a bicycle.", "transcript": "Hello, I want to rent a bicycle. Can I ask some questions? First, how much is it per hour? And do you have different sizes? I need a medium size. Also, do I need to bring my ID? And what time do you close today? Thank you for the information.", "meta": {"combo": "IV", "qtype": 6, "topicKind": "roleplay", "topic": "자전거 대여"}, "feedback": None},
    {"idx": 11, "questionText": "The bicycle you rented has a flat tire. Explain the situation and suggest two or three solutions.", "transcript": "Hello, I rented a bicycle from your shop. But I have a problem. The tire is flat. I cannot ride it. Can you send someone to fix it? Or maybe I can come back and exchange it for another bicycle? If that is not possible, I think you should give me a refund. I am near the park entrance. Please help me.", "meta": {"combo": "IV", "qtype": 7, "topicKind": "roleplay", "topic": "자전거 대여"}, "feedback": None},
    {"idx": 12, "questionText": "Have you ever had a problem while renting something?", "transcript": "Yes, I had a problem before. I rented a car and when I returned it the company said there was a scratch. But I did not make that scratch. I told the staff that the scratch was already there before I rented. They checked their photos and found that I was right. So I did not pay extra. It was stressful but I am glad I was right.", "meta": {"combo": "IV", "qtype": 8, "topicKind": "roleplay", "topic": "자전거 대여"}, "feedback": None},
    {"idx": 13, "questionText": "How has the way you listen to music changed over the years?", "transcript": "Before I listened to music on CD player. Now I use Spotify on my phone. It is much more convenient. Before I had to buy CD and carry it. Now I can listen to millions of songs anytime. I think music quality also improved. Bluetooth earphones are better than before. The biggest change is that I can listen to music everywhere now.", "meta": {"combo": "V", "qtype": 9, "topicKind": "custom", "topic": "음악"}, "feedback": None},
    {"idx": 14, "questionText": "What are the biggest problems that the music industry faces today?", "transcript": "I think the biggest problem is that musicians do not make enough money from streaming. They get very small money per stream. So only popular artists can survive. Small artists have difficult time. Also I think people do not buy albums anymore. Everything is free or cheap subscription. Music is less valuable now I think.", "meta": {"combo": "V", "qtype": 10, "topicKind": "custom", "topic": "음악"}, "feedback": None}
  ]
}

OVERALL = {
  "grade": "IM2",
  "gradeRationale": "수험자는 익숙한 주제(집, 공원, 건강, 롤플레이)에서 기본적인 의사소통은 가능하나, '\"I like to\"', '\"It is very\"' 등 단순 구조가 반복되고 연결어 사용이 제한적입니다. 단락 수준의 담화를 유지하지 못하고 정보를 단편적으로 나열하는 IM2 패턴이 일관되게 나타납니다.",
  "overallSummary": "전반적으로 익숙한 상황에서 기본 의사소통은 가능한 수준입니다. 어휘 범위가 제한적이고 문장 구조가 단조로워 IM2 등급에 해당합니다. 롤플레이 섹션(Q11, Q12)에서 실용적인 언어 사용 능력은 보였으나, Combo V(T9/T10)의 비교·이슈 응답에서 논리적 전개 없이 단편 나열에 그쳐 IH 도달에는 미치지 못합니다.",
  "strengths": [
    "익숙한 주제에서 기본 어휘를 활용한 의사소통 가능 — \"convenient\", \"atmosphere\", \"subscription\" 등 일부 중급 어휘 사용",
    "롤플레이에서 문제 상황을 명확히 설명하고 3가지 해결책 제시 (Q12) — 실용적 담화 능력 확인",
    "Combo V(T10) 음악 이슈 답변에서 자신의 견해를 포함 — \"I think\" 활용해 의견 표현 시도"
  ],
  "improvements": [
    "단순 나열 구조 탈피 — 관계절(which, that) 활용으로 문장을 연결하고 정보 밀도 높이기",
    "연결어 다양화 — \"and\", \"also\" 외에 \"however\", \"in addition\", \"given that\" 적극 사용",
    "추상적 주제에서 논리 전개 강화 — T9/T10 답변 시 원인→결과→자신의 견해 구조로 단락 완성"
  ],
  "nextLevelAdvice": "IH 달성을 위해서는 단순 나열에서 벗어나 단락 수준의 담화를 구성해야 합니다. 각 주제에서 하나의 핵심 포인트를 정하고, '도입 문장 → 구체적 예시 2~3개 → 마무리 의견'으로 완결된 단락을 말하는 연습이 가장 효과적입니다. T9/T10 문항에서는 단순 대비를 넘어 변화의 원인과 영향을 논리적으로 연결하는 훈련이 필요합니다.",
  "perQuestion": [
    {"idx": 0,  "grade": "IM2", "oneLiner": "단순 열거 구조 — 관계절 없이 7문장이 독립적으로 나열됨"},
    {"idx": 1,  "grade": "IM2", "oneLiner": "\"There is\" 반복 5회 — 감각적 묘사 없이 구성 요소만 나열"},
    {"idx": 2,  "grade": "IM1", "oneLiner": "취미 나열 수준 — 심화 없이 \"I usually watch Netflix\"에 그침"},
    {"idx": 3,  "grade": "IM2", "oneLiner": "경험 전달은 되나 감정·교훈 표현 없이 사실 나열에 그침"},
    {"idx": 4,  "grade": "IM2", "oneLiner": "한강공원 묘사는 적절하나 개인적 감정 연결 부족"},
    {"idx": 5,  "grade": "IM3", "oneLiner": "다양한 활동 묘사 — 일부 구체적 상황 설명 시도"},
    {"idx": 6,  "grade": "IM2", "oneLiner": "돌발 경험 전달은 성공 — \"I did not plan\" 연결이 자연스러움"},
    {"idx": 7,  "grade": "IM2", "oneLiner": "사건의 순서는 명확하나 감정·회복 과정 묘사 부족"},
    {"idx": 8,  "grade": "IM3", "oneLiner": "건강 관리 루틴을 구체적으로 나열 — \"But sometimes\" 대조 표현 사용"},
    {"idx": 9,  "grade": "IM2", "oneLiner": "아플 때 행동 순서는 논리적이나 경험 기반 묘사 없음"},
    {"idx": 10, "grade": "IM2", "oneLiner": "4가지 질문은 적절하나 자연스럽지 않은 병렬 나열"},
    {"idx": 11, "grade": "IM3", "oneLiner": "문제 설명 명확 + 3가지 해결책 — 롤플레이 수행 양호"},
    {"idx": 12, "grade": "IM3", "oneLiner": "실제 경험 기반 서술 — 사건 전개와 결과 연결 자연스러움"},
    {"idx": 13, "grade": "IM2", "oneLiner": "CD→스트리밍 대비는 됐으나 원인·영향 전개 없음"},
    {"idx": 14, "grade": "IM2", "oneLiner": "이슈 파악은 했으나 \"I think\" 반복 — 논리 전개 없는 감상 나열"}
  ],
  "diagnostic": {
    "adv1": {
      "performance": "Developing Ability",
      "time_checks": ["future_desc", "future_narr", "past_narr"],
      "narr_problems": ["logical_seq", "verb_forms"],
      "desc_lacks": ["clarity", "detail"]
    },
    "adv2": {
      "performance": "Developing Ability",
      "discourse_level": "strings_sentences",
      "word_order": [],
      "cohesive": ["repetitive"]
    },
    "adv3": {
      "performance": "Developing Ability",
      "vocab_checks": ["lacks_breadth"]
    },
    "adv4": {
      "performance": "Developing Ability",
      "complication": "attempts_fails",
      "improve_checks": ["communicative_devices"]
    },
    "adv5": {
      "performance": "Developing Ability",
      "grammar_checks": ["agreement"],
      "pragmatic_checks": ["lacks_strategies"]
    },
    "int1": {"performance": "Meets Criteria Fully", "needs": []},
    "int2": {"performance": "Meets Criteria Fully", "needs": []},
    "int3": {"performance": "Meets Criteria Fully", "needs": []},
    "int4": {
      "performance": "Meets Criteria Fully",
      "fluency_checks": [],
      "grammar_checks": [],
      "syntax_checks": []
    }
  }
}

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await ctx.new_page()

        async def mock_overall(route):
            await route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"ok": True, "result": OVERALL}, ensure_ascii=False)
            )
        await page.route("**/overall-feedback", mock_overall)

        await page.goto("http://localhost:3000/pages/result.html", wait_until="domcontentloaded")
        await page.evaluate(
            f"localStorage.setItem('opic_session_result', JSON.stringify({json.dumps(SESSION, ensure_ascii=False)}))"
        )
        await page.reload(wait_until="networkidle")
        await page.wait_for_timeout(2000)

        try:
            await page.wait_for_selector(".grade-badge", timeout=8000)
        except Exception as e:
            print("grade-badge timeout:", e)

        await page.wait_for_timeout(800)

        # ── 1. 등급 카드 (상단) ──
        await page.screenshot(
            path="assets/images/screenshots/result-top.png",
            full_page=False,
            clip={"x": 0, "y": 0, "width": 1280, "height": 900}
        )
        print("result-top.png saved")

        # ── 2. Diagnostic Form (Advanced + Intermediate) ──
        diag = await page.query_selector(".diag-wrap")
        if diag:
            await diag.scroll_into_view_if_needed()
            await page.wait_for_timeout(400)
            # 전체 diag-wrap 요소 캡처
            box = await diag.bounding_box()
            if box:
                # 양쪽 padding 포함, 최대 900px 높이로 슬라이스
                clip_h = min(box["height"] + 40, 2200)
                await page.screenshot(
                    path="assets/images/screenshots/result-diagnostic.png",
                    full_page=False,
                    clip={"x": max(box["x"] - 20, 0), "y": max(box["y"] - 10, 0),
                          "width": min(box["width"] + 40, 1280), "height": clip_h}
                )
                print("result-diagnostic.png saved")
        else:
            print("diag-wrap not found")

        # ── 3. Q1 피드백 아코디언 열기 + 캡처 ──
        await page.evaluate("""
            var body = document.querySelector('.q-item:first-child .q-body');
            if (body) { body.classList.add('open'); body.style.display = 'block'; }
        """)
        await page.wait_for_timeout(400)
        fb = await page.query_selector(".q-item:first-child .q-feedback")
        if fb:
            await fb.scroll_into_view_if_needed()
        await page.wait_for_timeout(300)
        await page.screenshot(
            path="assets/images/screenshots/result-feedback.png",
            full_page=False,
            clip={"x": 0, "y": 0, "width": 1280, "height": 900}
        )
        print("result-feedback.png saved")

        await browser.close()

asyncio.run(main())
