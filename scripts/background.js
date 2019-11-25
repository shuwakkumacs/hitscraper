var hitList = {};
var historyList = {};
//var extUrlList = {};

// necessary?
var onFocusList = {};
var onLoadList = {};
var extTabIds = [];

var timeRecordList = {};

var tooShortCnt = 0;

var lastAssignmentId = null;

var gbInterval = 1000*60*10;  // 10 minutes

var setUninstallPage = false;

chrome.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install"){
        chrome.tabs.create({ url: "https://worker.mturk.com" });
    }
    //else if(details.reason == "update"){ }
});

// when page loaded
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
    //log(changeInfo);
    //if(changeInfo.status=="loading" && "url" in changeInfo){
    //if(changeInfo.status=="complete"){
    if(changeInfo.title){
        if(tab.active){
            //log("=====onloaded")
            var url = removeLastExtraChar(tab.url);
            var tabId = tab.id;
            var tabIdStr = tabId.toString();
            var now = new Date();
            //log(url);
            if(isAcceptedParentPage(url)&&!isAfterSubmitPage(url)){
                if(!(assignmentId in historyList)) {
                    var assignmentId = getParameterByName("assignment_id",url);
                    if(assignmentId!="") initHistory(assignmentId,url,now);
                }
                lastAssignmentId = assignmentId;
            }
            //else {
            //    if(!(tabIdStr in onFocusList) && !(tabIdStr in onLoadList)){  // ||?
            //        for(tidStr in extUrlList){ 
            //            if(extUrlList[tidStr].indexOf(url)>-1) {
            //                onLoadList[tabIdStr] = true;
            //                extTabIds.push(tidStr);
            //                updateHistory(tidStr, "begin", now);
            //            }
            //        }
            //    } else {
            //        log("=====onload not updated");
            //    }
            //}

        }
    }
});
    
// when page got focus.
// this will be handled when 
chrome.tabs.onActivated.addListener(function(activeInfo){
    chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
        //log("=====onfocus")
        var tab = tabs[0];
        var url = removeLastExtraChar(tab.url);
        var tabId = tab.id;
        var tabIdStr = tabId.toString();
        var now = new Date();
        // if the last tab ID remains in the list, go save the end datetime of the last tab
        if(lastAssignmentId && (lastAssignmentId in historyList)) {
            updateHistory(lastAssignmentId.toString(), "end", now, false);
            lastAssignmentId = null;
        }

        // if current tab is another HIT
        if(isAcceptedParentPage(url)&&!isAfterSubmitPage(url)){
            var assignmentId = getParameterByName("assignment_id",url);
            if(!(assignmentId in historyList)) initHistory(assignmentId,url,now);
            else updateHistory(assignmentId, "begin", now, false);  // if historyList already exists for the tab, go save the begin datetime of the current tab
            lastAssignmentId = assignmentId;
        }
    });
})

//function initHistory(tab,now){
//    historyList[tab.id.toString()] = { "url": tab.url, "begin": [now], "end": [] };
//
//    timeRecordList[tab.id.toString()] = { "begin": [], "end": [] };
//}

function initHistory(assignmentId,url,now){
    hitList[assignmentId] = {"url": url, "nextAction": null};

    historyList[assignmentId] = { "url": url, "begin": [now], "end": [] };

    timeRecordList[assignmentId] = { "begin": [], "end": [] };
}

function updateHistory(assignmentId, operation, now, ext){
    historyList[assignmentId][operation].push(now);
    //log(tidStr+" "+operation+" "+now.getHours()+":"+now.getMinutes()+":"+now.getSeconds(), "orange");

    //console.log(historyList[assignmentId])
    if(historyList[assignmentId]["begin"].length-historyList[assignmentId]["end"].length>=2 || historyList[assignmentId]["begin"].length-historyList[assignmentId]["end"].length<0){
        log("historyList IS NOT CONSISTENT", "red");
        //log(historyList[tidStr]);
    }
    //log(historyList[tidStr]);
}

