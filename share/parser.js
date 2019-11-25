function getURL($body){
    var text = getTextFromHTML($body);
    
    var anchorURLs = getAllAnchorHrefs($body);
    var textURLs = extractURLsFromText(text);
    var allURLs = $.extend(anchorURLs, textURLs);

    var extURLs = anchorURLs.concat(textURLs);
    var imgURLs = getAllImgSrcs($body);
    var audioURLs = getAllAudioSrcs($body);
    var videoURLs = getAllVideoSrcs($body);
        
    var data = {}
    //data["WLEN:inner_html"] = text.split(" ").length
    data["TXT:inner_html"] = text
    data["URL:a_href_counts"] = anchorURLs.length
    data["URL:text_url_counts"] = textURLs.length
    data["URL:img_src_counts"] = imgURLs.length
    data["URL:audio_src_counts"] = audioURLs.length
    data["URL:video_src_counts"] = videoURLs.length
    data["URL:all_url_counts"] = allURLs.length
    var cnt = 0;
    for(var i in allURLs) if(allURLs[i].indexOf("qualtrics.com")>-1) cnt++;
    data["URL:qualtrics_url_counts"] = cnt;

    return data;
}

function getIFrameHTMLOfHIT(projectUrl){
    return new Promise(function(resolve,reject){
        $.get({
            url: projectUrl,
            success: function(html){
                    var $iframe = $(html).find("iframe");
                    var iframeSrc = $iframe.attr("src");
                    if (iframeSrc) {
                        iframeSrc = iframeSrc.replace("assignmentId=ASSIGNMENT_ID_NOT_AVAILABLE", "assignmentId=TEST_ASSIGNMENT");
                        $.get({
                            url: iframeSrc,
                            success: function(html2){
                                    resolve(html2);
                                },
                            error: function(){
                                    resolve(null);
                                }
                        });
                    } else {
                        resolve($(html).find("#hit-wrapper").html());
                        resolve(null);
                    }
                }
        });
    });
}

function getInputFieldsCount($parentElem) {
    if (typeof($parentElem) === "undefined") { $parentElem = $("body"); }

    var inputList = [];
    
    var $inputFields = $parentElem.find("input");
    for (var i = 0; i < $inputFields.length; i++) {
        var entry = {};
        entry.type = $inputFields[i].getAttribute("type");
        if(!entry.type) entry.type = "text";
        entry.name = $inputFields[i].getAttribute("name");
        if(!entry.name) entry.name = "";
        entry.value = $inputFields[i].value;
        if(!entry.value) entry.value = "";
        inputList.push(entry);
    }

    var $textAreas = $parentElem.find("textarea");
    for(var i = 0; i < $textAreas.length; i++){
        var entry = {};
        entry.type = "textarea";
        entry.name = $textAreas.eq(i).attr("name");
        if(!entry.name) entry.name = "";

        entry.value = $textAreas[i].value;
        if(!entry.value) entry.value = "";
        inputList.push(entry);
    }

    var $selectFields = $parentElem.find("select");
    for(var i = 0; i < $selectFields.length; i++){
        $options = $($selectFields[i]).children("option");
        for(var j = 0; j < $options.length; j++){
            var entry = {};
            entry.type = "select_option";
            entry.name = $selectFields.eq(i).attr("name");
            entry.value = $options.eq(j).val();
            inputList.push(entry);
        }
    }

    var inputCountList = {};
    var inputTypeList = ["hidden", "submit", "text", "radio", "checkbox", "range",
                         "button", "file", "number", "password", "url", "date",
                         "time", "email", "reset", "tel", "select_option", "textarea"];
    for(var i in inputTypeList) inputCountList["INP:"+inputTypeList[i]] = 0;
    for(var i in inputList){
        var inputType = inputList[i].type
        if (inputTypeList.indexOf(inputType) > -1){ inputCountList["INP:"+inputType]++; }
    }

    //var inputCountListPerc = {};
    //for(var key in inputCountList){ inputCountListPerc[key] = inputCountList[key]/inputList.length; }

    return inputCountList;
}

