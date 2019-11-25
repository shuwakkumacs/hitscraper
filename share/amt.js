var LINK_TAG_FONTAWESOME = '<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.3.1/css/all.css" integrity="sha384-mzrmE5qonljUremFsqc01SB46JvROS7bZs3IO2EmfFsd15uHvIt+Y8vEf7N7fWAU" crossorigin="anonymous">';

var BTN_TIME_RECORDING = '<div id="btn_timerecord_wrapper"><button class="btn btn-danger m-r-sm btn_timerecord"></button></div>';

var INIT_TIMERECORD_ALERT = '<div class="init_timerecord_alert"><span style="font-size:0.7em;font-weight:normal;">[Alert from TurkScanner]</span><br>Click the button to record working time to start this HIT (Needs to be activated for receiving bonus)<br>'+BTN_TIME_RECORDING+'</div>';

function isAfterSubmitPage(url){
    if (window.location.href.includes("externalSubmit")) return true;
    else return false;
}

function isMTurkPage(url, url_referrer){
    return (isMTurkTopPage(url) || isMTurkParentPage(url) || isIFrame(url_referrer))
           && !isAfterSubmitPage(url);
}

function isMTurkTopPage(url){
    var re = /^https\:\/\/worker(sandbox)?\.mturk\.com\/?(projects)?(\?.*)?$/;
    if(url.match(re)) return true;
    else return false;
}

function isMTurkParentPage(url){
    var re = /^https\:\/\/worker(sandbox)?\.mturk\.com\/projects\/.*/;
    if(url.match(re)) return true;
    else return false;
}

function isPreviewParentPage(url){
    var re = /^https\:\/\/worker(sandbox)?\.mturk\.com\/projects\/[A-Z0-9]+\/tasks(\/?|\?\S*)$/;
    if(url.match(re)) return true;
    else return false;
}

function isAcceptedParentPage(url){
    var re = /^https\:\/\/worker(sandbox)?\.mturk\.com\/projects\/[A-Z0-9]+\/tasks\/\S+$/;
    if(url.match(re)) return true;
    else return false;
}

function isPreviewIFrame(url){
    var assignmentId = getParameterByName("assignmentId",url);
    if(assignmentId=="ASSIGNMENT_ID_NOT_AVAILABLE") return true;
    else return false;
}

function isIFrame(url){
    //var re = /hitId=.+/;
    //if(url.match(re)) return true;
    //else return false;
    if(url) return true;  // FIXME
    else return (parent!==window) && isAcceptedParentPage(document.referrer);
}