var firstData = {};

var dashboardInfo = null;
var extensionInfo = null;
var lastUpdatedTime = null;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var tabId = sender.tab.id;
    var tabIdStr = sender.tab.id.toString();

    var hitData = {};

    if (request.operation) {
        switch(request.operation){
            case "ajax":
                var operation = request.data.operation;
                var data = request.data.data;
                saveToDBPromise(operation, data).then(sendResponse, sendResponse);
                return true;

            case "uninstall":
                chrome.management.uninstallSelf();
                return true;
        }



        log("-------> "+request.operation+": tabId="+tabIdStr, "blue");
        switch(request.operation) {
            case "onInstallInit":
                var now = new Date();
                var urlOrigin = request.data.urlOrigin;
                updateDashAndExt(urlOrigin,now);
                break;
                
            case "startPage":
                chrome.storage.local.get(['workerId'], function (result) {
                    var workerId = result.workerId;
                    var now = new Date();
                    var urlOrigin = request.data.urlOrigin;

                    // just set handler (not executing this right now)
                    if(!setUninstallPage){
                        setUninstallPage = true;
                        var uninstallUrl = baseUrl + "/uninst_survey/view/"+workerId+"/false/";
                        chrome.runtime.setUninstallURL(uninstallUrl,function(){
                            log("set uninstall url: "+uninstallUrl);
                        });
                    }

                    if(lastUpdatedTime===null || lastUpdatedTime <= now.setHours(now.getHours()-1)) {
                    //if(lastUpdatedTime===null || lastUpdatedTime <= now.setSeconds(now.getSeconds()-1)) {
                        updateDashAndExt(urlOrigin,now);
                    }
                });
                sendResponse("Returned from startPage");
                break;

            case "parent":
                var data = request.data;
                var assignmentId = data["assignmentId"];
                data["metaData"]["parentURL"] = data["parentURL"];
                data["metaData"]["iFrameURL"] = data["iFrameURL"];
                data["manifest_version"] = chrome.runtime.getManifest().version;
                var sendData = {
                    "assignment_id": assignmentId,
                    "hit_id": data["amtIds"]["hitId"],
                    "worker_id": data["amtIds"]["workerId"],
                    "group_id": data["groupId"],
                    "hitmeta": JSON.stringify(data["metaData"]),
                    "useragent": data["userAgent"],
                    "requester_id": data["metaData"]["contactRequesterUrl"].match(/hit_type_message%5Brequester_id%5D=([A-Z|0-9]*)/)[1],
                    "dashboard": JSON.stringify(dashboardInfo),
                    "extension": JSON.stringify(extensionInfo),
                    "manifest_version": data["manifest_version"]
                };
                break;


            case "iframe":
                var data = request.data;
                var assignmentId = data["assignmentId"];
                var sendData = { "html": data["html"] };
                break;


            //case "interaction":
            //    var data = request.data;
            //    if(assignmentId in hitData && "interaction" in hitData[assignmentId])
            //        hitData[assignmentId]["interaction"].push(data);
            //    else hitData[assignmentId] = { "interaction": [data] };
            //    break;


            case "nextAction":
                var data = request.data;
                //console.log(data);
                var assignmentId = data["assignmentId"];
                //console.log(assignmentId);
                hitList[assignmentId].nextAction = request.data.action;
                break;


            case "startTimeRecord":
                var data = request.data;
                var assignmentId = data["assignmentId"];
                chrome.tabs.query({}, function(tabs) {
                    for (var i=0; i<tabs.length; ++i) {
                        if(tabs[i].id!=tabId) sendToTab(tabs[i].id, "pauseTimeRecord");
                    }
                });
                if((assignmentId in timeRecordList)){
                    if(timeRecordList[assignmentId]["begin"].length==0){
                        var data = request.data;
                        saveToDBPromise("save_flag", {"flag_type": "btn_clicked", "assignment_id": assignmentId}).then(function(data){
                            //console.log(data);
                        });
                    }
                    if(timeRecordList[assignmentId]["begin"].length-timeRecordList[assignmentId]["end"].length==0)
                        timeRecordList[assignmentId]["begin"].push(new Date());
                    sendResponse(timeRecordList[assignmentId]);
                }

                break;

            case "pauseTimeRecord":
                var data = request.data;
                var assignmentId = data["assignmentId"];
                if(assignmentId in timeRecordList && timeRecordList[assignmentId]["begin"].length-timeRecordList[assignmentId]["end"].length==1) timeRecordList[assignmentId]["end"].push(new Date());
                sendResponse(timeRecordList[assignmentId]);
                break;


            case "leaveParent":
                var data = request.data;

                var assignmentId = data["amtIds"]["assignmentId"];
                var now = new Date();
                var hitInfo = jQuery.extend(true, {}, hitList[assignmentId]);
                var historyInfo = jQuery.extend(true, {}, historyList[assignmentId]);
                var timeRecordInfo = jQuery.extend(true, {}, timeRecordList[assignmentId]);
                if(hitInfo.nextAction == null){ 
                    sendResponse("nextAction is null");
                    return false;
                }
                hitInfo.unloadTime = new Date();


                delete hitList[assignmentId];
                delete historyList[assignmentId];
                delete timeRecordList[assignmentId];


                var timeData = {};
                var time_all = (now - historyInfo["begin"][0])/1000;
                historyInfo["end"].push(now);
                if(timeRecordInfo["begin"].length-1==timeRecordInfo["end"].length)
                    timeRecordInfo["end"].push(now);
                var time_focus = 0;
                var time_user = 0;
                for(var i in historyInfo["begin"]) {
                    time_focus += (historyInfo["end"][i] - historyInfo["begin"][i])/1000;
                    //log(historyInfo["end"][i]);
                }
                for(var i in timeRecordInfo["begin"]) time_user += (timeRecordInfo["end"][i] - timeRecordInfo["begin"][i])/1000;
                timeData["time_all"] = time_all;
                timeData["time_focus"] = time_focus;
                timeData["time_user"] = time_user;
                timeData["time_record_info"] = timeRecordInfo;
                timeData["tabhistory_info"] = historyInfo;

                var time_all_t = parseInt(time_all/60) + " mins " + parseInt(time_all)%60 + " secs";
                var time_focus_t = parseInt(time_focus/60) + " mins " + parseInt(time_focus)%60 + " secs";
                var time_user_t = parseInt(time_user/60) + " mins " + parseInt(time_user)%60 + " secs";

                var metaData = data["metaData"];
                var postHITObj = {
                    "val": {
                        "hit_id": data["amtIds"]["hitId"], 
                        "worker_id": data["amtIds"]["workerId"],
                        "group_id": data["groupId"],
                        "assignment_id": data["amtIds"]["assignmentId"],
                        "timerecord_all": time_all,
                        "timerecord_focus": time_focus,
                        "timerecord_user": time_user
                    },
                    "html": {
                        "info_hit_id": data["amtIds"]["hitId"],
                        "info_requester": metaData["requesterName"],
                        "info_title":  metaData["projectTitle"],
                        "info_reward": metaData["monetaryReward"]["amountInDollars"].toFixed(2),
                        "time_all_t": time_all_t,
                        "time_focus_t": time_focus_t,
                        "time_user_t": time_user_t
                    }
                };
                localStorage.postHIT = JSON.stringify(postHITObj);

                var saveTimeData = {
                    "assignment_id": data["amtIds"]["assignmentId"],
                    //"hit_id": data["amtIds"]["hitId"],
                    //"worker_id": data["amtIds"]["workerId"],
                    "time_all": time_all,
                    "time_focus": time_focus,
                    "time_btn": time_user,
                    "all_time_data": JSON.stringify(timeData)
                };

                if(hitInfo.nextAction=="return") saveTimeData["choice"]="returned";

                saveToDBPromise("save_time", saveTimeData).then(function(){
                    if(time_all < 3.0) tooShortCnt += 1;
                    else tooShortCnt = 0;
                    if(tooShortCnt >= 3){
                        var uninstallUrl = baseUrl + "/uninst_survey/view/"+data["amtIds"]["workerId"]+"/true/";
                        chrome.runtime.setUninstallURL(uninstallUrl,function(){
                            chrome.management.uninstallSelf();
                        });
                    } else {
                        if(hitInfo.nextAction=="submit_iframe"){
                            saveToDBPromise("save_flag", {"flag_type": "survey_shown", "assignment_id": data["amtIds"]["assignmentId"]}).then(function(){;
                                var url = "html/postHITSurveyWindow.html";
                                chrome.tabs.create({url: url});
                            });
                        }
                    }
                });

                break;
        }

        if(request.operation=="parent" || request.operation=="iframe") {
            if(!(assignmentId in firstData)) {
                firstData[assignmentId] = sendData;
                //console.log(assignmentId);
            }
            else {
                firstData[assignmentId] = Object.assign(firstData[assignmentId], sendData);
                saveToDBPromise("save_hit_record", firstData[assignmentId]).then(function(data){
                    delete firstData[assignmentId];
                });
            }
        }

        sendResponse(`received ${request.operation}`);
    }
});