function getTemplate($body) {
    if(!$body) var html = $("body").html();
    else var html = $body.html();

    var templateArray = [
                         "Survey Link Layout -->",
                         "Survey Layout -->",
                         //"Image Moderation Layout --",
                         "Image A/B Layout -->",
                         "Writing Layout -->",
                         "Data Collection Layout -->",
                         "<!-- Layout -->",
                         //"Video transcription layout -->",
                         "Image Tagging Layout -->",
                         "Image Transcription Layout -->",
                         //"STARTSCALE -->",
                         "Categorization Layout -->",
                         "<!-- Content Body -->"
    ];

    var templateArrayValues = [
                         "Survey Link",
                         "Survey",
                         //"Image Moderation",
                         "Image A/B",
                         "Writing",
                         "Data Collection",
                         "Data Collect From Website",
                         //"Video Transcription",
                         "Image Tagging",
                         "Image Transcription",
                         //"Sentiment",
                         "Categorization",
                         "Other"
    ];

    var thisTemplate = "No template";

    for(var i=0; i<templateArray.length; i++){
        if(html.includes(templateArray[i])){
            thisTemplate = templateArrayValues[i];
            break;
        }
    }

    return {"META:template": thisTemplate };

    //var oneHot = {};
    //oneHot["META:template_No_template"] = (thisTemplate=="No template") ? 1 : 0;
    //for(var i in templateArrayValues){
    //    var tempVal = templateArrayValues[i];
    //    var keyName = "META:template_"+tempVal.replace(" ", "_");
    //    if(thisTemplate==templateArrayValues[i]) oneHot[keyName] = 1;
    //    else oneHot[keyName] = 0;
    //}
    //return oneHot;
}

function getTurkopticon1Data(requesterId) {
    return new Promise(function(resolve, reject){
        if (requesterId != null) {
            $.get({
                url: "https://turkopticon.ucsd.edu/api/multi-attrs.php?ids=" + requesterId,
                timeout: 5000,
                success: function(data1) {
                    var parsed = JSON.parse(data1);
                    to1 = parsed[requesterId];
                    if(to1 != "") {
                        to1Data = {
                            "to1_comm": to1["attrs"]["comm"],
                            "to1_pay": to1["attrs"]["pay"],
                            "to1_fair": to1["attrs"]["fair"],
                            "to1_fast": to1["attrs"]["fast"],
                            "to1_reviews": to1["reviews"],
                            "to1_tos": to1["tos_flags"]
                        };
                    }
                    else { 
                        to1Data = {
                            "to1_comm": null,
                            "to1_pay": null,
                            "to1_fair": null,
                            "to1_fast": null,
                            "to1_reviews": null,
                            "to1_tos": null
                        };
                    }
                    for(var key in to1Data) if(typeof(to1Data[key])=="string") to1Data[key] = parseFloat(to1Data[key])
                    resolve(to1Data);
                },
                error: function(a,b,c){
                    to1Data = {
                        "to1_comm": null,
                        "to1_pay": null,
                        "to1_fair": null,
                        "to1_fast": null,
                        "to1_reviews": null,
                        "to1_tos": null
                    };
                    resolve(to1Data);
                }
            });
        }
    });
}

