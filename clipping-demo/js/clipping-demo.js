//We will load this values form URL vars 
//Example:
//https://www.myserver.com/clip_demo_prod.html?env=qa&apikey=abcedfghijklmopq&vccreds=VCcreds&jobid=abcd1234abcd1234abcd1234abcd1234

var apiKey = "";
var jobId = "";
var videocloud_cred = "";

var playbackurl = "";

var baseUrl = "";

//Global control
var gl_job = {
    "job_id:": "",
    "gl_live_playlist": "",

    "gl_vod_playlist": "",
    "gl_vod_current_deleted_duration_s": 0.0
};

function onLoadPage() {
    var url_vars = getUrlVars();

    console.log("URL detected vars = " + JSON.stringify(url_vars));

    baseUrl = getBaseUrlFromUrlVars(url_vars.env);

    if ( (!("apikey" in url_vars)) || (!("jobid" in url_vars)) || (!("vccreds" in url_vars)) ) {
        showInputParamsAlert();
    }
    else {
        apiKey = url_vars.apikey;
        jobId = url_vars.jobid;
        videocloud_cred = url_vars.vccreds;

        console.log("Detected params ApiUrl: " + baseUrl + ",apiKey: " + apiKey + ", JobId: " + jobId + ", vccreds: " + videocloud_cred);

        refreshJobId(jobId);
        refreshVCreds(videocloud_cred);

        loadPlaylist("live");
    }
}

function showInputParamsAlert() {
    showError("A problem has been occurred reading required data from querystring.Remember the URL format to use this page is:<br>MYSERVER.abc/brb-demo/index.html?env=qa/st/pr&apikey=abcedfghijklmopq&jobid=abcd1234abcd1234abcd1234abcd1234&vccreds=VCcreds");
}

function refreshJobId(jobid) {
    refreshElementInnerHTML("jobId", "Job id: " + jobid);
}

function refreshVCreds(vccreds) {
    refreshElementInnerHTML("vccreds", "VC credentials name: " + videocloud_cred);
}

function loadVideoWithTimer(url, play) {

    player.src({
        type: "application/x-mpegURL",
        src: url
    });
    console.log("Loaded playlist: " + url);

    if (play == true) {
        player.play();
        console.log("Play!");
    }
}

function getVodStatus(jvod_id, clip_name) {
    var url = baseUrl + "/ui/jobs/vod/" + jvod_id;

    $.ajax({
        url: url,
        method: 'GET',
        dataType: 'json',
        timeout: 15000,
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        data: "",
        success: function(data) {
            if ("errorType" in data) {
                return showError(JSON.stringify(data));
            }
            else {
                var status = data.vod.jvod_state;

                console.log("Status = " + status);
                refreshElementReadOnlyValue(jvod_id + "_status", status);

                if (status == "creating_asset") {
                    console.log("status: creating_asset (available in S3!)");

                    setTimeout( function() { getVodStatus(jvod_id, clip_name); }, 2000);
                }
                else if (status == "finished") {
                    console.log("status: finished (Preview in VC available!)");
                }
                else if (status == "failed") {
                    console.log("ERROR !!! VOD Failed");
                }
                else {
                    setTimeout( function() { getVodStatus(jvod_id, clip_name); }, 2000);
                }
            }
        },
        error: function(msg) {
            return showError(JSON.stringify(msg));
        }
    });
}

function refreshVodStatus(jvod_id, clip_name) {
    var clip_list = document.getElementById('clipsList');

    var newclip = clip_list.insertRow(-1);

    var newclip_name = newclip.insertCell(0);
    var newclip_status = newclip.insertCell(1);

    newclip_name.innerHTML = ""+clip_name;

    var newclip_status_label = document.createElement('input');
    newclip_status_label.setAttribute('style', "width:150px");
    newclip_status_label.setAttribute('id', jvod_id+"_status");
    newclip_status_label.setAttribute('readonly', true);
    newclip_status_label.setAttribute('value', "waiting");
    newclip_status.appendChild(newclip_status_label);

    newclip.setAttribute('id', jvod_id);

    insertOnTopOfList(clip_list, newclip);

    getVodStatus(jvod_id, clip_name);
}