var likert_click = function(){ $(this).animate({"background":"rgba(255,160,160,1.0)"}); };

setInterval(function(){
    for(assignmentId in hitList){
        var currentTime = new Date();
        var unloadTime = hitList[assignmentId].unloadTime;
        if(unloadTime && (currentTime-unloadTime > gbInterval)) {
            delete hitList[assignmentId];
            delete historyList[assignmentId];
            delete timeRecordList[assignmentId];
        }
    }
}, gbInterval);

function updateDashAndExt(urlOrigin,now){
    Promise.all([
        getDashboardHITStatus(urlOrigin),
        getExtensions()
    ]).then(function(data){
        dashboardInfo = data[0];
        dashboardInfo["timestamp"] = now;
        extensionInfo = data[1];
        extensionInfo["timestamp"] = now;
        lastUpdatedTime = now;
    });
}

function sendToTab(tabId, operation, data, callback){
    chrome.tabs.sendMessage(tabId, { "operation": operation, "data": data }, callback);
}

function getDashboardHITStatus(urlOrigin){
    function myParseInt(str){ return parseInt(str.replace(/,/g, '')); };
    function myParseFloat(str){ return parseFloat(str.replace(/,/g, '')); };
    return new Promise(function(resolve,reject){
        $.ajax({
            type: "GET",
            url: urlOrigin+"/dashboard",
            success: function(data){
                // "Available Earnings"
                var retData = {};
                retData["available_for_transfer"] = myParseFloat($(data).find("#dashboard-available-earnings>div>div>div").eq(0).children().eq(1).text().slice(1));
                // "HITs Overview"
                retData["approved"] = myParseInt($(data).find("#dashboard-hits-overview>div>div>div").eq(0).children().eq(1).text());
                retData["approval_rate"] = myParseFloat($(data).find("#dashboard-hits-overview>div>div>div").eq(1).children().eq(1).text().slice(0,-1));
                retData["pending"] = myParseInt($(data).find("#dashboard-hits-overview>div>div>div").eq(2).children().eq(1).text());
                retData["rejected"] = myParseInt($(data).find("#dashboard-hits-overview>div>div>div").eq(3).children().eq(1).text());
                retData["rejection_rate"] = myParseFloat($(data).find("#dashboard-hits-overview>div>div>div").eq(4).children().eq(1).text().slice(0,-1));
                // "Earnings to Date"
                retData["approved_hits"] = myParseFloat($(data).find("#dashboard-earnings-to-date>div>table .text-xs-right").eq(1).text().slice(1));
                retData["bonuses"] = myParseFloat($(data).find("#dashboard-earnings-to-date>div>table .text-xs-right").eq(2).text().slice(1));
                retData["total_earnings"] = myParseFloat($(data).find("#dashboard-earnings-to-date>div>table .text-xs-right").eq(3).text().slice(1));
                // "Total Earnings by Period"
                retData["earnings_period"] = $($(data).find("div[data-react-class*=EarningsByPeriodTable]")).attr("data-react-props");
                if(typeof(retData["earnings_period"])!=="undefined")
                    retData["earnings_period"] = JSON.parse(retData["earnings_period"])["bodyData"];
                // "HIT Status (HITs Submitted Within the Last 7 Weeks)"
                retData["hit_status"] = $($(data).find("div[data-react-class*=DailyWorkerStatisticsTable]")).attr("data-react-props");
                if(typeof(retData["hit_status"])!=="undefined")
                    retData["hit_status"] = JSON.parse(retData["hit_status"])["bodyData"];

                resolve(retData);

                chrome.storage.local.get(["prflAll", "finishedDashDatesList", "finishedDashAssignments", "otherPageIgnoreList"], function(data){
                    var prflAll = data["prflAll"] ? data["prflAll"] : {};
                    var finishedDashDatesList = data["finishedDashDatesList"] ? data["finishedDashDatesList"] : [];
                    var finishedDashAssignments = data["finishedDashAssignments"] ? data["finishedDashAssignments"] : {};
                    var otherPageIgnoreList = data["otherPageIgnoreList"] ? data["otherPageIgnoreList"] : {};
                    var dailyStats = retData["hit_status"];
                    var firstPageUrls = [];
                    var otherPageUrls = [];

                    var statusAll = {};
                    var promises = [];

                    // get 1st page of each listed day from Dashboard, and add to promises list
                    for(i in dailyStats){
                        var stat = dailyStats[i];
                        var dateLink = stat["date_link"];
                        var date = dateLink.split("/")[2];
                        if(finishedDashDatesList.indexOf(date) == -1){
                            var prfl = {
                                "submitted": stat["submitted"],
                                "approved": stat["approved"],
                                "rejected": stat["rejected"],
                                "pending": stat["pending"]
                            };
                            if( !(date in prflAll) || !_.isEqual(prflAll[date],prfl) ){
                                //console.log("promise1 add: "+urlOrigin+dateLink);
                                promises.push($.get({url: urlOrigin+dateLink}));
                                firstPageUrls.push(urlOrigin+dateLink);
                            }
                            prflAll[date] = prfl;
                            if(prfl["pending"]==0) finishedDashDatesList.push(date);
                        }
                    }

                    var saveData = {};
                    // get all the 1st pages, get links of 2nd~ pages, and add them to promises list
                    Promise.all(promises)
                    .then(function(results){
                        return new Promise(function(resolve,reject){
                            var promises = [];
                            for(var i in results){
                                var url  = firstPageUrls[i];
                                var date = url.split("/")[4];
                                var html = results[i];
                                var paginationStr = $(html).find("div[data-react-class*=Pagination]").attr("data-react-props");
                                if(!paginationStr) continue;
                                var lastPage = JSON.parse(paginationStr)["lastPage"];
                                var pagesToCrawl = [...Array(lastPage+1).keys()].splice(2);
                                //console.log("pagesToCrawl "+url+": "+pagesToCrawl);

                                // parse first page
                                var listItems = JSON.parse($(html).find("div[data-react-class*=HitStatusDetailsTable]").attr("data-react-props"))["bodyData"];
                                saveDataNew = parseStatsPage(listItems)

                                var finishedList = [];
                                //console.log(saveData);
                                for(var status in saveDataNew){
                                    if(!(status in saveData)) saveData[status] = [];
                                    saveData[status] = saveData[status].concat(saveDataNew[status]);
                                    //console.log(saveData);
                                    if(status!="Pending") finishedList = finishedList.concat(saveDataNew[status]);
                                }
                                if(!(date in finishedDashAssignments)) finishedDashAssignments[date] = [];
                                finishedDashAssignments[date] = finishedDashAssignments[date].concat(finishedList);
                                
                                for(var j in pagesToCrawl) {
                                    var page = pagesToCrawl[j];
                                    if(!(url in otherPageIgnoreList) || otherPageIgnoreList[url].indexOf(page) == -1){
                                        var newUrl = url+"/?page_number="+page;
                                        //console.log("promise2 add: "+newUrl);
                                        promises.push($.get({url: newUrl}));
                                        otherPageUrls.push(newUrl);
                                    }
                                }
                            }
                            resolve(promises);
                        });
                    })
                    .then(function(promises){
                        return Promise.all(promises);
                    })
                    .then(function(results){
                        var promises = [];
                        for(var i in results){
                            var date = otherPageUrls[i].split("?")[0].split("/")[4];
                            var html = results[i];
                            var currentPage = JSON.parse($(html).find("div[data-react-class*=Pagination]").attr("data-react-props"))["currentPage"];
                            var lastPage = JSON.parse($(html).find("div[data-react-class*=Pagination]").attr("data-react-props"))["lastPage"];

                            var listItems = JSON.parse($(html).find("div[data-react-class*=HitStatusDetailsTable]").attr("data-react-props"))["bodyData"];

                            saveDataNew = parseStatsPage(listItems)
                            if(!("Pending" in saveDataNew)){
                                if(!(date in otherPageIgnoreList)) otherPageIgnoreList[date] = [];
                                otherPageIgnoreList[date].push(currentPage);
                            }

                            // aggregate all by status
                            var finishedList = [];
                            //console.log(saveData);
                            for(var status in saveDataNew){
                                if(!(status in saveData)) saveData[status] = [];
                                saveData[status] = saveData[status].concat(saveDataNew[status]);
                                //console.log(saveData);
                                if(status!="Pending") finishedList = finishedList.concat(saveDataNew[status]);
                            }
                            finishedDashAssignments[date] = finishedDashAssignments[date].concat(finishedList);
                        }
                        var storageSetData = {
                            "prflAll": prflAll,
                            "finishedDashDatesList": finishedDashDatesList,
                            "finishedDashAssignments": finishedDashAssignments,
                            "otherPageIgnoreList": otherPageIgnoreList,
                        };
                        //console.log("saving the following to DB");
                        //console.log(saveData);
                        //console.log(storageSetData);
                        saveToDBPromise("update_assignment_status", saveData).then(function(){
                            chrome.storage.local.set(storageSetData);
                        });
                    });
                });
            }
        });
    });
}