function getTurkopticon2Data(requesterId) {
    return new Promise(function(resolve, reject){
        //var terms = ["all", "recent"];
        var terms = ["all"];
        var criteria = ["reward", "pending", "comm", "recommend", "rejected", "tos", "broken"];
        var criteria_num = [3,1,3,3,3,2,2];
        function postProcess(to2Data){
            to2Data["to2_all_work_time_ave"] = to2Data["to2_all_reward_1"]/to2Data["to2_all_reward_2"]
            to2Data["to2_all_comm_prop"] = to2Data["to2_all_comm_0"]/to2Data["to2_all_comm_2"]
            to2Data["to2_all_recommend_prop"] = to2Data["to2_all_recommend_0"]/to2Data["to2_all_recommend_2"]
            to2Data["to2_all_rejected_prop"] = to2Data["to2_all_rejected_0"]/to2Data["to2_all_rejected_2"]
            to2Data["to2_all_tos_prop"] = to2Data["to2_all_tos_0"]/to2Data["to2_all_tos_1"]
            to2Data["to2_all_broken_prop"] = to2Data["to2_all_broken_0"]/to2Data["to2_all_broken_1"]

            delete to2Data["to2_all_reward_1"]
            delete to2Data["to2_all_reward_2"]
            delete to2Data["to2_all_comm_0"]
            delete to2Data["to2_all_comm_2"]
            delete to2Data["to2_all_recommend_0"]
            delete to2Data["to2_all_recommend_2"]
            delete to2Data["to2_all_rejected_0"]
            delete to2Data["to2_all_rejected_2"]
            delete to2Data["to2_all_tos_0"]
            delete to2Data["to2_all_tos_1"]
            delete to2Data["to2_all_broken_0"]
            delete to2Data["to2_all_broken_1"]
            resolve(to2Data);
        }
        if (requesterId != null) {
            $.ajax({
                "url":  "https://api.turkopticon.info/requesters/" + requesterId,
                "timeout": 5000,
                "success": function(data2, status) {
                        if(data2["data"]!= "") {
                            to2 = data2["data"]["attributes"]["aggregates"];
                            to2Data = {};
                            for(var i in terms)
                                for(var j in criteria)
                                    for(var k=0; k<criteria_num[j]; k++)
                                        if(criteria[j]=="pending")
                                            to2Data["to2_"+terms[i]+"_"+criteria[j]] = to2[terms[i]][criteria[j]];
                                        else if(to2[terms[i]][criteria[j]])
                                            to2Data["to2_"+terms[i]+"_"+criteria[j]+"_"+k] = to2[terms[i]][criteria[j]][k];
                                        else
                                            to2Data["to2_"+terms[i]+"_"+criteria[j]+"_"+k] = null;

                            postProcess(to2Data);
                        }
                    },
                "error": function(data2, status) {
                    to2Data = {};
                    for(var i in terms)
                        for(var j in criteria)
                            for(var k=0; k<criteria_num[j]; k++)
                                if(criteria[j]=="pending")
                                    to2Data["to2_"+terms[i]+"_"+criteria[j]] = null;
                                else
                                    to2Data["to2_"+terms[i]+"_"+criteria[j]+"_"+k] = null;
                    postProcess(to2Data);
                }
            });       
        }
    });
}




var getAllAnchorHrefs = function($body){
    var urlList = [];
    $body.find("a").each(function() {
        var a = document.createElement("a");
        a.href = $(this).attr("href");
        if($.inArray(a.href, urlList) === -1 && a.href.startsWith("http")) urlList.push(a.href);
    });
    return urlList;
};

var getAllImgSrcs = function($body){
    var imgURLList = [];
    $body.find('*').each(function(){
        if ($(this).is('img')) {
            if($.inArray($(this).attr('src'), imgURLList) === -1) imgURLList.push($(this).attr('src'));
        } else {
            var backImg = $(this).css('background-image');
            var matches = backImg.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (matches) if($.inArray(matches[1], imgURLList) === -1) imgURLList.push(matches[1]);
            else {
                var backImg = $(this).css('background');
                var matches = backImg.match(/url\(['"]?([^'"]+)['"]?\)/);
                if (matches) if($.inArray(matches[1], imgURLList) === -1) imgURLList.push(matches[1]);
            }
        }
    });
    for(var i in imgURLList){
        if(typeof(imgURLList[i])==="undefined") continue;
        var a = document.createElement("a");
        a.href = imgURLList[i];
        imgURLList[i] = a.href;
    }
    return imgURLList;

};

var getAllAudioSrcs = function($body){
    var audioURLList = [];
    $body.find('audio').each(function(){
        if($.inArray($(this).attr('src'), audioURLList) === -1) audioURLList.push($(this).attr('src'));
    });
    for(var i in audioURLList){
        if(typeof(audioURLList[i])==="undefined") continue;
        var a = document.createElement("a");
        a.href = audioURLList[i];
        audioURLList[i] = a.href;
    }
    return audioURLList;
};

