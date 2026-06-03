// OPIc Volume Indicator Fix
(function() {
  $(document).ready(function() {
    // Replace broken volume images with FA icons
    $('img[src*="audioblock-vol.png"]').each(function() {
      var $icon = $('<i class="fa fa-volume-up" style="font-size: 24px; color: #333;"></i>');
      $(this).replaceWith($icon);
    });

    // Real mic level via Web Audio API AnalyserNode
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function(stream) {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      var audioCtx = new AudioCtx();
      var analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      audioCtx.createMediaStreamSource(stream).connect(analyser);

      var buffer = new Uint8Array(analyser.frequencyBinCount);

      setInterval(function() {
        analyser.getByteFrequencyData(buffer);
        var sum = 0;
        for (var i = 0; i < buffer.length; i++) sum += buffer[i];
        var level = (sum / buffer.length / 255) * 100;

        $('.block-mic-gauge').each(function() {
          if (!$(this).hasClass('disable')) {
            $(this).find('.mic-gauge').css('height', level + '%');
          }
        });
      }, 50);

      console.log('OPIc Volume: Real mic monitoring active');
    }).catch(function(err) {
      console.log('OPIc Volume: Mic access failed -', err.name);
    });
  });
})();
