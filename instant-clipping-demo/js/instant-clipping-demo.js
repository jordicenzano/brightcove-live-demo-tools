//We will load this values form URL vars
//Example:
//https://www.myserver.com/X-demo.html?env=qa/st/pr&apikey=abcedfghijklmopq&jobid=abcd1234abcd1234abcd1234abcd1234

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

        enableCreateInstantVod(true);
    });
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

function enableCreateInstantVod(b) {
    enableElement("createClip", b);
}

function createClip() {
    var duration_s_str = document.getElementById("clipDuration").value;
    var label = document.getElementById("clipLabel").value;

    var duration_s = parseInt(duration_s_str);
    if ( (Number.isNaN(duration_s)) || (duration_s <= 0) )
        return showError("Wrong duration");

    if ( (typeof (label) !== 'string') || (label.trim() === "") )
        return showError("Wrong label format, or empty label");

    enableCreateInstantVod(false);

    sendCreateClip(label, duration_s);
}

function createClipTime() {
    var clipInUtc = document.getElementById("clipDateInUTC").value;
    var clipOutUtc = document.getElementById("clipDateOutUTC").value;
    var label = document.getElementById("clipLabel").value;

    var clipInUtc_epoch_s = formattedDateToEpochs(clipInUtc);
    if (clipInUtc_epoch_s === null)
        return showError("Wrong format trim in date");

    var clipOutUtc_epoch_s = formattedDateToEpochs(clipOutUtc);
    if (clipOutUtc_epoch_s === null)
        return showError("Wrong format trim out date");

    if (clipOutUtc_epoch_s <= clipInUtc_epoch_s)
        return showError("Date out should be > Date in");

    if ( (typeof (label) !== 'string') || (label.trim() === "") )
        return showError("Wrong label format, or empty label");

    enableCreateInstantVod(false);

    sendCreateClip(label, 0, clipInUtc_epoch_s, clipOutUtc_epoch_s);
}

function sendCreateClip(label, clipDuration_s, clipInUtc_epoch_s, clipOutUtc_epoch_s) {
    var url = baseUrl + "/ivods";

    var created_at = Date.now();

    var body_data = {
        live_job_id: jobId,
        outputs: [{
            "label": label
        }]
    };

    if ((typeof (clipInUtc_epoch_s) === 'number') && ((typeof (clipOutUtc_epoch_s) === 'number'))) {
        body_data.outputs[0].start_time = clipInUtc_epoch_s;
        body_data.outputs[0].end_time = clipOutUtc_epoch_s;
    }
    else {
        body_data.outputs[0].duration = clipDuration_s;
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
                return showError("Received from creating instant VOD" + JSON.stringify(data.errorMessage));
            }
            else {
                addInstantVODToClipsList(created_at, data);
            }

            enableCreateInstantVod(true);
        },
        error: function(msg) {
            enableCreateInstantVod(true);

            return showError("Error creating instant VOD: " + JSON.stringify(msg));
        }
    });
}

function addInstantVODToClipsList(created_at, data) {
    var createdClips_list = document.getElementById('createdClips');

    var newClip = createdClips_list.insertRow(-1);

    var newClip_text = newClip.insertCell(0);

    if ( (!("vod_jobs" in data)) || (!Array.isArray(data.vod_jobs)) || (data.vod_jobs.length <= 0) )
        return showError("Malformed ivod object in the response");

    var vod = data.vod_jobs[0];
    if ((!("playback_urls" in vod)) || (!("playback_url" in vod.playback_urls)) || (!("clip_duration") in vod))
        return showError("Malformed playback_urls object in the response");

    var duration = vod.clip_duration;
    var url = translateHttps(vod.playback_urls.playback_url);

    var link = "play.html?playback=" + url;

    newClip_text.innerHTML = new Date(created_at).toISOString() + " (" + duration + "s) - " + '<a href=' + link + ' target="_blank"> PLAY </a>';

    insertOnTopOfList(createdClips_list, newClip);
}

function showInputParamsAlert() {
    showError("A problem has been occurred reading required data from querystring.Remember the URL format to use this page is:<br>MYSERVER.abc/instant-clipping-demo/index.html?env=qa/st/pr&apikey=abcedfghijklmopq&jobid=abcd1234abcd1234abcd1234abcd1234");
}
