(function(global) {
  'use strict';

  var TYPE_DESC = {
    0:  '자기소개',
    1:  '유형1 — 현재시제로 장소/종류 묘사',
    2:  '유형2 — 현재시제로 활동/루틴/단계 묘사',
    3:  '유형3 — 최초 혹은 최근 경험 설명',
    4:  '유형4 — 인상적인 경험 설명',
    5:  '유형5 — 상대방에게 간단한 질문',
    6:  '유형6 — 정보 요청 (롤플레이)',
    7:  '유형7 — 문제상황 설명 + 대안 제시 (롤플레이)',
    8:  '유형8 — 비슷한 문제상황 해결 경험 설명',
    9:  '유형9 — 과거/현재 비교 또는 대조',
    10: '유형10 — 사회적 이슈/관심사 설명'
  };

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function encodePath(relPath) {
    return relPath.split('/').map(encodeURIComponent).join('/');
  }

  // 파일 1개 선택 → { rel: 인코딩된경로, text: 전사텍스트 }
  // transcripts: { "원본경로": "영문텍스트", ... }
  function pickFileFull(topic, typeNum, transcripts) {
    var list = topic.q[String(typeNum)];
    if (!list || !list.length) return null;
    var original = pick(list);
    return {
      rel:  encodePath(original),
      text: (transcripts && transcripts[original]) || ''
    };
  }

  function hasTypes(topic, types) {
    return types.every(function(t) {
      var k = String(t);
      return topic.q[k] && topic.q[k].length > 0;
    });
  }

  function getTopicKind(topicName, data) {
    if (data.selected.some(function(t) { return t.name === topicName; })) return 'selected';
    if (data.surprise.some(function(t)  { return t.name === topicName; })) return 'surprise';
    return 'roleplay';
  }

  function buildSession(data) {
    var base        = data.base || '../questions/original/';
    var transcripts = data.transcripts || {};
    var items       = [];

    function addItem(fileInfo, meta) {
      if (!fileInfo) return;
      meta.text = fileInfo.text;
      items.push({ rel: fileInfo.rel, meta: meta });
    }

    // Q1: 자기소개
    addItem(
      pickFileFull(data.intro, 1, transcripts),
      { combo: '자기소개', qtype: 0, topic: '자기소개', topicKind: 'intro' }
    );

    // 콘텐츠 콤보 후보 (T1, T2, T3 필수)
    var selPool = data.selected.filter(function(t) { return hasTypes(t, [1, 2, 3]); });
    var surPool = data.surprise.filter(function(t)  { return hasTypes(t, [1, 2, 3]); });
    var sel = shuffle(selPool);
    var contentTopics = shuffle([sel[0], sel[1], pick(surPool)]);

    // Combo I (Q2-Q4): T1, T2, T3
    var topicI = contentTopics[0], kindI = getTopicKind(topicI.name, data);
    [1, 2, 3].forEach(function(t) {
      addItem(
        pickFileFull(topicI, t, transcripts),
        { combo: 'I', qtype: t, topic: topicI.name, topicKind: kindI }
      );
    });

    // Combo II (Q5-Q7) + Combo III (Q8-Q10): T1, T3, T4(없으면 T3 재사용)
    [contentTopics[1], contentTopics[2]].forEach(function(topic, ci) {
      var comboName = ci === 0 ? 'II' : 'III';
      var kind = getTopicKind(topic.name, data);
      [1, 3, 4].forEach(function(t) {
        var fi = pickFileFull(topic, t, transcripts);
        var actualType = t;
        if (!fi && t === 4) { fi = pickFileFull(topic, 3, transcripts); actualType = 3; }
        addItem(fi, { combo: comboName, qtype: actualType, topic: topic.name, topicKind: kind });
      });
    });

    // Combo IV (Q11-T6, Q12-T7, Q13-T8/T4): 콘텐츠 콤보와 별도 주제
    var usedNames = contentTopics.map(function(t) { return t.name; });
    var rpPool = data.selected
      .filter(function(t) { return hasTypes(t, [6, 7]) && usedNames.indexOf(t.name) === -1; })
      .concat(data.surprise.filter(function(t) { return hasTypes(t, [6, 7]); }))
      .concat(data.roleplayOnly || []);
    var rpTopic = pick(rpPool);
    var rpKind  = getTopicKind(rpTopic.name, data);

    addItem(pickFileFull(rpTopic, 6, transcripts), { combo: 'IV', qtype: 6, topic: rpTopic.name, topicKind: rpKind });
    addItem(pickFileFull(rpTopic, 7, transcripts), { combo: 'IV', qtype: 7, topic: rpTopic.name, topicKind: rpKind });
    var q13fi = pickFileFull(rpTopic, 8, transcripts), q13type = 8;
    if (!q13fi) { q13fi = pickFileFull(rpTopic, 4, transcripts); q13type = 4; }
    if (q13fi)  addItem(q13fi, { combo: 'IV', qtype: q13type, topic: rpTopic.name, topicKind: rpKind });

    // Combo V (Q14-T9, Q15-T10): custom 섹션 우선, 없으면 original 체크
    var customBase   = data.customBase || '../questions/';
    var customTopics = data.custom || [];

    // custom 섹션용 pickFileFull (customBase 사용)
    function pickFileFullCustom(topic, typeNum) {
      var list = topic.q[String(typeNum)];
      if (!list || !list.length) return null;
      var original = pick(list);
      return {
        rel:  encodePath(original),
        base: customBase,
        text: (transcripts && transcripts[original]) || ''
      };
    }

    var v9Pool  = customTopics.filter(function(t) { return hasTypes(t, [9]); });
    var v10Pool = customTopics.filter(function(t) { return hasTypes(t, [10]); });

    // custom에 없으면 selected/surprise 에서도 체크 (original 에 T9/T10 있는 경우)
    if (!v9Pool.length) {
      v9Pool = data.selected.concat(data.surprise).filter(function(t) { return hasTypes(t, [9]); });
    }
    if (!v10Pool.length) {
      v10Pool = data.selected.concat(data.surprise).filter(function(t) { return hasTypes(t, [10]); });
    }

    if (v9Pool.length) {
      var t9 = pick(v9Pool);
      var isCustomT9 = customTopics.indexOf(t9) >= 0;
      var fi9 = isCustomT9 ? pickFileFullCustom(t9, 9) : pickFileFull(t9, 9, transcripts);
      var meta9 = { combo: 'V', qtype: 9, topic: t9.name, topicKind: isCustomT9 ? (t9.topicKind || 'custom') : getTopicKind(t9.name, data) };
      if (fi9) { meta9.text = fi9.text; items.push({ rel: fi9.rel, meta: meta9, base: fi9.base || null }); }
    }
    if (v10Pool.length) {
      var t10 = pick(v10Pool);
      var isCustomT10 = customTopics.indexOf(t10) >= 0;
      var fi10 = isCustomT10 ? pickFileFullCustom(t10, 10) : pickFileFull(t10, 10, transcripts);
      var meta10 = { combo: 'V', qtype: 10, topic: t10.name, topicKind: isCustomT10 ? (t10.topicKind || 'custom') : getTopicKind(t10.name, data) };
      if (fi10) { meta10.text = fi10.text; items.push({ rel: fi10.rel, meta: meta10, base: fi10.base || null }); }
    }

    return items.map(function(item, i) {
      var n = i + 1;
      var itemBase = item.base || base;
      return {
        responseNo:   String(n),
        LTRId:        'DEMO-' + n,
        learnosityId: 'demo-' + n,
        response_id:  'demo-' + n,
        Mediafile:    itemBase + item.rel,
        meta:         item.meta
      };
    });
  }

  global.OPIcSessionBuilder = { buildSession: buildSession, TYPE_DESC: TYPE_DESC };
})(window);
