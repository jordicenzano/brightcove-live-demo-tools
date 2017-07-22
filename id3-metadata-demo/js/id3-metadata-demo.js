//We will load this values form URL vars
//Example:
//https://www.myserver.com/ssai-demo.html?env=qa/st/pr&apikey=abcedfghijklmopq&jobid=abcd1234abcd1234abcd1234abcd1234

var apiKey = "";
var jobId = "";

var playbackurl = "";

var baseUrl = "";

function onLoadPage() {
    var url_vars = getUrlVars();

    console.log("URL detected vars = " + JSON.stringify(url_vars));

    baseUrl = getBaseUrlFromUrlVars(url_vars.env);

    if ( (!("apikey" in url_vars)) || (!("jobid" in url_vars)) ) {
        showInputParamsAlert();
    }
    else {
        apiKey = url_vars.apikey;
        jobId = url_vars.jobid;

        console.log("Detected params ApiUrl: " + baseUrl + ",apiKey: " + apiKey + ", JobId: " + jobId);

        refreshJobId(jobId);

        aliveGetJobData();
    }
}

function refreshJobId(jobid) {
    refreshElementInnerHTML("jobId", "Job id: " + jobid);
}

function refreshPlaybackUrl(url) {
    refreshElementInnerHTML("playbackUrl", "Playback URL: " + url);
}

function aliveGetJobData () {
    getJobData(baseUrl, jobId, function (err, data) {
        if (err)
            return showError(err);

        if (!("playback_url" in data))
            return showError("getting default playbackurl from job");

        //Workaround to make it work in HTTPS
        playbackurl = translateHttps(data.playback_url);

        refreshPlaybackUrl(playbackurl);

        loadVideo(playbackurl, true);

        refreshPlayerTime();

        enableAdId3Injection(true);
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

    //Notify every time an textTrack is added
    textTracks.on('addtrack', function(obj) {
        if ("track" in obj) {
            var track = obj.track;

            //Ensure we get the correct track with ID3 timed metadata
            if ( ("label" in track) && (track.label.toLowerCase().indexOf("timed metadata") >= 0) ) {
                //Ensure track is hidden
                track.mode = 'hidden';

                //Add a listener every time the cue change
                track.oncuechange = function() {

                    if (track.activeCues[0] !== undefined)
                        addID3TagToDetectedList(track.activeCues[0]);
                }
            }
        }
    });
}

function addID3TagToDetectedList(data) {
    var detected_list = document.getElementById('detetedList');

    var newID3 = detected_list.insertRow(-1);

    var newID3_text = newID3.insertCell(0);

    newID3_text.innerHTML = "key: " + data.value.key + " (" + data.startTime + "-" + data.endTime + " : " + (data.endTime - data.startTime) + "s). data: " + convertAscii(data.value.data);

    insertOnTopOfList(detected_list, newID3);
}

function enableAdId3Injection(b) {
    enableElement("injectID3", b);
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

    if ( (typeof (id3name) !== 'string') || (id3name.trim().length !== 4) )
        return showError("Wrong format in ID3 name, should be 4 chars long");

    if ( (typeof (id3value) !== 'string') || (id3value.trim() === "" ) )
        return showError("Wrong format in ID3 value, should be a not empty string");

    if (!isTCFormatted(tc))
        return showError("Wrong format in TC");

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

    insertOnTopOfList(injected_list, newID3);
}

function showInputParamsAlert() {
    showError("A problem has been occurred reading required data from querystring.Remember the URL format to use this page is:<br>MYSERVER.abc/brb-demo/index.html?env=qa/st/pr&apikey=abcedfghijklmopq&jobid=abcd1234abcd1234abcd1234abcd1234");
}

function refreshPlayerTime() {
    refreshElementReadOnlyValue("playerTime", player.currentTime());

    setTimeout(refreshPlayerTime, 20.0);
}
