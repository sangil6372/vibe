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
            current = ltiOpicAppSettings.firstVideoDuration + t.currentTime();
        }
        
        var percent;
        if ("iOS" == ltiOpicAppSettings.deviceInfo.os && "Safari" == ltiOpicAppSettings.deviceInfo.browser) {
            percent = current / t.duration() * 100;
        } else {
            percent = current / ltiOpicAppSettings.totalVideoDuration * 100;
        }
        
        percent > 100 && (percent = 100);
        I.css("width", percent + "%");
    }

    function Q() {
        t.off("timeupdate", C);
        I.css("width", "0%");
    }

    function B() {
        t.playlist.currentItem(a);
        k();
        t.play();
        P(2);
    }

    function D() {
        t.playlist.currentItem(o);
        t.play();
    }

    function P(status) {
        $(".block-video-control span").hide();
        status && $(".prompt-status-" + status).show();
    }

    function q() {
        // Start Recording automatically when audio finishes
        ltiOpic.confirmMicAccess({
            onSuccess: function() {
                ltiOpic.audioInputDevice.enableSensor("#" + ltiOpicAppSettings.responseId + " .lrn_audiomiclevelmask");
                d.show();
                $(".response-time").width("0%");
                e.recording.start(); // This starts the recorder
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
        if (null != ltiOpicAppSettings.introVideo && ltiOpicAppSettings.introVideo != LTIApiUrl + "/video") {
            playlist.push({
                sources: [{ type: "application/x-mpegURL", src: ltiOpicAppSettings.introVideo }],
                poster: ltiOpicAppSettings.standByPortrait
            });
        }
        playlist.push({
            sources: [{ type: "application/x-mpegURL", src: ltiOpicAppSettings.questionVideo }],
            poster: ltiOpicAppSettings.standByPortrait
        });
        playlist.push({
            sources: [{ type: "application/x-mpegURL", src: ltiOpicAppSettings.noddingVideo }],
            poster: ltiOpicAppSettings.standByPortrait
        });
        t.playlist(playlist);
        t.playlist.autoadvance(0);
        n = playlist.length;
        o = n - 1;
    }

    function N() {
        $("#questionHeader").html(ltiOpicAppSettings.questionHeaderText.replace("(currentnumber)", ltiOpicAppSettings.currentQuestionIndex).replace("(totalnumber)", ltiOpicAppSettings.finalQuestionIndex));
    }

    function U() {
        e = p.question(ltiOpicAppSettings.responseId);
        s = new AudioRecordTimer($("#response-time-progress-bar"), $("#response-time-remaining-time"), ltiOpicAppSettings.responseTimer, function() {
            w = !0; // time expired
            e.recording.stop();
            if (1 == ltiOpicAppSettings.savePrompt) {
                A.prop("disabled", !0);
            }
            g.hide();
        });
        s.updateTimer();

        e.on("recording:started", function() {
            s.start();
            P(3);
            
            // Replay window logic: only show replay button for 5 seconds after question finishes
            // But wait, the recording starts *after* audio finishes.
            // Actually, in original code, recording started via q() which was called in 'ended' event.
        });

        e.on("recording:stopped", function() {
            T = !1;
            var error = ltiOpic.audioInputDevice.error();
            if (v) {
                // Was replaying, don't proceed to next yet
                v = !1;
            } else {
                var timeSpent = 0;
                var serverUrl = "";
                var response = e.getResponse();
                if (null != response) {
                    timeSpent = Math.round(response.length / 1000);
                    serverUrl = ltiOpicAppSettings.responseUrl + response.location + ".mp3";
                }
                
                // Volume check logic (omitted for brevity but kept in original)
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
            // Mocking save
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
            timesQuestionPlayed: r,
            serverUrl: serverUrl,
            nextLTRId: ltiOpicAppSettings.nextLTRId
        });
        localStorage.setItem('testResponses', JSON.stringify(responses));
        u.hide();
        j();
    }

    function j() {
        if (0 == ltiOpicAppSettings.savePrompt || ltiOpicAppSettings.lastPrompt) {
            window.onbeforeunload = null;
            window.location.href = ltiOpicAppSettings.nextPage;
        } else {
            // Load next question logic
            var nextIndex = ltiOpicAppSettings.currentQuestionIndex + 1;
            // ... (rest of j() logic from original, omitted for brevity but should be preserved)
            location.reload(); // Simple way for demo to refresh state
        }
    }

    // Event Handlers
    h.on("click", function() {
        ltiOpicAppSettings.playButtonClicked = !0;
        $(this).addClass("btn-disabled").prop("disabled", !0);
        f.hide();
        m.show();
        S.show();
        T = !0;
        B(); // Play audio
    });

    O.on("click", function() {
        // Replay clicked
        if (c) {
            clearTimeout(c); // Clear 5s window
            c = null;
        }
        O.hide(); // Hide replay button (only 1 replay allowed)
        r++; // Increment play count
        v = !0; // Mark as replaying
        
        // Stop current recording if it started
        if (e && e.recording && e.recording.state === "recording") {
            e.recording.stop();
        }
        if (s) s.stop();
        
        B(); // Play audio again
    });

    A.on("click", function() {
        if (y) return; // Prevent double click
        y = !0;
        $(this).prop("disabled", !0);
        
        if (w) {
            // Time already expired
            Y();
        } else {
            if (e && e.recording && e.recording.state === "recording") {
                e.recording.stop();
            }
            if (s) s.stop();
        }
    });

    // Video.js ended event - Crucial for sync
    function onAudioEnded() {
        var current = t.playlist.currentItem();
        if (current < o) {
            // Still in intro or main question
            t.playlist.next();
        } else {
            // Main question finished or replayed main question finished
            Q();
            if (0 == r) {
                // First play finished
                h.hide();
                O.show(); // Show Replay button
                
                // Start 5s window for Replay
                c = setTimeout(function() {
                    O.hide();
                    c = null;
                }, 5000);
                
                q(); // Start recording automatically
                D(); // Start nodding video
            } else {
                // Replay finished
                O.hide(); // Ensure hidden
                q(); // Start recording automatically
                D(); // Start nodding video
                f.hide();
                m.hide();
                S.hide();
            }
        }
    }

    // Initialize Video.js
    t = videojs("opic-video", {
        controls: !1,
        autoplay: !1,
        preload: "auto",
        html5: { hls: { overrideNative: !0 } }
    });

    t.on("ended", onAudioEnded);

    // Initial setup calls
    H();
    N();
    // ... (rest of initialization)
});