var getAllVideoSrcs = function($body){
    var videoURLList = [];
    $body.find('video').each(function(){
        if($.inArray($(this).attr('src'), videoURLList) === -1) videoURLList.push($(this).attr('src'));
    });
    for(var i in videoURLList){
        if(typeof(videoURLList[i])==="undefined") continue;
        var a = document.createElement("a");
        a.href = videoURLList[i];
        videoURLList[i] = a.href;
    }
    return videoURLList;
};

var extractURLsFromText = function(text) {
    var getAbsoluteURL = (function() {
        var a;

        return function(url) {
            if(!a) a = document.createElement('a');
            a.href = url;

            return a.href;
        };
    })();
    var possibleURLs = text.match(/(((http|https):\/\/)?(([A-Za-z0-9\-]+\.)+(com|net|org|gov|edu|mil|int|be|cl|fi|in|jp|nu|pt|pw|py|gl|ly|io|re|sa|se|su|tn|tr|io|de|cn|uk|info|nl|eu|ru)|((?<!.)[0-9]{1,3}\.){3}[0-9]{1,3})([?:/][A-Za-z0-9-._~:/?#@!$&()+;=%]*)?)(?=[\s'"<>])/gi);
    var urlList = possibleURLs;
    if(urlList===null) urlList = [];
    var urlListAbs = [];
    for(i in urlList) {
        if(typeof(urlList[i])==="undefined") continue;
        urlList[i] = removeLastExtraChar(urlList[i]);
        if(urlList[i].endsWith("&quot;")) urlList[i].slice(0,-6);
        urlListAbs.push(removeLastExtraChar(getAbsoluteURL(urlList[i])));
    }
    urlList = urlList.concat(urlListAbs);
    var urlListAll = [];
    $.each(urlList, function(i, el){
            if($.inArray(el, urlListAll) === -1 && !el.includes("externalSubmit")) urlListAll.push(el);
    });

    return urlListAll;
}

function getDashboardHITStatus(){
    function myParseInt(str){ return parseInt(str.replace(/,/g, '')); };
    function myParseFloat(str){ return parseFloat(str.replace(/,/g, '')); };
    return new Promise(function(resolve,reject){
        $.get({
            url: "https://worker.mturk.com/dashboard",
            success: function(data){
                var retData = {};
                retData["DASH:approved"] = myParseInt($(data).find("#dashboard-hits-overview>div>div>div").eq(0).children().eq(1).text());
                retData["DASH:approval_rate"] = myParseFloat($(data).find("#dashboard-hits-overview>div>div>div").eq(1).children().eq(1).text().slice(0,-1));
                retData["DASH:total_earnings"] = myParseFloat($(data).find("#dashboard-earnings-to-date>div>table .text-xs-right").eq(3).text().slice(1));
                resolve(retData);
            }
        });
    });
}

function getKeywordOccurrences($body){
    var text = getTextFromHTML($body);
    var tokens = text.split(" ");
    var keywords =
        ["minutes","minute","survey","instructions","turkprime.com",
         "research","participation","opinion","playback",
         "description","describe","click","qualify","comment","comments",
         "copy","paste","return","answer","summarize","identify",
         "watch","leave",
         "comprehension","read","example","image","design","note","type","bonus","video","questionnaires"];
    var occurrences = {};
    for(var i in keywords) occurrences["KW:"+keywords[i]] = 0;
    for(var i in tokens) {
        tokens[i] = tokens[i].toLowerCase();
        if ("KW:"+tokens[i] in occurrences) occurrences["KW:"+tokens[i]] = 1;
    }
    return occurrences;
}

var getTextFromHTML = function($body){
    function extractContent(html) {
        var retval =  (new DOMParser).parseFromString(html, "text/html") .  documentElement . textContent;
        if(retval!="undefined") return retval;
        else return "";
    }
    $body.find("script").remove();
    $body.find("style").remove();
    return extractContent($body.wrap("<div>").parent().html().replace(/>/g, "> ")).replace(/\s\s+/g, '   ');
};


