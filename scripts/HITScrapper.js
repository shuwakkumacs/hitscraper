timeRecordInfo = [];
_recording=false;
assignmentId = null;

$(function(){
    // trigger saving the scraped page information DB
    if (isAfterSubmitPage(window.location.href)) {
        assignmentId = getParameterByName("assignmentId", document.referrer);
        sendToBackgroundPromise("nextAction", { "action": "submit_iframe" }, assignmentId);
    }

    // if the page is MTurk-related (including embedded iframes of another domain)
    else if (isMTurkPage(window.location.href, document.referrer)) {
        setWorkerID(function(workerID,isNew){
            sendToBackgroundPromise("ajax", {"operation": "check_app_status", "data": {"worker_id": workerID}}).then(function(data){
                var appStatus = data.status;
                
                switch(appStatus){
                    case "expired":
                    case "terminated":
                        if(isPreviewParentPage(window.location.href)) sendToBackgroundPromise("uninstall");
                        break;
                    case "suspended":
                        if(window===parent && isMTurkParentPage(window.location.href)){ showSuspendedBar(); }
                        return false;
                }

                // show pop-up with confirmation code on install
                if(isMTurkTopPage(window.location.href) && isNew){
                    var url = chrome.extension.getURL("html/install.html");
                    $.get({
                        "url": url,
                        "success": function(data){
                            var w = window.open();
                            w.document.write(data);
                            $(w.document).find("#code").text(workerID.substr(workerID.length-8).split("").reverse().join(""));
                            w.document.close();       
                        }
                    });
                    sendToBackgroundPromise("onInstallInit", {"workerId": workerID, "urlOrigin": window.origin});
                }

                var sendData = {};

                // if the page is parent page of iframe
                if(window===parent && isMTurkParentPage(window.location.href)){
                    if(!isPreviewParentPage(window.location.href) && $("iframe").length){
                        // =============== PARENT PAGE ================ 
                        sendToBackgroundPromise("startPage", {"workerId": workerID, "urlOrigin": window.origin}).then(function(data){
                            var now = new Date();

                            log(`===loaded parent===(${window.location.href})`);

                            setInterval(function(){
                                if(_recording){
                                    var timeStr = calcTime(timeRecordInfo);
                                    $(".btn_timerecord").find(".current_record_time").text(timeStr);
                                }
                            },1000);

                            var HITIFrame = $('iframe.embed-responsive-item')[0];
                            if(HITIFrame != null){
    
                                var parentURL = window.location.href;
                                var iFrameURL = $(".task-row iframe").attr("src");
                                var metaData = JSON.parse($($(document).xpathEvaluate('//*[contains(@data-react-class,"ShowModal")]')[0]).attr("data-react-props"))["modalOptions"];
                                var amtIds = getAMTIdsFromURL(iFrameURL);
                                assignmentId = amtIds["assignmentId"];
                                var groupId = window.location.href.split("/")[4]
                                var userAgent = window.navigator.userAgent;
                                var requesterId = metaData["contactRequesterUrl"].match(/hit_type_message%5Brequester_id%5D=([A-Z|0-9]*)/)[1];
                                chrome.runtime.onMessage.addListener(function(request,sender,sendResponse) {
                                    if(request.operation=="pauseTimeRecord") pauseTimeRecord(assignmentId);
                                });

                                setNextPageListener(assignmentId);

                                sendToBackgroundPromise("parent", {
                                    "parentURL": parentURL,
                                    "iFrameURL": iFrameURL,
                                    "metaData": metaData,
                                    "amtIds": amtIds,
                                    "groupId": groupId,
                                    "userAgent": userAgent
                                }, assignmentId).then(function(){
                                    $("head").append(LINK_TAG_FONTAWESOME);
                                    $("body").append('<div id="border_recording" style="display:none;"></div>');
                                    $(BTN_TIME_RECORDING).insertAfter("div.project-detail-bar>div.row");
                                    window.scrollBy(0,-18);

                                    initTimeRecord();

                                    $(".btn_timerecord").on("click",function(e){
                                        e.preventDefault();
                                        $btn = $(".btn_timerecord");
                                        if($btn.hasClass("btn_timerecord_clicked")){
                                            pauseTimeRecord(assignmentId);
                                        } else {
                                            startTimeRecord(iFrameURL);
                                        }
                                    });

                                });

                                $(window).on("beforeunload", function(){
                                    sendToBackgroundPromise("leaveParent", {"amtIds": amtIds, "groupId": groupId, "metaData": metaData}, assignmentId);
                                });

                            }
                        });
                    }
                }

                // if the page is iframe page of parent page (scrape html information)
                else if (isIFrame() && !isPreviewIFrame(window.location.href)) {
                    // ================== IFRAME =================== 
                    log(`===loaded iframe===(${window.location.href})`);

                    assignmentId = getParameterByName("assignment_id", document.referrer);
                    var html = document.documentElement.outerHTML;

                    var sendingIFrame = 0;

                    sendToBackgroundPromise("iframe", { "html": html }, assignmentId);

                }
            }, function(a,b,c){
                console.log(a,b,c);
                console.log("server communication failed; skipping HIT scraping");
            });
        });
    }
});

