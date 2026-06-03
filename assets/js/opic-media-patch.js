
// opic-media-patch.js
// MP3 파일 재생 및 외부 도메인 요청 차단을 위한 패치 (v5)

(function() {
    console.log("OPIc Media Patch v5 Loading...");

    // 1. 전역 설정 패치
    function patchSettings() {
        if (!window.ltiOpicAppSettings) return;
        var settings = window.ltiOpicAppSettings;
        
        var fixUrl = function(url) {
            if (typeof url !== 'string') return url;
            return url.replace(/^https?:\/\/opickoreademo\.multicampus\.com/g, '');
        };

        settings.nextPage = "../pages/result.html";
        settings.testLevel = "#";
        settings.standByPortrait = "../assets/images/ava_image.png";
        settings.responseUrl = "#";
        
        if (settings.prompts) {
            settings.prompts.forEach(function(p) {
                p.Mediafile = fixUrl(p.Mediafile);
            });
        }
    }

    // 2. Video.js Middleware
    // Video.js 가 로드된 후 실행되도록 보장
    var setupMiddleware = function() {
        if (!window.videojs) return;
        
        try {
            videojs.use('*', function(player) {
                return {
                    setSource: function(srcObj, next) {
                        var src = srcObj.src;
                        // 도메인 제거
                        src = src.replace(/^https?:\/\/opickoreademo\.multicampus\.com/g, '');
                        srcObj.src = src;

                        // 확장자에 따라 타입 강제 변경
                        if (src.toLowerCase().endsWith('.mp3')) {
                            srcObj.type = 'audio/mpeg';
                            console.log("Patch: Source -> audio/mpeg", src);
                        } else if (src.toLowerCase().endsWith('.mp4')) {
                            srcObj.type = 'video/mp4';
                        }
                        
                        next(null, srcObj);
                    }
                };
            });
            console.log("Video.js Middleware Registered Successfully");
        } catch (e) {
            console.error("Failed to register Video.js Middleware:", e);
        }
    };

    // 3. 초기화
    $(document).ready(function() {
        patchSettings();
        setupMiddleware();
        
        $(document).on('click', '#btnNext', function() {
            setTimeout(patchSettings, 300);
        });
    });

    window.LTIApiUrl = "/";
    window.LTIFileTransferUrl = "/";

})();