function createVod() {
    var url = baseUrl + "/vods";

    var in_time_s = timeStrToSeconds(document.getElementById('set_in_time').value);
    var in_total_deleted = parseFloat(document.getElementById('totaldetetedin').value);
    var set_in_time_s = in_time_s + in_total_deleted;
    console.log("Compensating IN point. In stream: " + in_time_s + ". Total deleted: " + in_total_deleted + ". Result: " + set_in_time_s);

    var out_time_s = timeStrToSeconds(document.getElementById('set_out_time').value);
    var out_total_deleted = parseFloat(document.getElementById('totaldetetedout').value);
    var set_out_time_s = out_time_s + out_total_deleted;
    console.log("Compensating OUT point. In stream: " + out_time_s + ". Total deleted: " + out_total_deleted + ". Result: " + set_out_time_s);

    var clip_name = document.getElementById('clip_name').value;
    var clip_tags = document.getElementById('clip_tags').value;

    if(clip_name.trim() === "")
        return showError("Clip Name can not be empty");

    var clip_tags_arr = clip_tags.split(",");

    var data = {
        "live_job_id": jobId,
        "outputs": [{
            "stream_start_time": set_in_time_s,
            "stream_end_time": set_out_time_s,
            "credentials": videocloud_cred,
            "videocloud": {
                "video": {
                    "name": clip_name,
                    "tags": clip_tags_arr
                },
                "ingest": { }
            }
        }]
    };

    console.log("JVOD req: " + JSON.stringify(data));

    $.ajax({
        url: url,
        method: 'POST',
        dataType: 'json',
        timeout: 25000,
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(data),
        success: function(data) {
            if ("errorType" in data) {
                showError(JSON.stringify(data));
            }
            else {
                console.log("Create Vod success - " + data.vod_jobs[0].jvod_id);
                refreshVodStatus(data.vod_jobs[0].jvod_id, clip_name);
            }
        },
        error: function(msg) {
            showError(JSON.stringify(msg));
        }
    });
}

function loadPlaylist(liveOrVod) {
    //This request uses and old EP and SHOULD NOT BE USED IN PROD
    var url = baseUrl + "/ui/jobs/live/" + jobId;

    //If we already have the playlist value use it do not ask again, they won't change
    if(liveOrVod === "live") {
        if ( (gl_job.gl_live_playlist != "") && (jobId == gl_job.job_id) ) {
            return loadVideoWithTimer(gl_job.gl_live_playlist, true);
        }
    }
    else {
        if ( (gl_job.gl_vod_playlist != "") && ( jobId == gl_job.job_id) ) {
            return loadVideoWithTimer(gl_job.gl_vod_playlist, true);
        }
    }

    $.ajax({
        url: url,
        method: 'GET',
        dataType: 'json',
        timeout: 15000,
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        data: "",
        success: function(data) {
            if ("errorType" in data) {
                return showError(JSON.stringify(data));
            }
            else {
                if ( ("job_playlists" in data.job) && ("job_outputs" in data.job) && (data.job.job_outputs.length > 0) ) {
                    console.log("Selecting the VOD chunklist. Number of renditions: " + data.job.job_outputs.length);

                    var out = getHighestQualityVODUsageRendition(data.job.job_outputs, data.job.job_playlists);

                    gl_job.gl_live_playlist = translateHttps(out.playback_url);
                    gl_job.gl_vod_playlist = translateHttps(out.playback_url_vod);
                    gl_job.job_id =  data.job.job_id;

                    if (liveOrVod === "live")
                        loadVideoWithTimer(gl_job.gl_live_playlist, true);
                    else
                        loadVideoWithTimer(gl_job.gl_vod_playlist, true);

                    if (!("job_playback_url" in data.job))
                        return showError("getting default playback_url from job");

                    //Workaround to make it work in HTTPS
                    playbackurl = translateHttps(data.job.job_playback_url);

                    refreshPlaybackUrl(playbackurl);
                }
                else {
                    return showError("Error getting job information (id, playback urls)");
                }
            }
        },
        error: function(msg) {
            return showError(JSON.stringify(msg));
        }
    });
}