// === functions =========================================

function showSuspendedBar(){
    $("body").prepend('<div id="suspendedbar">TurkScraper is temporarily disabled. (Please do not uninstall yet; more tasks might come up soon.)</div>');
}

function setWorkerID(callback){
    chrome.storage.local.get(['workerId'], function (result) {
        var workerID = result.workerId;
        if(workerID){
            //console.log("workerID found: "+workerID);
            callback(workerID,false);
        } else {
            workerID = $('[data-reactid=".0.1.0"]').text();
            if(workerID!=""){
                //console.log("workerID newly found: "+workerID);
                sendToBackgroundPromise("ajax", {"operation": "save_worker", "data": {"worker_id": workerID}}).then(function(){
                    chrome.storage.local.set({'workerId': workerID}, function() {
                        callback(workerID,true);
                    });
                }); 
            } else {
                //console.log("workerID not found");
            }
        }
    });
}


function setNextPageListener(assignmentId){
    var $returnBtnNew = $($(document).xpathEvaluate("//button[contains(text(),'Return')]"));
    $returnBtnNew.on("click", function(e){ 
        //console.log(assignmentId);
        sendToBackgroundPromise("nextAction", { "action": "return" }, assignmentId);
    });
}


var initTimeRecord = function(){
    $("body").prepend(INIT_TIMERECORD_ALERT);
    $btn = $(".btn_timerecord");
    $btn.addClass("btn_timerecord_init");
    $btn.focus();
    $btn.html('<i class="far fa-dot-circle"></i>&nbsp;&nbsp;<b>Click to start recording</b>');
    intervalBlink = setInterval(function() {
        $(".btn_timerecord i, .btn_timerecord b").animate({ opacity: 1 }, 500).animate({ opacity: 0 }, 500);
    }, 1000);
    //sendToBackground("startTimeRecord");
};


var calcTime = function(tInfo){
    var time_user = 0;
    for(var i in tInfo["end"])
        time_user += (new Date(tInfo["end"][i]) - new Date(tInfo["begin"][i]))/1000;
    if(tInfo["end"].length<tInfo["begin"].length)
        time_user += (new Date() - new Date(tInfo["begin"][tInfo["begin"].length-1]))/1000;
    var time_user_t = parseInt(time_user/60).toString().padStart(2,"0") + ":" + (parseInt(time_user)%60).toString().padStart(2,"0");
    return time_user_t;
};


var pauseTimeRecord = function(assignmentId){
    sendToBackgroundPromise("pauseTimeRecord", null, assignmentId).then(function(trInfo){
        $btn = $(".btn_timerecord");
        $btn.removeClass("btn_timerecord_clicked");
        $btn.html('<i class="fas fa-pause"></i>&nbsp;&nbsp;Paused (Click to resume)<br>You actually worked: <span class="current_record_time"></span>');
        $("#border_recording").fadeOut({speed:"normal"});

        _recording=false;
        timeRecordInfo = trInfo;
        var timeStr = calcTime(trInfo);
        $(".btn_timerecord").find(".current_record_time").text(timeStr);
    });
};


var startTimeRecord = function(iFrameURL, callback){
    clearInterval(intervalBlink);
    $(".init_timerecord_alert").remove();
    sendToBackgroundPromise("startTimeRecord", getAMTIdsFromURL(iFrameURL), assignmentId).then(function(trInfo){
        $btn = $(".btn_timerecord");
        $btn.addClass("btn_timerecord_clicked");
        $btn.removeClass("btn_timerecord_init");
        $btn.html('<i class="fas fa-spinner fa-spin fa-3x fa-fw"></i>&nbsp;&nbsp;<b>Recording working time...</b> (Click to pause)<br>You actually worked: <span class="current_record_time"></span>');
        $("#border_recording").fadeIn({speed:"normal"});

        _recording=true;
        timeRecordInfo = trInfo;
        var timeStr = calcTime(trInfo);
        $(".btn_timerecord").find(".current_record_time").text(timeStr);
    });
};
