const { createApp } = Vue;

createApp({
    data() {
        return {
            currentScreen: 'policy',

            steps: [
                { label: 'Background Survey', screen: 'survey' },
                { label: 'Self Assessment', screen: 'assessment' },
                { label: 'Setup', screen: 'setup' },
                { label: 'Sample Question', screen: 'sample' },
                { label: 'Begin Test', screen: 'begin' }
            ],

            // Policy
            policyAgreed: false,

            // Survey
            currentPart: 1,
            showGuide: false,
            isCounterFixed: false,
            surveyQuestions: [
                [
                    {
                        text: '현재 귀하는 어느 분야에 종사하고 계십니까?',
                        type: 'radio', selected: null, minSelection: 1,
                        options: [
                            { text: '사업/회사', subQuestions: null },
                            { text: '재택근무/재택사업', subQuestions: null },
                            { text: '교사/교육자', subQuestions: null },
                            { text: '일 경험 없음', subQuestions: null }
                        ],
                        selectedSubQuestions: []
                    }
                ],
                [
                    {
                        text: '현재 당신은 학생입니까?',
                        type: 'radio', selected: null, minSelection: 1,
                        options: [
                            { text: '예', subQuestions: null },
                            { text: '아니요', subQuestions: null }
                        ],
                        selectedSubQuestions: []
                    }
                ],
                [
                    {
                        text: '현재 귀하는 어디에 살고 계십니까?',
                        type: 'radio', selected: null, minSelection: 1,
                        options: [
                            { text: '개인주택이나 아파트에 홀로 거주', subQuestions: null },
                            { text: '친구나 룸메이트와 함께 주택이나 아파트에 거주', subQuestions: null },
                            { text: '가족(배우자/자녀/기타 가족 일원)과 함께 주택이나 아파트에 거주', subQuestions: null },
                            { text: '학교 기숙사', subQuestions: null },
                            { text: '군대 막사', subQuestions: null }
                        ],
                        selectedSubQuestions: []
                    }
                ],
                [
                    {
                        text: '귀하는 여가 활동으로 주로 무엇을 하십니까? (두 개 이상 선택)',
                        type: 'checkbox', selected: [], minSelection: 2,
                        errorText: '여가 활동에서 2개 이상을 고르세요.', showError: false,
                        options: [
                            { text: '영화보기' }, { text: '클럽/나이트클럽 가기' }, { text: '공연보기' },
                            { text: '콘서트보기' }, { text: '박물관가기' }, { text: '공원가기' },
                            { text: '캠핑하기' }, { text: '해변가기' }, { text: '스포츠 관람' },
                            { text: '주거 개선' }
                        ],
                        selectedSubQuestions: []
                    },
                    {
                        text: '귀하의 취미나 관심사는 무엇입니까? (한 개 이상 선택)',
                        type: 'checkbox', selected: [], minSelection: 1,
                        errorText: '취미나 관심사 중 1개 이상을 고르세요.', showError: false,
                        options: [
                            { text: '아이에게 책 읽어주기' }, { text: '음악 감상하기' }, { text: '악기 연주하기' },
                            { text: '혼자 노래부르거나 합창하기' }, { text: '춤추기' }, { text: '그림 그리기' },
                            { text: '사진 찍기' }, { text: '요리하기' }, { text: '독서하기' }, { text: '게임하기' }
                        ],
                        selectedSubQuestions: []
                    },
                    {
                        text: '귀하가 즐기는 운동은 무엇입니까? (한 개 이상 선택)',
                        type: 'checkbox', selected: [], minSelection: 1,
                        errorText: '운동 중 1개 이상을 고르세요.', showError: false,
                        options: [
                            { text: '수영' }, { text: '조깅/달리기' }, { text: '자전거 타기' },
                            { text: '등산/하이킹' }, { text: '헬스/웨이트 트레이닝' }, { text: '요가/필라테스' },
                            { text: '구기종목(축구, 농구, 배구 등)' }, { text: '테니스/배드민턴' },
                            { text: '골프' }, { text: '무술(태권도, 유도 등)' }
                        ],
                        selectedSubQuestions: []
                    }
                ]
            ],

            // Assessment
            selectedLevel: null,
            levels: [
                { value: '1-2', name: 'Level 1-2', questions: 12, descriptions: ['기초 수준의 문장 구성', '짧은 답변으로 응답 가능', '일상적인 주제'] },
                { value: '3-4', name: 'Level 3-4', questions: 15, descriptions: ['중급 수준의 문장 구성', '상황 설명 및 경험 공유', 'Role-play 문제 포함'] },
                { value: '5-6', name: 'Level 5-6', questions: 15, descriptions: ['고급 수준의 담화 구성', '복잡한 상황 설명 및 의견 제시', '돌발 상황 대처 문제 포함'] }
            ],

            // Setup
            micTested: false,

            // Sample
            sampleQuestion: 'Tell me about yourself. Where are you from and what do you do?',
            isRecording: false,
            hasRecording: false,
            recordingUrl: null,
            recordingTime: '00:00',
            recordingTimer: null,
            recordingStartTime: 0,
            mediaRecorder: null,
            audioChunks: [],

            // Test - Core
            totalQuestions: 15,
            currentQuestionNum: 1,
            answeredQuestions: 0,
            testQuestions: [],
            testTimer: '00:00',
            testStartTime: null,
            testTimerInterval: null,

            // Test - Question 상태 (5단계)
            // 1=Listen  2=Playing  3=Recording  4=MoveOn  5=Buffering
            promptStatus: 1,
            questionPlayed: false,
            replayCount: 1,
            replayWindowOpen: false,
            replayWindowTimer: null,
            isAvatarSpeaking: false,
            currentQuestionText: '',
            playbackProgress: 0,
            adminAudioPlayer: null,

            // Test - 응답 타이머 (60초 카운트다운)
            responseTimerMax: 60,
            responseTimer: 60,
            responseTimerInterval: null,
            recordingProgressPct: 0,

            // Test - 녹음
            testIsRecording: false,
            testHasRecording: false,
            testRecordingUrl: null,
            testRecordingTime: '00:00',
            testMediaRecorder: null,
            testAudioChunks: [],
            testRecordingTimer: null,
            testRecordingStartTime: 0,

            // Test - Web Audio API (마이크 게이지 + 파형)
            audioContext: null,
            analyserNode: null,
            micLevelAnimFrame: null,
            micLevel: 0,
            waveformStatus: 'Click on record to start',

            // Test - 문항 번호 리스트
            promptList: [],
            showTestGuide: false,

            // Test - 마이크 에러
            micErrorType: null,   // null | 'access' | 'denied' | 'blocked' | 'noMic'

            // Test - 음질 경고
            audioQualityWarning: null,  // null | 'low' | 'high'
            showQualityModal: false,

            // Admin
            adminThemes: [],
        };
    },

    computed: {
        currentStepIndex() {
            return this.steps.findIndex(step => step.screen === this.currentScreen);
        },

        canProceed() {
            if (this.currentPart === 4) {
                return this.totalSelectedInPart4 >= 12 && this.allPart4QuestionsAnswered;
            }
            const currentQuestions = this.surveyQuestions[this.currentPart - 1];
            return currentQuestions.every(q => {
                if (q.type === 'radio') return q.selected !== null;
                return q.selected.length >= q.minSelection;
            });
        },

        totalSelectedInPart4() {
            if (this.currentPart !== 4) return 0;
            let total = 0;
            this.surveyQuestions[3].forEach(q => {
                if (Array.isArray(q.selected)) total += q.selected.length;
            });
            return total;
        },

        allPart4QuestionsAnswered() {
            return this.surveyQuestions[3].every(q => {
                if (q.type === 'checkbox') return q.selected.length >= q.minSelection;
                return true;
            });
        },

        testProgress() {
            return (this.currentQuestionNum / this.totalQuestions) * 100;
        },

        responseTimerProgress() {
            return ((this.responseTimerMax - this.responseTimer) / this.responseTimerMax) * 100;
        },

        responseTimerDisplay() {
            const t = Math.max(0, this.responseTimer);
            const m = Math.floor(t / 60);
            const s = t % 60;
            return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        },

        responseTimerMaxDisplay() {
            const m = Math.floor(this.responseTimerMax / 60);
            const s = this.responseTimerMax % 60;
            return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        },
    },

    mounted() {
        window.addEventListener('scroll', this.handleScroll);
        this.fetchAdminQuestions();
    },

    beforeUnmount() {
        window.removeEventListener('scroll', this.handleScroll);
        if (this.testTimerInterval) clearInterval(this.testTimerInterval);
        if (this.responseTimerInterval) clearInterval(this.responseTimerInterval);
        if (this.replayWindowTimer) clearTimeout(this.replayWindowTimer);
        this.stopMicAnalysis();
    },

    methods: {
        // ─── Policy ─────────────────────────────────────
        startSurvey() {
            this.currentScreen = 'survey';
        },

        // ─── Survey ─────────────────────────────────────
        handleScroll() {
            if (this.currentScreen === 'survey' && this.currentPart === 4) {
                this.isCounterFixed = (window.pageYOffset || document.documentElement.scrollTop) > 200;
            }
        },

        isQuestionVisible(partIndex, questionIndex) {
            return true;
        },

        handleOptionChange(partIndex, questionIndex, option) {
            const question = this.surveyQuestions[partIndex][questionIndex];
            if (question.type === 'radio' && option.subQuestions) {
                question.selectedSubQuestions = option.subQuestions;
            } else if (question.type === 'radio') {
                question.selectedSubQuestions = [];
            }
            if (question.type === 'checkbox') {
                question.showError = question.selected.length < question.minSelection;
            }
        },

        previousPart() {
            if (this.currentPart > 1) this.currentPart--;
        },

        nextPart() {
            if (this.currentPart < this.surveyQuestions.length) {
                const currentQuestions = this.surveyQuestions[this.currentPart - 1];
                let isValid = true;
                currentQuestions.forEach(q => {
                    if (q.type === 'checkbox' && q.selected.length < q.minSelection) {
                        q.showError = true;
                        isValid = false;
                    }
                });
                if (!isValid) return;
                this.currentPart++;
            } else {
                this.currentScreen = 'assessment';
            }
        },

        // ─── Assessment ──────────────────────────────────
        selectLevel(level) {
            this.selectedLevel = level;
            const levelData = this.levels.find(l => l.value === level);
            this.totalQuestions = levelData.questions;
            this.currentScreen = 'setup';
        },

        // ─── Setup ───────────────────────────────────────
        async testMicrophone() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                this.micTested = true;
            } catch (error) {
                alert('마이크 접근 권한이 필요합니다.');
            }
        },

        nextStep() {
            const currentIndex = this.steps.findIndex(s => s.screen === this.currentScreen);
            if (currentIndex < this.steps.length - 1) {
                this.currentScreen = this.steps[currentIndex + 1].screen;
            }
        },

        // ─── Sample Recording ────────────────────────────
        async startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];
                this.mediaRecorder.ondataavailable = (event) => this.audioChunks.push(event.data);
                this.mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                    this.recordingUrl = URL.createObjectURL(audioBlob);
                    this.hasRecording = true;
                    stream.getTracks().forEach(track => track.stop());
                };
                this.mediaRecorder.start();
                this.isRecording = true;
                this.recordingStartTime = Date.now();
                this.startRecordingTimer();
            } catch (error) {
                alert('녹음을 시작할 수 없습니다: ' + error.message);
            }
        },

        stopRecording() {
            if (this.mediaRecorder && this.isRecording) {
                this.mediaRecorder.stop();
                this.isRecording = false;
                if (this.recordingTimer) clearInterval(this.recordingTimer);
            }
        },

        startRecordingTimer() {
            this.recordingTimer = setInterval(() => {
                const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                this.recordingTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }, 1000);
        },

        // ─── Begin Test ──────────────────────────────────
        startTest() {
            this.currentScreen = 'test';
            this.currentQuestionNum = 1;
            this.answeredQuestions = 0;
            this.testStartTime = Date.now();
            this.startTestTimer();
            this.initializeTestQuestions();
            this.initPromptList();
            this.$nextTick(() => this.loadQuestion(1));
        },

        startTestTimer() {
            this.testTimerInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - this.testStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                this.testTimer = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }, 1000);
        },

        // ─── Test: 문제 초기화 ────────────────────────────
        initializeTestQuestions() {
            let selected = [];
            selected.push({ text: "Let's begin the interview now. Please tell me something about yourself." });

            if (this.adminThemes && this.adminThemes.length > 0) {
                const shuffled = [...this.adminThemes].sort(() => 0.5 - Math.random());
                shuffled.forEach(theme => {
                    theme.questions.forEach(q => {
                        if (selected.length < this.totalQuestions) selected.push(q);
                    });
                });
            }

            const defaultPool = [
                { text: 'Describe your home. What does it look like?' },
                { text: 'What do you like to do in your free time?' },
                { text: 'Tell me about a memorable vacation you have taken.' },
                { text: 'Describe your favorite movie.' },
                { text: 'What kind of music do you enjoy?' },
                { text: 'Tell me about a sport you do regularly.' }
            ];
            while (selected.length < this.totalQuestions) {
                selected.push(defaultPool[Math.floor(Math.random() * defaultPool.length)]);
            }
            this.testQuestions = selected;
        },

        initPromptList() {
            this.promptList = Array.from({ length: this.totalQuestions }, (_, i) => ({
                num: i + 1,
                state: i === 0 ? 'active' : 'pending'
            }));
        },

        // ─── Test: 문제 로드 (문제 전환 시) ─────────────────
        loadQuestion(num) {
            // 타이머/상태 초기화
            if (this.responseTimerInterval) clearInterval(this.responseTimerInterval);
            if (this.replayWindowTimer) clearTimeout(this.replayWindowTimer);
            if (this.testRecordingTimer) clearInterval(this.testRecordingTimer);
            if (this.adminAudioPlayer) { this.adminAudioPlayer.pause(); this.adminAudioPlayer = null; }
            window.speechSynthesis.cancel();
            this.stopMicAnalysis();

            this.promptStatus = 1;
            this.questionPlayed = false;
            this.replayCount = 1;
            this.replayWindowOpen = false;
            this.testIsRecording = false;
            this.testHasRecording = false;
            this.testRecordingUrl = null;
            this.testRecordingTime = '00:00';
            this.responseTimer = this.responseTimerMax;
            this.recordingProgressPct = 0;
            this.playbackProgress = 0;
            this.micLevel = 0;
            this.isAvatarSpeaking = false;
            this.waveformStatus = 'Click on record to start';
            this.micErrorType = null;

            if (num <= this.testQuestions.length) {
                this.currentQuestionText = this.testQuestions[num - 1].text || '';
            }

            // 파형 캔버스 초기화
            this.$nextTick(() => this.clearWaveformCanvas());
        },

        // ─── Test: 질문 재생 ─────────────────────────────
        playQuestion() {
            if (this.promptStatus === 2 || this.promptStatus === 3) return;
            this.promptStatus = 5; // buffering
            this.isAvatarSpeaking = true;
            this.playbackProgress = 0;

            const currentQ = this.testQuestions[this.currentQuestionNum - 1];

            if (currentQ.mediafile) {
                if (this.adminAudioPlayer) this.adminAudioPlayer.pause();
                this.adminAudioPlayer = new Audio(currentQ.mediafile);
                this.adminAudioPlayer.onloadedmetadata = () => {
                    this.promptStatus = 2;
                };
                this.adminAudioPlayer.ontimeupdate = () => {
                    if (this.adminAudioPlayer.duration) {
                        this.playbackProgress = (this.adminAudioPlayer.currentTime / this.adminAudioPlayer.duration) * 100;
                    }
                };
                this.adminAudioPlayer.onended = () => this.onQuestionEnded();
                this.adminAudioPlayer.play().catch(() => {
                    this.fallbackTTS(currentQ.text);
                });
            } else {
                this.fallbackTTS(currentQ.text);
            }
        },

        fallbackTTS(text) {
            this.promptStatus = 2;
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text || '');
            utterance.lang = 'en-US';
            const voices = window.speechSynthesis.getVoices();
            const femaleVoice = voices.find(v =>
                (v.lang === 'en-US' || v.lang === 'en_US') &&
                (v.name.includes('Google') || v.name.includes('Female'))
            );
            if (femaleVoice) utterance.voice = femaleVoice;
            utterance.onend = () => this.onQuestionEnded();
            window.speechSynthesis.speak(utterance);
        },

        // 질문 재생 완료 → 자동 녹음 시작 + 5초 replay 창 열기
        onQuestionEnded() {
            this.isAvatarSpeaking = false;
            this.questionPlayed = true;
            this.playbackProgress = 100;

            // 자동 녹음 시작
            this.startTestRecording();

            // 5초 replay 창
            this.replayWindowOpen = true;
            this.replayWindowTimer = setTimeout(() => {
                this.replayWindowOpen = false;
            }, 5000);
        },

        // ─── Test: Replay (5초 이내) ──────────────────────
        replayQuestion() {
            if (!this.replayWindowOpen || this.replayCount <= 0) return;

            // 현재 녹음 무효화 후 중지
            if (this.testMediaRecorder && this.testIsRecording) {
                this.testMediaRecorder.onstop = null;
                this.testMediaRecorder.stop();
            }
            if (this.responseTimerInterval) clearInterval(this.responseTimerInterval);
            if (this.testRecordingTimer) clearInterval(this.testRecordingTimer);
            this.stopMicAnalysis();

            clearTimeout(this.replayWindowTimer);
            this.replayWindowOpen = false;
            this.replayCount = 0;

            this.testIsRecording = false;
            this.testHasRecording = false;
            this.testRecordingUrl = null;
            this.testRecordingTime = '00:00';
            this.responseTimer = this.responseTimerMax;
            this.recordingProgressPct = 0;
            this.playbackProgress = 0;
            this.waveformStatus = 'Click on record to start';
            this.clearWaveformCanvas();

            this.playQuestion();
        },

        // ─── Test: 녹음 시작 ──────────────────────────────
        async startTestRecording() {
            const requestTime = Date.now();
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                this.promptStatus = 3;
                this.waveformStatus = '녹음 중...';
                this.testAudioChunks = [];

                // Web Audio API: 마이크 레벨 + 파형
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = this.audioContext.createMediaStreamSource(stream);
                this.analyserNode = this.audioContext.createAnalyser();
                this.analyserNode.fftSize = 2048;
                source.connect(this.analyserNode);
                this.startMicAnalysis();

                // MediaRecorder
                const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm';
                this.testMediaRecorder = new MediaRecorder(stream, { mimeType });
                this.testMediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) this.testAudioChunks.push(e.data);
                };
                this.testMediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(this.testAudioChunks, { type: mimeType });
                    this.testRecordingUrl = URL.createObjectURL(audioBlob);
                    this.testHasRecording = true;
                    stream.getTracks().forEach(t => t.stop());
                    this.stopMicAnalysis();
                    this.waveformStatus = '녹음 완료';

                    const warning = await this.checkAudioQuality(audioBlob);
                    this.audioQualityWarning = warning;
                    if (warning) this.showQualityModal = true;
                };

                this.testMediaRecorder.start(100);
                this.testIsRecording = true;
                this.testRecordingStartTime = Date.now();
                this.startTestRecordingTimer();
                this.startResponseTimer();

            } catch (error) {
                const elapsed = Date.now() - requestTime;
                if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                    this.micErrorType = 'noMic';
                } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    this.micErrorType = elapsed < 400 ? 'blocked' : 'denied';
                } else {
                    this.micErrorType = 'access';
                }
            }
        },

        // ─── Test: 녹음 중지 (수동) ───────────────────────
        stopTestRecording() {
            if (!this.testMediaRecorder || !this.testIsRecording) return;
            this.testMediaRecorder.stop();
            this.testIsRecording = false;
            this.promptStatus = 4;
            if (this.responseTimerInterval) clearInterval(this.responseTimerInterval);
            if (this.testRecordingTimer) clearInterval(this.testRecordingTimer);
        },

        // ─── Test: 응답 타이머 (60초 카운트다운) ──────────
        startResponseTimer() {
            this.responseTimer = this.responseTimerMax;
            if (this.responseTimerInterval) clearInterval(this.responseTimerInterval);
            this.responseTimerInterval = setInterval(() => {
                this.responseTimer = Math.max(0, this.responseTimer - 1);
                this.recordingProgressPct = ((this.responseTimerMax - this.responseTimer) / this.responseTimerMax) * 100;
                if (this.responseTimer <= 0) {
                    clearInterval(this.responseTimerInterval);
                    if (this.testIsRecording) {
                        this.testMediaRecorder.stop();
                        this.testIsRecording = false;
                        this.promptStatus = 4;
                        if (this.testRecordingTimer) clearInterval(this.testRecordingTimer);
                        this.waveformStatus = '시간 초과';
                    }
                }
            }, 1000);
        },

        // ─── Test: 경과 시간 타이머 (파형 표시용) ─────────
        startTestRecordingTimer() {
            this.testRecordingTimer = setInterval(() => {
                const elapsed = Math.floor((Date.now() - this.testRecordingStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                this.testRecordingTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }, 1000);
        },

        // ─── Test: 마이크 레벨 + 파형 (Web Audio API) ─────
        startMicAnalysis() {
            if (!this.analyserNode) return;
            const bufferLength = this.analyserNode.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const draw = () => {
                if (!this.testIsRecording && !this.analyserNode) return;
                this.micLevelAnimFrame = requestAnimationFrame(draw);
                this.analyserNode.getByteTimeDomainData(dataArray);

                // 마이크 레벨 계산 (RMS)
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const v = (dataArray[i] - 128) / 128;
                    sum += v * v;
                }
                const rms = Math.sqrt(sum / bufferLength);
                this.micLevel = Math.min(100, rms * 300);

                // 파형 캔버스 그리기
                const canvas = this.$refs.waveformCanvas;
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                const W = canvas.width;
                const H = canvas.height;

                ctx.fillStyle = '#0d1117';
                ctx.fillRect(0, 0, W, H);

                ctx.lineWidth = 2;
                ctx.strokeStyle = '#3498db';
                ctx.beginPath();
                const sliceWidth = W / bufferLength;
                let x = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = (v * H) / 2;
                    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                    x += sliceWidth;
                }
                ctx.lineTo(W, H / 2);
                ctx.stroke();
            };
            draw();
        },

        stopMicAnalysis() {
            if (this.micLevelAnimFrame) {
                cancelAnimationFrame(this.micLevelAnimFrame);
                this.micLevelAnimFrame = null;
            }
            this.micLevel = 0;
            if (this.audioContext) {
                this.audioContext.close().catch(() => {});
                this.audioContext = null;
                this.analyserNode = null;
            }
        },

        clearWaveformCanvas() {
            const canvas = this.$refs.waveformCanvas;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#0d1117';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // 중앙 기준선
            ctx.strokeStyle = '#2d3748';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        },

        // ─── Test: 음질 검사 ─────────────────────────────
        async checkAudioQuality(audioBlob) {
            try {
                const arrayBuffer = await audioBlob.arrayBuffer();
                const ctx = new AudioContext();
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                ctx.close();
                const channelData = audioBuffer.getChannelData(0);
                let sumSquares = 0;
                let clippingCount = 0;
                for (let i = 0; i < channelData.length; i++) {
                    sumSquares += channelData[i] * channelData[i];
                    if (Math.abs(channelData[i]) > 0.98) clippingCount++;
                }
                const rms = Math.sqrt(sumSquares / channelData.length);
                if (clippingCount > 40) return 'high';
                if (rms < 0.05) return 'low';
                return null;
            } catch (e) {
                return null;
            }
        },

        // ─── Test: 마이크 에러 재시도 ─────────────────────
        retryMic() {
            this.micErrorType = null;
            this.startTestRecording();
        },

        // ─── Test: 다음 문제 ──────────────────────────────
        nextQuestion() {
            if (!this.testHasRecording) return;
            this.answeredQuestions++;

            const currentItem = this.promptList.find(p => p.num === this.currentQuestionNum);
            if (currentItem) currentItem.state = 'visited';

            if (this.currentQuestionNum < this.totalQuestions) {
                this.currentQuestionNum++;
                const nextItem = this.promptList.find(p => p.num === this.currentQuestionNum);
                if (nextItem) nextItem.state = 'active';
                this.loadQuestion(this.currentQuestionNum);
            } else {
                this.currentScreen = 'complete';
                if (this.testTimerInterval) clearInterval(this.testTimerInterval);
            }
        },

        // ─── Complete ────────────────────────────────────
        restart() {
            if (this.testTimerInterval) clearInterval(this.testTimerInterval);
            if (this.responseTimerInterval) clearInterval(this.responseTimerInterval);
            this.stopMicAnalysis();

            this.currentScreen = 'policy';
            this.policyAgreed = false;
            this.currentPart = 1;
            this.selectedLevel = null;
            this.currentQuestionNum = 1;
            this.answeredQuestions = 0;
            this.testTimer = '00:00';

            this.surveyQuestions.forEach(part => {
                part.forEach(q => {
                    q.selected = q.type === 'radio' ? null : [];
                    q.selectedSubQuestions = [];
                    if (q.showError !== undefined) q.showError = false;
                });
            });
        },

        // ─── Admin ───────────────────────────────────────
        async fetchAdminQuestions() {
            try {
                const response = await fetch('http://localhost:3000/api/themes');
                const data = await response.json();
                this.adminThemes = data.themes || [];
            } catch (error) {
                // 백엔드 없으면 무시
            }
        }
    }
}).mount('#app');