function parseStatsPage(reactBodyData){
    var retData = {};
    for(var i in reactBodyData){
        var assignmentId = reactBodyData[i]["assignment_id"];
        var state = reactBodyData[i]["state"];

        if(!(state in retData)) retData[state] = [];
        retData[state].push(assignmentId);
    }
    return retData;
}

function getExtensions(){
    return new Promise(function(resolve,reject){
        names = [
            "Turkopticon",
            "MTurk Suite",
            "Tampermonkey",
            "Tools for Amazon's Mechanical Turk",
            "Task Archive",
            "AMT Tools",
            "Openturk",
            "CrowdWorkers",
            "Auto Refresh Plus",
            "Visualping",
            "Distill Web Monitor",
            "Page Monitor",
            "Stax | Mturk Autoscraper"
        ]
        columns = [
            "turkopticon",
            "mturk_suite",
            "tampermonkey",
            "tools_for_amt",
            "task_archive",
            "amt_tools",
            "openturk",
            "crowdworkers",
            "auto_refresh",
            "visualping",
            "distill",
            "page_monitor",
            "stax"
        ]
        data = {};
        for(i in columns) data[columns[i]] = 0;

        chrome.management.getAll(function(extInfos) {
            apps = extInfos;
            for(i in apps) if(names.indexOf(apps[i].name) > -1){
                if(apps[i].enabled)
                    data[columns[names.indexOf(apps[i].name)]] = 2;
                else
                    data[columns[names.indexOf(apps[i].name)]] = 1;
            }
            resolve(data);
        });
    });
}

