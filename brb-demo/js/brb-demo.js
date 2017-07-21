//We will load this values form URL vars 
//Example:
//https://www.myserver.com/ssai-demo.html?env=qa/st/pr&apikey=abcedfghijklmopq&app=abc63274623846246237864&jobid=abcd1234abcd1234abcd1234abcd1234

var apiKey = "";
var jobId = "";
var appName = "";

var playbackurl = "";

//PROD base url
var baseUrl = "https://api.bcovlive.io/v1";

function onLoadPage() {
    var url_vars = getUrlVars();

    console.log("URL detected vars = " + JSON.stringify(url_vars));

    //Use QA/ST env if is explicitly specified
    if ("env" in url_vars) {
        if (url_vars.env === "qa")
            baseUrl = "https://api-qa.a-live.io/v1";
        else if (url_vars.env === "st")
            baseUrl = "https://api-st.a-live.io/v1";
    }

    if ( (!("apikey" in url_vars)) || (!("jobid" in url_vars)) || (!("app" in url_vars)) ) {
        showInputParamsAlert();
    }
    else {
        apiKey = url_vars.apikey;
        jobId = url_vars.jobid;
        appName = url_vars.app;

        console.log("Detected params ApiUrl: " + baseUrl + ",apiKey: " + apiKey + ", JobId: " + jobId + ", App:" + appName);

        refreshJobIdApp();

        getJobData();
    }
}

function getUrlVars() {
    var vars = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
      vars[key] = value;
    });

    return vars;
}

function showInputParamsAlert() {
    showError("A problem has been occurred reading required data from querystring.Remember the URL format to use this page is:<br>MYSERVER.abc/brb-demo/index.html?env=qa/st/pr&apikey=abcedfghijklmopq&app=abc63274623846246237864&jobid=abcd1234abcd1234abcd1234abcd1234");
}

function showError (msg) {
    console.error(msg);

    document.getElementById("errMsg").innerHTML = msg;
    $('#errorAlert').fadeIn('slow');
}

function refreshJobIdApp () {
    document.getElementById("jobId").innerHTML = "Job id: " + jobId;
    document.getElementById("appId").innerHTML = "App: " + appName;
}

function refreshPlaybackUrl(url) {
    document.getElementById("playbackUrl").innerHTML = "Playback URL: " + url;
}

function injectAdBreakOnTC() {
    var adBreakDur_s = document.getElementById("adbreakDur").value;
    var server_data = parseAdServerData(document.getElementById("adbreakData").value);
    var tc = document.getElementById("adbreakTC").value;

    if (server_data === null) {
        showError("Wrong format in adserver data");
        return;
    }

    if (!isTCFormatted(tc)) {
        showError("Wrong format in TC");
        return;
    }

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

function isTCFormatted(str) {
    var ret = false;

    if (typeof (str) !== 'string')
        return ret;

    var patt = new RegExp('^([0-1][0-9]|[2][0-3]):([0-5][0-9]):([0-5][0-9]):([0-9]+)$');

    return patt.test(str);
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
    document.getElementById("injectAdBreak").disabled = !b;
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

function getJobData() {
    var url = baseUrl + "/jobs/" + jobId;

    $.ajax({
        url: url,
        method: 'GET',
        dataType: 'json',
        timeout: 20000,
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        data: "",

        success: function(data) {
            if ("errorType" in data) {
                return showError("Received from getting job data" + JSON.stringify(data.errorMessage));
            }

            if ( !("job" in data) || !("ssai_playback_urls" in data.job))
                return showError("getting ssai_playback_urls from job");

            if (appName == "") {
                console.log("Getting the default (first) app object");
                appName = Object.keys(data.job.ssai_playback_urls)[0];
            }

            if ( !(appName in data.job.ssai_playback_urls) )
                return showError("getting ssai playback url for app: " + appName);

            var app_data = data.job.ssai_playback_urls[appName];

            if ( !("playback_url" in app_data))
                return showError("getting playback url inside the app object: " + JSON.stringify(app_data));

            //Workaround to make it work in HTTPS
            playbackurl = translateHttps(app_data.playback_url);

            refreshPlaybackUrl(playbackurl);

            loadVideo(playbackurl, true);

            enableAdBreakinInjection(true);
        },
        error: function(msg) {
            return showError("Error getting job data: " + JSON.stringify(msg));
        }
    });
}

function isNumber(evt) {
    var regex = new RegExp("^[0-9]+$");
    var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
    if (!regex.test(key)) {
        event.preventDefault();
        return false;
    }
}

function isTCChar(event) {
    var regex = new RegExp("^[0-9:]+$");
    var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
    if (!regex.test(key)) {
        event.preventDefault();
        return false;
    }
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

    if (injected_list.childNodes.length > 0)
        injected_list.insertBefore(newAdBreak, injected_list.childNodes[0]);
    else
        injected_list.appendChild(newAdBreak);
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

function translateHttps (url) {
    return url.replace(/^http:/,'https:')
}