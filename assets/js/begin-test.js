$(function(){
  // Auto-check all checkboxes for demo
  $(".rules-checkbox").prop("checked", true);

  var confirmModal = $("#confirmTakeTest");

  // Begin button click - show confirmation modal
  $("#btnNextConfirm").on("click",function(){
    confirmModal.modal("show");
  });

  // Yes button in modal - proceed to test
  $("#btnConfirmYes").on("click",function(){
    confirmModal.modal("hide");
    loadNextPage();
  });

  // No button in modal - just close modal
  $("#btnConfirmNot").on("click",function(){
    confirmModal.modal("hide");
  });

  $(document).ready(function(){
    $(".test-ready").show();
    $(".test-not-ready").hide();
    $("#btnNextConfirm").prop("disabled",false);
  });
});