(function(global) {
  'use strict';

  var SERVER = 'http://127.0.0.1:8765';

  global.OPIcConfig = {
    SERVER_URL:       SERVER,
    QUESTIONS_BASE:   '../questions/custom/',
    QUESTIONS_CUSTOM: '../questions/',

    API: {
      ping:             SERVER + '/ping',
      feedback:         SERVER + '/feedback',
      overallFeedback:  SERVER + '/overall-feedback',
      saveFeedbackItem: SERVER + '/save-feedback-item',
      saveRecordings:   SERVER + '/save-recordings',
      modelTts:         SERVER + '/model-tts',
      feedbackItems:    SERVER + '/feedback-items',
      feedbackAudio:    SERVER + '/feedback-audio',
      sttEvaluate:      SERVER + '/stt-evaluate',
      evaluateFeedback: SERVER + '/evaluate-feedback',
      tts:              SERVER + '/tts',
      audio:            SERVER + '/audio',
      original:         SERVER + '/original',
      scan:             SERVER + '/scan',
      scanThemes:       SERVER + '/scan-themes',
      customStatus:     SERVER + '/custom-status',
      apikeyStatus:     SERVER + '/apikey-status',
      apikeySave:       SERVER + '/apikey-save',
      topicTexts:       SERVER + '/topic-texts',
      topicOriginals:   SERVER + '/topic-originals',
      updateQjson:      SERVER + '/update-qjson',
    },

    LS: {
      session: 'opic_session_result',
      starred: 'opic_starred_topics',
      survey:  'opic_survey',
      admin:   'opic_admin_themes',
    },
  };

})(window);
