function onLoadPage() {
    getEnv();
}

function showError (msg) {
    console.error(msg);

    document.getElementById("errMsg").innerHTML = msg;
    $('#errorAlert').fadeIn('slow');
}

function refreshAndSelectenv (env) {
    var env_sel = document.getElementById("env");

    //Empty elements
    env_sel.options.length = 0;

    var new_elem = document.createElement("option");
    new_elem.textContent = env.name;
    new_elem.value = env.value;
    new_elem.selected = true;

    env_sel.appendChild(new_elem);
}

function getEnv() {
    var url = "./env.json";

    $.ajax({
        url: url,
        method: 'GET',
        dataType: 'json',
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json'
        },

        success: function(data) {
            if ("env" in data)
                refreshAndSelectenv (data.env);
            else
                errorGettingEnv("No env in returned data");
        },

        error: function(msg) {
            errorGettingEnv(msg);
        }
    });
}

function errorGettingEnv(msg) {
    document.getElementById("env").disabled = false;

    return showError("Error getting env: " + JSON.stringify(msg));
}

function openDemoBRB() {
    var url = "./brb-demo/index.html";

    openDemo(url);
}

function opendemoBRBTC() {
    var url = "./brb-demo/index_tc.html";

    openDemo(url);
}

function opendemoID3() {
    var url = "./id3-metadata-demo/index.html";

    openDemo(url);
}

function opendemoID3TC() {
    var url = "./id3-metadata-demo/index_tc.html";

    openDemo(url);
}

function opendemoClipping() {
    var url = "./clipping-demo/index.html";

    openDemo(url, true);
}

function openDemo(url, need_vc_creds) {
    var env_name = getSelectedEnv();
    var apikey = document.getElementById("apikey").value;
    var jobid = document.getElementById("jobid").value;
    var appid = document.getElementById("appid").value;
    var vccreds = document.getElementById("vccreds").value;

    var qs = [];

    if (envValidation(env_name) === null)
        return showError("No env detected");

    qs.push("env=" + env_name);

    if (apiKeyValidation(apikey) === false)
        return showError("Wrong API key format");

    qs.push("apikey=" + apikey);

    if (guidValidation(jobid) === false)
        return showError("Wrong Job id format");

    qs.push("jobid=" + jobid);

    if (need_vc_creds === true) {
        if (vccreds.trim() === "")
            return showError("Wrong VC creds name");

        qs.push("vccreds=" + vccreds);
    }

    if (appid.trim() != "") {
        if (guidValidation(appid) === false)
            return showError("Wrong App id format");
    }

    qs.push("app=" + appid);
    //Open new URL
    location.href = url + "?" + qs.join("&");
}

function getSelectedEnv() {
    var sel_el = document.getElementById("env");

    if (sel_el.selectedIndex === -1)
        return null;

    return sel_el.options[sel_el.selectedIndex].value;
}

function envValidation(env_name) {
    var ret = false;

    if ((typeof (env_name) == 'string') && (env_name != ""))
        ret = true;

    return ret;
}

function guidValidation(jobId) {
    var ret = false;

    if ((typeof (jobId) === 'string') && (jobId.length === 32)) {
        var regexpjobid = new RegExp(/^[a-fA-F0-9]*$/g);
        var found = jobId.match(regexpjobid);
        if ( (found != null) && (found.length > 0) )
            ret = true;
    }

    return ret;
}

function apiKeyValidation(apikey) {
    var ret = false;

    if ((typeof (apikey) === 'string') && (apikey.length > 5)) {
        var regexpapikey = new RegExp(/^[a-zA-Z0-9]*$/g);
        var found = apikey.match(regexpapikey);
        if ( (found != null) && (found.length > 0) )
            ret = true;
    }

    return ret;
}