function refreshPlaybackUrl(url) {
    refreshElementInnerHTML("playbackUrl",  "Playback URL: " + url);
}

function playLive() {
    loadPlaylist("live");

    $("#set_in_time_btn").prop("disabled", true);
    $("#set_out_time_btn").prop("disabled", true);

    type = "live";
    if (!timerSpinning) {
        timerSpinning = true;
        refreshTimer();
    }
}

function playVod() {
    loadPlaylist("vod");

    $("#set_in_time_btn").prop("disabled", false);
    $("#set_out_time_btn").prop("disabled", false);

    type = "vod";
    player.on("loadeddata", goToEndOfVod);
    if (!timerSpinning) {
        timerSpinning = true;
        refreshTimer();
    }
}

function goToEndOfVod() {
    player.off("loadeddata");

    //Set deleted duration for this playlist
    //This line works because we MODIFIED THE PLAYER (VideoJS) to read the tag #VOD-TOTALDELETEDDURATION
    gl_job.gl_vod_current_deleted_duration_s = player.tech_.hls.playlists.media().totalDeletedDuration;

    console.log("goToEndOfVod");
    var duration = player.duration();
    var goto_ts = Math.max(0, duration - 10.0);

    //Uncomment this line to automatic goto the end (-10s) when click DVR
    //player.currentTime(goto_ts); // wind to the end of VOD

    console.log("Deleted duration: " + gl_job.gl_vod_current_deleted_duration_s + ". Current time: " + player.currentTime() + ". Duration: " + duration + ". Goto pos: " + goto_ts);
}

function refreshTimer() {
    refreshElementReadOnlyValue("playerTime", type === "live" ? "--:--:--" : secondsToTimeStr(player.currentTime()));
    setTimeout(refreshTimer, 250.0);
}

function assignCurrentTimeToSetInTime() {
    var time = player.currentTime();
    refreshElementReadOnlyValue("set_in_time", secondsToTimeStr(time));

    refreshElementValue("totaldetetedin", gl_job.gl_vod_current_deleted_duration_s);
}

function assignCurrentTimeToSetOutTime() {
    var time = player.currentTime();
    refreshElementReadOnlyValue("set_out_time", secondsToTimeStr(time));

    refreshElementValue("totaldetetedout", gl_job.gl_vod_current_deleted_duration_s);
}

//Choose the correct rendition to create the VOD (the same that the brain worker will use)
function getHighestQualityVODUsageRendition(outs, playlists) {
    var ret = null;
    var out_index = -1;
    var max_bitrate = 0;


    for (var o = 0; o < outs.length; o++) {
        var out = outs[o];

        if (isIncludedInAlivePlaylist(out, playlists) == true) {
            if (out.video_codec === "PassThru") {
                out_index = o;
                max_bitrate = Number.MAX_SAFE_INTEGER;
            }
            else {
                if (out.video_bitrate_bps > max_bitrate) {
                    out_index = o;
                    max_bitrate = out.video_bitrate_bps;
                }
            }
        }
    }

    if (out_index >= 0)
        ret = outs[out_index];

    return ret;
}

function isIncludedInAlivePlaylist(out, playlists) {
    var ret = false;
    var p = 0;
    while ( (p < playlists.length) && (ret == false) ) {
        var playlist = playlists[p];

        if ( (playlist.type.name == "defaultS3") && ("profile_sources" in playlist) ) {
            var pr = 0;
            while ( (pr < playlist.profile_sources.length) && (ret == false) ) {
                if (out.profile_name == playlist.profile_sources[pr])
                    ret = true;

                pr++;
            }
        }

        p++;
    }

    return ret;
}
