var sending = false;

var radioOptions = {
    "2": {
        "name": "ext_page",
        "options": [
            "Yes",
            "No"
        ]
    },
    "3": {
        "name": "interrupted",
        "options": [
            "Yes",
            "No"
        ]
    }
};

for(var qnum in radioOptions){
    var each = radioOptions[qnum];
    var name = each["name"];
    var opt = each["options"];
    for(var i in opt){
        var o = opt[opt.length-i-1];
        $("div[qnum="+qnum+"]>div.radioOptions").prepend('<label class="container">'+o+'<input type="radio" name="'+name+'" value="'+o+'" /><span class="checkmark"></span></label>');
    }
}


// ==================================

var answers = [null,null,null,null,""]; // set non-null if optional

var toggleSubmitButton = function(){
    if(answers.indexOf(null) == -1) $("#submit").prop("disabled",false);
    else $("#submit").prop("disabled",true);
};

var toggleOtherInput = function(that){
    var $parentDiv = $(that).parent().parent()
    if($(that).val()=="Other"){
        $parentDiv.find("input[type=text]").prop("disabled",false);
    } else {
        $parentDiv.find("input[type=text]").val("");
        $parentDiv.find("input[type=text]").prop("disabled",true);
    }
};


//if($("#latest_answer").val()!=""){ 
//    answers = JSON.parse($("#latest_answer").val());
//    //$("#submit").prop("disabled",false);
//}

{

    let qnum = 0;

    var updateByCustomTime = function(){
        var myIsInteger = function(val){
            return val!="" && Number.isInteger(+val) && val>=0;
        };
        var min = $("#time_custom_min").val();
        var sec = $("#time_custom_sec").val();
        if(myIsInteger(min) && myIsInteger(sec) && +sec<60){
            var time = (+min*60) + (+sec);
            answers[qnum] = parseFloat(time);
        } else {
            answers[qnum] = null;
        }
    };
    
    $(".likert-wrapper[qnum="+qnum+"] input[type=radio]").click(function(){
        var $parentDiv = $(this).parent().parent()
        answers[qnum+1] = $(this).attr("class");
        if($(this).attr("class")=="time_custom"){
            $("#time_custom_min,#time_custom_sec").prop("disabled",false);
            $("#time_custom_min,#time_custom_sec").css("background","#ffdc9c");
            updateByCustomTime();
        } else {
            $("#time_custom_min,#time_custom_sec").prop("disabled",true);
    	    answers[qnum] = parseFloat($(this).val());
        }
        toggleSubmitButton();
    });
    
    $(".likert-wrapper[qnum="+qnum+"] input[type=number]").on("keyup click",function(){
        updateByCustomTime();
        toggleSubmitButton();
    });

}


{

    let qnum = 2;
    
    $(".likert-wrapper[qnum="+qnum+"] input[type=radio]").click(function(){
    	answers[qnum] = $(this).val();
        toggleOtherInput(this);
        toggleSubmitButton();
    });

}

{

    let qnum = 3;
    
    $(".likert-wrapper[qnum="+qnum+"] input[type=radio]").click(function(){
    	answers[qnum] = $(this).val();
        toggleOtherInput(this);
        toggleSubmitButton();
    });

}

{

    let qnum = 4;
    
    $(".likert-wrapper[qnum="+qnum+"] textarea").keyup(function(){
    	answers[qnum] = $(this).val();
    });

}

$("#submit").on("click",function(){
    if(sending) return

    var assignment_id = $("#assignment_id").val();
	$(this).text("Sending...");
	$(this).css("background","#ccc");
	$.ajax({
		type: "POST",
		dataType: "json",
		url: baseUrl + "/save_flag/",
		data: JSON.stringify({"flag_type": "survey_sbmt", "assignment_id": assignment_id}),
		success: function(){
            sending = true;
	        var hit_id = $("#hit_id").val();
	        var worker_id = $("#worker_id").val();
	        var group_id = $("#group_id").val();
	        var data = {
	        	"hit_id": hit_id,
	        	"worker_id": worker_id,
	        	"group_id": group_id,
	        	"assignment_id": assignment_id,
	        	"answers": answers
	        };
	        $.ajax({
	        	type: "POST",
	        	dataType: "json",
	        	url: baseUrl + "/post_survey/",
	        	data: JSON.stringify(data),
	        	success: function(){
	        		$(window).off("beforeunload");
	        		window.close();
	        	},
	        	error: function(){
	        	}
	        });
		}
    });
});

$(window).on("beforeunload",function(){ return "test"; });


//============================================

var bgData = JSON.parse(localStorage.postHIT);
var nextAction = bgData["html"]["next_action"];
//var bgData = JSON.parse(localStorage.postHIT);
//var nextAction = bgData["other"]["next_action"];
//var pace = bgData["other"]["pace"];
//var phs_latest_answer = bgData["other"]["phs_latest_answer"];

for(var key in bgData["val"]) $("#"+key).val(bgData["val"][key]);
for(var key in bgData["html"]) $("#"+key).html(bgData["html"][key]);

//if(nextAction=="return") $("#changed_words").text("working on");
//else if(nextAction=="other") {
//    $("#changed_words").text("previewing");
//    $("#tablerow_timerecord_user").hide();
//}

//if(pace!="" && nextAction=="submit_iframe"){
//    var latest_answer = phs_latest_answer;
//    for(var i in latest_answer){
//        var idx = latest_answer[i].idx;
//        var answer = latest_answer[i].answer;
//        var $qDiv = $("div[qnum="+(idx)+"]");
//        if($qDiv.find("label").length>0) { // if radioboxes
//            var $input = $qDiv.find("input[value='"+answer+"']");
//            if ($input.length>0) $input.prop("checked",true);
//            else {
//                var $inputOther = $qDiv.find("input[value='Other']");
//                $inputOther.prop("checked",true);
//                var $textBox = $inputOther.parent().find("input[type=text]");
//                $textBox.val(answer);
//                $textBox.prop("disabled",false);
//            }
//        } else if ($qDiv.find("textarea").length>0) { // if textbox
//            var $textArea = $qDiv.find("textarea");
//            $textArea.text(answer);
//        } else { // if number input
//            var $numberInput = $qDiv.find("input[type=number]");
//            $numberInput.val(answer);
//        }
//        answers[idx] = answer;
//    }
//    $("#latest_answer").val(JSON.stringify(answers));
//    if(pace=="good")
//        $("#resubmit_message").html("We detected your pace on this HIT has <u>speeded up</u>! Please confirm if your previous answers are still valid, otherwise modify them and submit again. (You will only need to answer the working time confirmation.)")
//    else
//        $("#resubmit_message").html("We detected your pace on this HIT has <u>slowed down</u>! Please confirm if your previous answers are still valid, otherwise modify them and submit again. (You will only need to answer the working time confirmation.)")
//}
