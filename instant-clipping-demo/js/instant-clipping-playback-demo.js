//We will load this values form URL vars
//Example:
//https://www.myserver.com/X-demo.html?playback=abcd1234abcd1234abcd1234abcd1234

var playbackUrl = "";

function onLoadPage() {
    var url_vars = getUrlVars();

    console.log("URL detected vars = " + JSON.stringify(url_vars));

    baseUrl = getBaseUrlFromUrlVars(url_vars.env);

    if (!("playback" in url_vars)) {
        showInputParamsAlert();
    }
    else {
        playbackUrl = url_vars.playback;

        console.log("Detected params playbackUrl: " + playbackUrl);

        refreshPlaybackUrl(playbackUrl);

        loadVideo(playbackUrl, true)
    }
}

function refreshPlaybackUrl(url) {
    refreshElementInnerHTML("playbackUrl", "Playback URL: " + url);
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

function showInputParamsAlert() {
    showError("A problem has been occurred reading required data from querystring. Remember the URL format to use this page is:<br>MYSERVER.abc/instant-clipping-demo/play.html?playback=http://playback-myserver.com/PATH/playlist.m3u8");
}
