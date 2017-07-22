//We will load this values form URL vars 
//Example:
//https://www.myserver.com/ssai-demo.html?env=qa/st/pr&apikey=abcedfghijklmopq&app=abc63274623846246237864&jobid=abcd1234abcd1234abcd1234abcd1234

var apiKey = "";
var jobId = "";
var appId = "";

var playbackurl = "";

//PROD base url
var baseUrl = "";

function onLoadPage() {
    var url_vars = getUrlVars();

    console.log("URL detected vars = " + JSON.stringify(url_vars));

    baseUrl = getBaseUrlFromUrlVars(url_vars.env);

    if ( (!("apikey" in url_vars)) || (!("jobid" in url_vars)) || (!("app" in url_vars)) ) {
        showInputParamsAlert();
    }
    else {
        apiKey = url_vars.apikey;
        jobId = url_vars.jobid;
        appId = url_vars.app;

        console.log("Detected params ApiUrl: " + baseUrl + ",apiKey: " + apiKey + ", JobId: " + jobId + ", App:" + appId);

        refreshJobId(jobId);
        refreshAppId(appId);

        aliveGetJobData();
    }
}

function showInputParamsAlert() {
    showError("A problem has been occurred reading required data from querystring.Remember the URL format to use this page is:<br>MYSERVER.abc/brb-demo/index.html?env=qa/st/pr&apikey=abcedfghijklmopq&app=abc63274623846246237864&jobid=abcd1234abcd1234abcd1234abcd1234");
}

function refreshJobId (jobid) {
    refreshElementInnerHTML("jobId", "Job id: " + jobid);
}

function refreshAppId (appid) {
    refreshElementInnerHTML("appId", "App: " + appid);
}

function refreshPlaybackUrl(url) {
    refreshElementInnerHTML("playbackUrl", "Playback URL: " + url);
}

function injectAdBreakOnTC() {
    var adBreakDur_s = document.getElementById("adbreakDur").value;
    var server_data = parseAdServerData(document.getElementById("adbreakData").value);
    var tc = document.getElementById("adbreakTC").value;

    if (server_data === null)
        return showError("Wrong format in adserver data");

    if (!isTCFormatted(tc))
        return showError("Wrong format in TC");

    enableAdBreakinInjection(false);

    sendInjectAdBreak(adBreakDur_s, server_data, tc);
}

function injectAdBreak() {
    var adBreakDur_s = document.getElementById("adbreakDur").value;
    var server_data = parseAdServerData(document.getElementById("adbreakData").value);

    if (server_data === null) {
        showError("Wrong format in adserver data");
        return;
    }

    enableAdBreakinInjection(false);

    sendInjectAdBreak(adBreakDur_s, server_data);
}

function parseAdServerData(str) {
    var ret = null;

    if (typeof (str) !== 'string')
        return ret;

    if (str.trim() === "")
        return "";

    var vars = str.split(",");
    for (var i = 0; i < vars.length; i++) {
        var keyValueStr = vars[i];
        var keyValuePair = keyValueStr.split("=");
        if (keyValuePair.length === 2){
            var key = keyValuePair[0].trim();
            var value = keyValuePair[1];

            if (ret === null)
                ret = {};

            ret[key] = value;
        }
    }

    return ret;
}

function enableAdBreakinInjection(b) {
    enableElement("injectAdBreak", b);
}

function sendInjectAdBreak(adBreakDur_s, ad_server_data, tc) {
    var url = baseUrl + "/jobs/" + jobId + "/cuepoint";

    var injectTime = Date.now();
    var inserted_tc = "";

    var body_data = {
        duration: adBreakDur_s
    };

    if (typeof (ad_server_data) === 'object')
        body_data["ad_server_data"] = ad_server_data;

    if (typeof (tc) === 'string') {
        body_data["timecode"] = tc;
        inserted_tc = tc;
    }

    console.log("Sending to: " + baseUrl + ": " + JSON.stringify(body_data));

    $.ajax({
        url: url,
        method: 'POST',
        dataType: 'json',
        timeout: 20000,
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(body_data),

        success: function(data) {
            if ("errorType" in data) {
                return showError("Received from sending adbreak" + JSON.stringify(data.errorMessage));
            }
            else {
                addAdBreakToList(injectTime, inserted_tc, data);
            }

            enableAdBreakinInjection(true);
        },
        error: function(msg) {
            enableAdBreakinInjection(true);

            return showError("Error sending adBreak: " + JSON.stringify(msg));
        }
    });
}

function aliveGetJobData () {

    getJobData(baseUrl, jobId, function (err, data) {
        if (err)
            return showError(err);

        if (!("ssai_playback_urls" in data))
            return showError("getting ssai_playback_urls from job");

        if (appId === "") {
            console.log("Getting the default (first) app object");
            appId = Object.keys(data.ssai_playback_urls)[0];
        }

        if (!(appId in data.ssai_playback_urls) )
            return showError("getting ssai playback url for app: " + appId);

        var app_data = data.ssai_playback_urls[appId];

        if (!("playback_url" in app_data))
            return showError("getting playback url inside the app object: " + JSON.stringify(app_data));

        //Workaround to make it work in HTTPS
        playbackurl = translateHttps(app_data.playback_url);

        refreshPlaybackUrl(playbackurl);

        loadVideo(playbackurl, true);

        enableAdBreakinInjection(true);
    });
}

function addAdBreakToList(time, tc, data) {
    var injected_list = document.getElementById('injectedList');

    var newAdBreak = injected_list.insertRow(-1);

    var newAdBreak_text = newAdBreak.insertCell(0);

    var cue_point = {};
    if ("cue_point" in data)
        cue_point = data.cue_point;

    //Create text
    var duration_s = 0;
    if ("duration" in cue_point)
        duration_s = cue_point.duration;

    var server_time = "";
    if ("inserted_at" in cue_point)
        server_time = cue_point.inserted_at;

    var accuracy = "segment";
    var label = "Server Time: ";
    if (("accuracy" in cue_point) && (cue_point.accuracy === "frame")) {
        accuracy = "frame";
        server_time = tc;
        label = "TC: ";
    }

    newAdBreak_text.innerHTML = "Injected at: " + new Date(time).toISOString() + " (" + duration_s + "s). "+ label + server_time + ". Accuracy: " + accuracy;

    insertOnTopOfList(injected_list, newAdBreak);
}

function loadVideo(url, play) {

    player.src({
        type: "application/x-mpegURL",
        src: url
    });
    console.log("Loaded playlist: " + url);

    if (play == true) {
        player.play();
        console.log("Play!");
    }
    else {
        player.pause();
    }
}
