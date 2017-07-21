//We will load this values form URL vars
//Example:
//https://www.myserver.com/ssai-demo.html?env=qa/st/pr&apikey=abcedfghijklmopq&jobid=abcd1234abcd1234abcd1234abcd1234

var apiKey = "";
var jobId = "";

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

    if ( (!("apikey" in url_vars)) || (!("jobid" in url_vars)) ) {
        showInputParamsAlert();
    }
    else {
        apiKey = url_vars.apikey;
        jobId = url_vars.jobid;

        console.log("Detected params ApiUrl: " + baseUrl + ",apiKey: " + apiKey + ", JobId: " + jobId);

        refreshJobId();

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

function refreshJobId() {
    document.getElementById("jobId").innerHTML = "Job id: " + jobId;
}

function refreshPlaybackUrl(url) {
    document.getElementById("playbackUrl").innerHTML = "Playback URL: " + url;
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

            if ( !("job" in data) || !("playback_url" in data.job))
                return showError("getting default playbackurl from job");

            //Workaround to make it work in HTTPS
            playbackurl = translateHttps(data.job.playback_url);

            refreshPlaybackUrl(playbackurl);

            loadVideo(playbackurl, true);

            refreshPlayerTime();

            enableAdId3Injection(true);
        },
        error: function(msg) {
            return showError("Error getting job data: " + JSON.stringify(msg));

        }
    });
}

function loadVideo(url, play) {

    player.src({
        type: "application/x-mpegURL",
        src: url
    });
    console.log("Loaded playlist: " + url);

    setupMetadata();

    if (play == true) {
        player.play();
        console.log("Play!");
    }
    else {
        player.pause();
    }
}

function setupMetadata() {
    var textTracks = player.textTracks();

    textTracks.one('addtrack', function() {
        var tt = player.textTracks()[0];
        tt.mode = 'hidden';

        tt.oncuechange = function() {
            if (tt.activeCues[0] !== undefined)
                addID3TagToDetectedList(tt.activeCues[0]);
        }
    })
}

function convertAscii(asciiText) {
    var parts = asciiText.split(",");
    var res = "";
    for (var i = 0; i < parts.length; i++) {
        res += String.fromCharCode(parts[i]);
    }
    return res;
}

function addID3TagToDetectedList(data) {
    var detected_list = document.getElementById('detetedList');

    var newID3 = detected_list.insertRow(-1);

    var newID3_text = newID3.insertCell(0);

    var str = "id: " + data.id + ", ";
    str += data.value.key + ": " + convertAscii(data.text) + ", ";
    str += "startTime: " + data.startTime + ",  ";
    str += "endTime: " + data.endTime + "\n";

    newID3_text.innerHTML = str;

    if (detected_list.childNodes.length > 0)
        detected_list.insertBefore(newID3, detected_list.childNodes[0]);
    else
        detected_list.appendChild(newID3);
}

function enableAdId3Injection(b) {
    document.getElementById("injectID3").disabled = !b;
}

function injectID3() {
    var id3name = document.getElementById("adbreakId3Name").value;
    var id3value = document.getElementById("adbreakId3Value").value;

    if ( (typeof (id3name) !== 'string') || (id3name.trim().length !== 4) ) {
        showError("Wrong format in ID3 name, should be 4 chars long");
        return;
    }

    if ( (typeof (id3value) !== 'string') || (id3value.trim() === "" ) ) {
        showError("Wrong format in ID3 value, should be a not empty string");
        return;
    }

    enableAdId3Injection(false);

    sendInjectID3(id3name, id3value);
}

function injectID3OnTC() {
    var id3name = document.getElementById("adbreakId3Name").value;
    var id3value = document.getElementById("adbreakId3Value").value;
    var tc = document.getElementById("adbreakTC").value;

    if ( (typeof (id3name) !== 'string') || (id3name.trim().length !== 4) ) {
        showError("Wrong format in ID3 name, should be 4 chars long");
        return;
    }

    if ( (typeof (id3value) !== 'string') || (id3value.trim() === "" ) ) {
        showError("Wrong format in ID3 value, should be a not empty string");
        return;
    }

    if (!isTCFormatted(tc)) {
        showError("Wrong format in TC");
        return;
    }

    enableAdId3Injection(false);

    sendInjectID3(id3name, id3value, tc);
}

function sendInjectID3(id3name, id3value, tc) {
    var url = baseUrl + "/jobs/" + jobId + "/id3tag";

    var injectTime = Date.now();
    var inserted_tc = "";

    var body_data = {
        id3_tag: {
            name: id3name,
            value: id3value
        }
    };

    if (typeof (tc) === 'string') {
        body_data["id3_tag"]["timecode"] = tc;
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
                return showError("Received from sending id3tag" + JSON.stringify(data.errorMessage));
            }
            else {
                addID3TagToSentList(injectTime, inserted_tc, data);
            }

            enableAdId3Injection(true);
        },
        error: function(msg) {
            enableAdId3Injection(true);

            return showError("Error sending id3tag: " + JSON.stringify(msg));
        }
    });
}

function addID3TagToSentList(time, tc, data) {
    var injected_list = document.getElementById('injectedList');

    var newID3 = injected_list.insertRow(-1);

    var newID3_text = newID3.insertCell(0);

    //Create text
    var accuracy = "immediate";
    var label = "";
    var server_time = "";
    if ((typeof(tc) === 'string') && (tc.trim() !== "") ) {
        accuracy = "frame";
        server_time = tc;
        label = ". TC: ";
    }

    newID3_text.innerHTML = "Injected at: " + new Date(time).toISOString() + label + server_time + ". Accuracy: " + accuracy;

    if (injected_list.childNodes.length > 0)
        injected_list.insertBefore(newID3, injected_list.childNodes[0]);
    else
        injected_list.appendChild(newID3);
}

function showInputParamsAlert() {
    showError("A problem has been occurred reading required data from querystring.Remember the URL format to use this page is:<br>MYSERVER.abc/brb-demo/index.html?env=qa/st/pr&apikey=abcedfghijklmopq&jobid=abcd1234abcd1234abcd1234abcd1234");
}

function showError (msg) {
    console.error(msg);

    document.getElementById("errMsg").innerHTML = msg;
    $('#errorAlert').fadeIn('slow');
}

function translateHttps (url) {
    return url.replace(/^http:/,'https:')
}

function isTCChar(event) {
    var regex = new RegExp("^[0-9:]+$");
    var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
    if (!regex.test(key)) {
        event.preventDefault();
        return false;
    }
}

function isTCFormatted(str) {
    var ret = false;

    if (typeof (str) !== 'string')
        return ret;

    var patt = new RegExp('^([0-1][0-9]|[2][0-3]):([0-5][0-9]):([0-5][0-9]):([0-9]+)$');

    return patt.test(str);
}

function refreshPlayerTime() {
    document.getElementById("playerTime").removeAttribute("readonly");

    document.getElementById("playerTime").value = player.currentTime();

    document.getElementById("playerTime").setAttribute("readonly", true);

    setTimeout(refreshPlayerTime, 20.0);
}
