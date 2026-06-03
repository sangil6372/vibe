// OPIc Test Setup - Extend questions to 12
(function() {
  // Extend prompts array to 12 questions
  if (typeof ltiOpicAppSettings !== 'undefined' && ltiOpicAppSettings.prompts) {
    var basePrompts = ltiOpicAppSettings.prompts;
    var newPrompts = [];

    for (var i = 0; i < 12; i++) {
      var baseIndex = i % basePrompts.length;
      var prompt = JSON.parse(JSON.stringify(basePrompts[baseIndex]));

      // Update question number
      prompt.responseNo = "" + (i + 1);
      prompt.ResponseOrder = "" + (i + 1);
      prompt.LTRId = "DEMO-" + (i + 1);
      prompt.learnosityId = "demo-" + (i + 1);
      prompt.response_id = prompt.learnosityId;
      prompt.promptId = "" + (300 + i);

      newPrompts.push(prompt);
    }

    ltiOpicAppSettings.prompts = newPrompts;

    // Update nextLTRId
    if (ltiOpicAppSettings.prompts.length > 1) {
      ltiOpicAppSettings.nextLTRId = ltiOpicAppSettings.prompts[1].LTRId;
    }

    console.log('OPIc Test: Extended to 12 questions');
  }
})();
