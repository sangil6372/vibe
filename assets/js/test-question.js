$(function() {
    var e, t, i, n, o, p, s, r = 0, // timesQuestionPlayed
        c = null, // replayTimeout
        l = null, // nextButtonTimeout
        a = 0, // currentItem index
        d = $("#recordingStatus"),
        u = $("#uploading-alert"),
        g = $("#responseTimer"),
        m = $("#replay-instructions"),
        f = $("#sample-question-instructions"),
        S = $("#recording-instructions"),
        O = $("#replayButton"),
        h = $("#playButton"),
        A = $("#btnNext"),
        v = !1, // isReplaying
        w = !1, // timeExpired
        y = !1, // isNextClicked
        I = $("#playback .track"),
        T = !1; // isQuestionPlaying

    function b() {
        ltiOpicAppSettings.playButtonClicked = !1;
        $("#playButton").show();
        $("#playButton").removeClass("btn-disabled");
        $("#playButton").prop("disabled", !1);
        P(1);
    }

    function M() {
        O.hide();
        $("#playButton").show();
    }

    function x() {
        clearTimeout(ltiOpicAppSettings.showMicAccessTimeout);
        ltiOpicAppSettings.showMicAccessTimeout = null;
        $("#testArea").hide();
        $("#micAccessMessage").hide();
        A.hide();
        Date.now() - ltiOpicAppSettings.lastMicAccessRequest < 400 ? $("#accessBlockedMessage").show() : $("#accessDeniedMessage").show();
    }

    function L() {
        clearTimeout(ltiOpicAppSettings.showMicAccessTimeout);
        ltiOpicAppSettings.showMicAccessTimeout = null;
        $("#testArea").hide();
        $("#micAccessMessage").hide();
        $("#noMicMessage").show();
        A.hide();
    }

    function R(callback) {
        var duration = 0,
            n = t.playlist().length - 1,
            count = 0;
        t.on("loadedmetadata", function() {
            duration += t.duration();
            0 == count && (ltiOpicAppSettings.firstVideoDuration = duration);
            ++count < n ? t.playlist.currentItem(count) : (t.off("loadedmetadata"), t.playlist.currentItem(0), ltiOpicAppSettings.totalVideoDuration = duration, callback());
        });
    }

    function k() {
        t.on("timeupdate", C);
    }

    function C() {
        var current;
        if (0 == t.playlist.currentItem() || "iOS" == ltiOpicAppSettings.deviceInfo.os && "Safari" == ltiOpicAppSettings.deviceInfo.browser) {
            current = t.currentTime();
        } else {
            current = (ltiOpicAppSettings.firstVideoDuration || 0) + t.currentTime();
        }
        
        var percent;
        var total = ltiOpicAppSettings.totalVideoDuration || t.duration() || 1;
        percent = (current / total) * 100;
        
        percent > 100 && (percent = 100);
        I.css("width", percent + "%");
    }

    function Q() {
        t.off("timeupdate", C);
        I.css("width", "0%");
    }

    function B() {
        // Fix for playlist API
        if (typeof t.playlist.currentItem === 'function') {
            t.playlist.currentItem(a);
        } else {
            t.playlist(a);
        }
        k();
        t.play();
        P(2);
    }

    function P(status) {
        $(".block-video-control span").hide();
        status && $(".prompt-status-" + status).show();
    }

    function q() {
        ltiOpic.confirmMicAccess({
            onSuccess: function() {
                // Remove disable class to allow animation to show
                $(".block-mic-gauge").removeClass("disable");
                
                // Bypass enableSensor in demo mode as the target element is missing and causing errors
                if (!ltiOpic.demo()) {
                    ltiOpic.audioInputDevice.enableSensor("#" + ltiOpicAppSettings.responseId + " .lrn_audiomiclevelmask");
                }
                $(".response-time").width("0%");
                if (e && e.recording) e.recording.start();
                f.hide();
                m.hide();
                S.hide();
            },
            onFailure: function() {
                console.log("Mic access failed");
            }
        });
    }

    function H() {
        t.pause();
        var playlist = [];
        // Question Audio (MP3)
        playlist.push({
            sources: [{ type: "audio/mpeg", src: ltiOpicAppSettings.questionVideo }],
            poster: ltiOpicAppSettings.standByPortrait
        });
        t.playlist(playlist);
        t.playlist.autoadvance(0);
        n = playlist.length;
        o = n - 1; // Last item index
        a = 0; // Question audio index
    }

    function N() {
        $("#questionHeader").html(ltiOpicAppSettings.questionHeaderText.replace("(currentnumber)", ltiOpicAppSettings.currentQuestionIndex).replace("(totalnumber)", ltiOpicAppSettings.finalQuestionIndex));
    }

    function U() {
        e = p.question(ltiOpicAppSettings.responseId);
        s = new AudioRecordTimer($("#response-time-progress-bar"), $("#response-time-remaining-time"), ltiOpicAppSettings.responseTimer, function() {
            w = !0;
            if (e && e.recording) e.recording.stop();
            if (1 == ltiOpicAppSettings.savePrompt) {
                A.prop("disabled", !0);
            }
            g.hide();
        });
        s.updateTimer();

        e.on("recording:started", function() {
            s.start();
            P(3);
            l = setTimeout(function() {
                A.removeAttr("disabled");
            }, ltiOpicAppSettings.nextTimer);
        });

        e.on("recording:stopped", function() {
            T = !1;
            var error = ltiOpic.audioInputDevice.error();
            if (v) {
                v = !1;
            } else {
                var timeSpent = 0;
                var serverUrl = "";
                var response = e.getResponse();
                if (null != response) {
                    timeSpent = Math.round(response.length / 1000);
                    serverUrl = ltiOpicAppSettings.responseUrl + response.location + ".mp3";
                }
                
                if (y && !error) {
                    Y();
                } else {
                    P(4);
                    A.prop("disabled", !1);
                }
            }
        });
        P(1);
    }

    function Y() {
        if (ltiOpicAppSettings.savePrompt) {
            ltiOpic.audioInputDevice.disableSensor();
            d.hide();
            u.show();
            setTimeout(function() {
                V(e.timeSpent, e.serverUrl);
            }, 1000);
        } else {
            j();
        }
    }

    function V(timeSpent, serverUrl) {
        var responses = JSON.parse(localStorage.getItem('testResponses') || '[]');
        responses.push({
            ltrId: ltiOpicAppSettings.ltrId,
            timeSpent: timeSpent,
            timesQuestionPlayed: r + 1,
            serverUrl: serverUrl,
            nextLTRId: ltiOpicAppSettings.nextLTRId
        });
        localStorage.setItem('testResponses', JSON.stringify(responses));
        u.hide();
        j();
    }

    function j() {
        if (ltiOpicAppSettings.currentQuestionIndex >= ltiOpicAppSettings.prompts.length) {
            window.onbeforeunload = null;
            P(4);
            setTimeout(function() { $('#btnFinalSubmit').fadeIn(300); }, 800);
            return;
        }

        var nextIndex = ltiOpicAppSettings.currentQuestionIndex + 1;
        var nextItem = ltiOpicAppSettings.prompts[nextIndex - 1];

        ltiOpicAppSettings.currentQuestionIndex = nextIndex;
        ltiOpicAppSettings.responseId = nextItem.learnosityId;
        ltiOpicAppSettings.response_id = nextItem.learnosityId;
        ltiOpicAppSettings.questionVideo = nextItem.Mediafile;
        ltiOpicAppSettings.responseTimer = nextItem.TimeForQuestion || 120;
        
        r = 0;
        w = !1;
        y = !1;
        v = !1;

        // 연습 모드: 경과 타이머 리셋 + 문제 정보 갱신
        if (practiceMode) {
            stopElapsed();
            elapsedSec = 0;
            $('#elapsedTime').text('0:00');
            updatePracticeInfo();
        }

        // 이전 문항 UI 리셋
        O.hide();
        if (c) { clearTimeout(c); c = null; }
        if (l) { clearTimeout(l); l = null; }
        g.hide().data("recording", false);
        $(".block-mic-gauge").addClass("disable");
        $("#moveOnHeader").hide();
        $("#volumeLowContent").hide();
        $("#volumeHighContent").hide();
        if (s) s.stop();
        P(5);

        // 다음 문항 타이머 재생성
        s = new AudioRecordTimer(
            $("#response-time-progress-bar"),
            $("#response-time-remaining-time"),
            ltiOpicAppSettings.responseTimer,
            function() {
                if (e && e.recording && "inactive" != e.recording.state) {
                    e.recording.stop();
                }
                P(4);
                g.hide();
                w = !0;
            }
        );
        s.updateTimer();

        // 새 문항 녹음기 연결
        e = p.question(ltiOpicAppSettings.responseId);
        bindRecorder(e);

        P(1);
        H();
        N();

        var active = $("li.active"), next = active.next();
        active.removeClass("active").addClass("visited");
        next.addClass("active");

        b();
        A.prop("disabled", !0);
    }

    function bindRecorder(q) {
        $(q).off("recording:started recording:stopped");
        $(q).on("recording:started", function() {
            s.start();
            g.data("recording", true);
            if (timerVisible) g.show();
            P(3);
            l = setTimeout(function() {
                A.removeAttr("disabled");
            }, ltiOpicAppSettings.nextTimer);
        });
        $(q).on("recording:stopped", function() {
            T = !1;
            var error = ltiOpic.audioInputDevice.error();
            if (v) {
                v = !1;
            } else {
                var timeSpent = Math.round(q.recordDuration || 0);
                q.timeSpent = timeSpent;
                q.serverUrl = "";
                $("#moveOnHeader").hide();
                $("#volumeLowContent").hide();
                $("#volumeHighContent").hide();
                if (!ltiOpicAppSettings.sampleQuestion) {
                    try {
                        var aq = q.response.audioQualityCheck();
                        if (aq && aq.detail) {
                            if (aq.detail.numberOfClippingSamples > 40) {
                                $("#volumeHighContent").show();
                            } else if (aq.detail.maxRmsEnergy < 0.05) {
                                $("#volumeLowContent").show();
                            }
                        }
                    } catch(ex) {}
                    if (!y) $("#moveOnHeader").show();
                }
                P(4);
                if (y && !error) Y();
            }
        });
    }

    function ee() {
        e = p.question(ltiOpicAppSettings.responseId);
        s = new AudioRecordTimer($("#response-time-progress-bar"), $("#response-time-remaining-time"), ltiOpicAppSettings.responseTimer, function() {
            if (e && e.recording && "inactive" != e.recording.state) {
                e.recording.stop();
                P(4);
                g.hide();
                w = !0;
            }
        });
        s.updateTimer();
        bindRecorder(e);
    }

    // Event Handlers
    h.on("click", function() {
        ltiOpicAppSettings.playButtonClicked = !0;
        $(this).addClass("btn-disabled").prop("disabled", !0);
        f.hide(), m.show(), S.show();
        T = !0;
        if (practiceMode) startElapsed();
        B();
    });

    O.on("click", function() {
        if (c) {
            clearTimeout(c);
            c = null;
        }
        $(this).hide();
        r++;
        v = !0;
        
        if (e && e.recording && e.recording.state !== "inactive") {
            e.recording.stop();
        }
        if (s) s.stop();
        
        B();
    });

    // ── 연습 모드 (경과 타이머 + 문제 정보 패널) ──────────────────────────
    var practiceMode   = false;
    var elapsedSec     = 0;
    var elapsedTimer   = null;
    var timerVisible   = false; // 녹음 타이머 표시 여부 (practiceMode 연동)

    var KIND_LABEL = {
        intro:    '자기소개',
        selected: '선택주제',
        surprise: '돌발주제',
        roleplay: '롤플레이'
    };

    function fmtTime(sec) {
        var m = Math.floor(sec / 60), s = sec % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function startElapsed() {
        clearInterval(elapsedTimer);
        elapsedSec = 0;
        $('#elapsedTime').text('0:00');
        elapsedTimer = setInterval(function() {
            elapsedSec++;
            $('#elapsedTime').text(fmtTime(elapsedSec));
        }, 1000);
    }

    function stopElapsed() {
        clearInterval(elapsedTimer);
        elapsedTimer = null;
    }

    function updatePracticeInfo() {
        var idx    = ltiOpicAppSettings.currentQuestionIndex - 1;
        var prompt = ltiOpicAppSettings.prompts[idx];
        var meta   = prompt && prompt.meta;
        if (!meta) return;
        var typeLabels = (window.OPIcSessionBuilder && OPIcSessionBuilder.TYPE_DESC) || {};
        $('#qComboLabel').text('Combo ' + meta.combo);
        $('#qTypeLabel').text('유형' + meta.qtype);
        $('#qKindLabel').text(KIND_LABEL[meta.topicKind] || meta.topicKind);
        $('#qTopicName').text(meta.topic);
        $('#qTypeDesc').text(typeLabels[meta.qtype] || '');
        $('#qTextDisplay').text(meta.text || '');
    }

    $('#toggleTimer').on('click', function() {
        practiceMode = !practiceMode;
        timerVisible  = practiceMode;
        $(this).text(practiceMode ? '📖 연습 OFF' : '📖 연습 ON');
        if (practiceMode) {
            updatePracticeInfo();
            elapsedSec = 0;
            $('#elapsedTime').text('0:00');
            if (g.data('recording')) g.show();
            $('#practicePanel').show();
        } else {
            stopElapsed();
            g.hide();
            $('#practicePanel').hide();
        }
    });

    A.off("click");
    A.on("click", function() {
        if (y) return;
        y = !0;
        $(this).prop("disabled", !0);
        
        if (w) {
            Y();
        } else {
            if (e && e.recording && e.recording.state !== "inactive") {
                e.recording.stop();
            }
            if (s) s.stop();
        }
    });

    function onAudioEnded() {
        var current = t.playlist.currentItem();
        if (current === 0) { // Question finished
            Q();
            if (0 == r) { // First play
                h.hide();
                O.show();
                c = setTimeout(function() {
                    O.hide();
                    c = null;
                }, 5000);
                q();
            } else { // Replay play
                O.hide();
                q();
                f.hide(), m.hide(), S.hide();
            }
        }
    }

    t = videojs("opic-video", {
        controls: !1,
        autoplay: !1,
        preload: "auto",
        bigPlayButton: !1,
        loadingSpinner: !1,
        html5: { hls: { overrideNative: !0 } }
    });

    t.on("ended", onAudioEnded);
    t.removeChild("ControlBar");

    t.ready(function() {
        H();
        N();
        
        if ("iOS" != ltiOpicAppSettings.deviceInfo.os || "Safari" != ltiOpicAppSettings.deviceInfo.browser) {
            R(function() { b(); });
        } else {
            b();
        }
    });
    
    var recorderConfig = {
        readyListener: function() {
            "1" == ltiOpicAppSettings.recordingApi ? ee() : U();
        },
        errorListener: function(err) {
            console.error("Recorder Error:", err);
        },
        prevent_flash: !0
    };
    
    if ("1" == ltiOpicAppSettings.recordingApi) {
        p = LTIMediaRecorderApp.init(ltiOpicAppSettings.ltiSignedRequest, recorderConfig);
    } else {
        p = LearnosityApp.init(ltiOpicAppSettings.learnositySignedRequest, recorderConfig);
    }

    // jQuery 3.x에서 $(obj).trigger("ready")가 obj.ready()를 직접 호출하지 않으므로
    // 명시적으로 "ready" 이벤트 핸들러를 바인딩해 readyListener가 실행되도록 보장
    $(p).on("ready", function() {
        "1" == ltiOpicAppSettings.recordingApi ? ee() : U();
    });

    navigator.mediaDevices.getUserMedia({ audio: !0, video: !1 }).then(function(stream) {
        ltiOpic.setAudioInputDevice(stream.getAudioTracks()[0].label);
        $("#testArea").show();
        $("#micAccessMessage").hide();
    }).catch(function(err) {
        console.error("Mic Access Denied:", err);
        L();
    });

    // ═══════════════════════════════════════════════════════════
    //  녹음 저장 + 즉시 피드백
    // ═══════════════════════════════════════════════════════════
    var _recs    = [];
    var _sr      = null;
    var _srText  = '';
    var _recIdx  = -1;  // 녹음 시작 시점에 캡처한 인덱스

    // ── Speech Recognition ──────────────────────────────────
    function _startSR() {
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        if (_sr) { try { _sr.stop(); } catch(e) {} }
        _sr = new SR();
        _sr.lang = 'en-US';
        _sr.continuous = true;
        _sr.interimResults = true;
        _srText = '';
        _sr.onresult = function(ev) {
            var t = '';
            for (var i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript + ' ';
            _srText = t.trim();
        };
        _sr.onerror = function() {};
        try { _sr.start(); } catch(e) {}
    }

    function _stopSR() {
        if (_sr) { try { _sr.stop(); } catch(e) {} _sr = null; }
    }

    // ── bindRecorder 래핑 ────────────────────────────────────
    // 핵심: recording:started 시점에 인덱스 캡처 → stopped 시점에 사용
    // (stopped 이후 j()가 currentQuestionIndex를 증가시키므로 started 때 캡처해야 함)
    var _origBind = bindRecorder;
    bindRecorder = function(q) {
        _origBind(q);
        // _origBind 내부에서 $(q).off()로 기존 핸들러 제거 후 재등록하므로
        // 반드시 _origBind 호출 이후에 추가해야 함
        $(q).on('recording:started.fb', function() {
            _recIdx = (ltiOpicAppSettings.currentQuestionIndex || 1) - 1;
            _startSR();
            $('#btnFeedback').prop('disabled', false);  // 녹음 시작되면 즉시 활성화
        });
        $(q).on('recording:stopped.fb', function() {
            var capturedIdx = _recIdx;
            setTimeout(function() {
                var url = q.recording && q.recording.audio_file;
                if (!url) return;
                _stopSR();
                var savedText = _srText;
                _srText = '';
                var prompt = (ltiOpicAppSettings.prompts || [])[capturedIdx];
                _recs[capturedIdx] = {
                    url:   url,
                    text:  savedText,
                    qText: prompt && prompt.meta && prompt.meta.text || '',
                    meta:  prompt && prompt.meta || {}
                };
                _updateFeedbackBtn();

                // 피드백 버튼으로 녹음을 종료한 경우 패널 자동 오픈
                if (window._openFeedbackAfterStop) {
                    window._openFeedbackAfterStop = false;
                    _openFeedback(_recs[capturedIdx]);
                }
            }, 150);
        });
    };

    function _updateFeedbackBtn() {
        var idx = (ltiOpicAppSettings.currentQuestionIndex || 1) - 1;
        // 현재 문항이 녹음 중이거나 이미 녹음된 경우 활성화
        var recording = e && e.recording && e.recording.state === 'recording';
        var hasRec = _recs[idx] && _recs[idx].url;
        $('#btnFeedback').prop('disabled', !recording && !hasRec);
    }

    // 500ms 폴링으로 버튼 상태 동기화
    setInterval(_updateFeedbackBtn, 500);

    // ── 피드백 버튼 ──────────────────────────────────────────
    // 녹음 중이면 → 녹음 종료 + 피드백 오픈
    // 녹음 끝난 후면 → 바로 피드백 오픈
    $('#btnFeedback').on('click', function() {
        var idx = (ltiOpicAppSettings.currentQuestionIndex || 1) - 1;

        // 이미 저장된 녹음이 있으면 바로 열기
        if (_recs[idx] && _recs[idx].url) {
            _openFeedback(_recs[idx]);
            return;
        }

        // 녹음 중이면 종료시키고, stopped 이벤트에서 피드백 패널 오픈
        if (e && e.recording && e.recording.state !== 'inactive') {
            window._openFeedbackAfterStop = true;
            e.recording.stop();
            if (s) s.stop();
        }
    });

    $('#btnCloseFeedback').on('click', function() {
        $('#feedbackPanel').fadeOut(200);
        if (window._fbAudio) { window._fbAudio.pause(); window._fbAudio = null; }
    });

    $('#btnReplayAnswer').on('click', function() {
        var idx = ltiOpicAppSettings.currentQuestionIndex - 1;
        var rec = _recs[idx];
        if (!rec || !rec.url) return;
        if (window._fbAudio) window._fbAudio.pause();
        window._fbAudio = new Audio(rec.url);
        window._fbAudio.play().catch(function() {});
    });

    function _openFeedback(rec) {
        var meta = rec.meta || {};
        $('#fbTopicName').text((meta.topic || '') + (meta.combo ? '  ·  Combo ' + meta.combo : ''));
        $('#fbQText').text(rec.qText || '(질문 텍스트 없음)');
        $('#fbTranscript').text(rec.text || '');
        $('#fbTranscriptArea').toggle(!!rec.text);
        $('#fbAiText').html('<div class="fb-loading">⏳ AI 피드백 생성 중...</div>');
        $('#feedbackPanel').fadeIn(200);

        if (rec.url) {
            window._fbAudio = new Audio(rec.url);
            window._fbAudio.play().catch(function() {});
        }

        _fetchFeedback(rec.qText, rec.text);
    }

    function _fetchFeedback(qText, userText) {
        fetch('http://127.0.0.1:8765/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionText: qText, transcript: userText })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.ok) {
                var html = d.feedback
                    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
                    .replace(/\n/g,'<br>');
                $('#fbAiText').html('<div class="fb-result">' + html + '</div>');
                // 결과 페이지를 위해 피드백 저장
                var curIdx = (ltiOpicAppSettings.currentQuestionIndex || 1) - 1;
                if (_recs[curIdx]) _recs[curIdx].feedback = d.feedback;
            } else {
                $('#fbAiText').html('<div class="fb-error">❌ ' + (d.error || '피드백 생성 실패') + '</div>');
            }
        })
        .catch(function() {
            $('#fbAiText').html('<div class="fb-error">❌ TTS 서버 연결 실패 — 서버가 실행 중인지 확인하세요</div>');
        });
    }

    // ── 최종 제출 ─────────────────────────────────────────────
    $('#btnFinalSubmit').on('click', function() {
        var $btn = $(this);
        $btn.prop('disabled', true).html('💾 저장 중...');
        _saveAllRecs().then(function(d) {
            $btn.html('✅ 저장 완료!');
            setTimeout(function() { window.location.href = ltiOpicAppSettings.nextPage; }, 1200);
        }).catch(function(err) {
            $btn.prop('disabled', false).html('💾 최종 제출');
            alert('저장 실패: ' + (err.message || err));
        });
    });

    function _saveAllRecs() {
        var form = new FormData();
        var meta = [];
        var fetches = [];

        for (var i = 0; i < _recs.length; i++) {
            (function(idx) {
                var rec = _recs[idx];
                if (!rec || !rec.url) return;
                fetches.push(
                    fetch(rec.url).then(function(r) { return r.blob(); }).then(function(blob) {
                        form.append('rec_' + idx, blob, 'Q' + (idx + 1) + '.webm');
                        meta.push({ idx: idx, transcript: rec.text, qText: rec.qText, meta: rec.meta });
                    })
                );
            })(i);
        }

        return Promise.all(fetches).then(function() {
            form.append('meta', JSON.stringify(meta));
            return fetch('http://127.0.0.1:8765/save-recordings', { method: 'POST', body: form });
        }).then(function(r) { return r.json(); }).then(function(d) {
            if (!d.ok) throw new Error(d.error || '저장 실패');
            // 결과 페이지용 세션 데이터 localStorage 저장
            var sessionData = {
                timestamp: new Date().toISOString(),
                sessionId: d.session || '',
                questions: _recs.map(function(rec, idx) {
                    if (!rec) return null;
                    return {
                        idx:          idx,
                        questionText: rec.qText  || '',
                        transcript:   rec.text   || '',
                        feedback:     rec.feedback || '',
                        meta:         rec.meta   || {}
                    };
                }).filter(Boolean)
            };
            localStorage.setItem('opic_session_result', JSON.stringify(sessionData));
            return d;
        });
    }

});
