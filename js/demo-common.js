//Common functions


function getBaseUrlFromUrlVars(env) {
    //Default to PROD base url
    var baseUrl = "https://api.bcovlive.io/v1";

    if (typeof (env) === 'string') {
        if (env === "qa")
            baseUrl = "https://api-qa.a-live.io/v1";
        else if (env === "st")
            baseUrl = "https://api-st.a-live.io/v1";
    }

    return baseUrl;
}

function showError (msg) {
    console.error(msg);

    document.getElementById("errMsg").innerHTML = msg;
    $('#errorAlert').fadeIn('slow');
}

function guidValidation(guid) {
    var ret = false;

    if ((typeof (guid) === 'string') && (guid.length === 32)) {
        var regexpguid = new RegExp(/^[a-fA-F0-9]*$/g);
        var found = guid.match(regexpguid);
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

function getUrlVars() {
    var vars = {};
    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });

    return vars;
}

function refreshElementInnerHTML(elem, data) {
    document.getElementById(elem).innerHTML = data;
}

function enableElement(elem, b) {
    document.getElementById(elem).disabled = !b;
}

function getJobData(baseurl, jobid, callback) {
    var url = baseurl + "/jobs/" + jobid;

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
            if ("errorType" in data)
                return callback("Error received from getting job data" + JSON.stringify(data.errorMessage), data);

            if (!("job" in data))
                return callback("Getting job from response", data);

            return callback(null, data.job);
        },
        error: function(msg) {
            return callback("Error getting job data: " + JSON.stringify(msg), null);
        }
    });
}

function translateHttps (url) {
    return url.replace(/^http:/,'https:')
}

function isTCFormatted(str) {
    var ret = false;

    if (typeof (str) !== 'string')
        return ret;

    var patt = new RegExp('^([0-1][0-9]|[2][0-3]):([0-5][0-9]):([0-5][0-9]):([0-9]+)$');

    return patt.test(str);
}

function refreshElementReadOnlyValue(elem, str) {
    document.getElementById(elem).removeAttribute("readonly");

    document.getElementById(elem).value = str;

    document.getElementById(elem).setAttribute("readonly", true);
}

function insertOnTopOfList(list, obj) {
    if (list.childNodes.length > 0)
        list.insertBefore(obj, list.childNodes[0]);
    else
        list.appendChild(obj);
}

function convertAscii(asciiArray) {
    var res = "";

    for (var i = 0; i < asciiArray.length; i++)
        res += String.fromCharCode(asciiArray[i]);

    return res;
}

function keyIsNumber(event) {
    var regex = new RegExp("^[0-9]+$");
    var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
    if (!regex.test(key)) {
        event.preventDefault();
        return false;
    }
}

function keyIsTCChar(event) {
    var regex = new RegExp("^[0-9:]+$");
    var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
    if (!regex.test(key)) {
        event.preventDefault();
        return false;
    }
}

function refreshElementValue(elem, data) {
    document.getElementById(elem).value = data;
}

function timeStrToSeconds(time) {
    var timeArr = time.split(":");
    var hour = Number(timeArr[0]);
    var minute = Number(timeArr[1]);
    var second = Number(timeArr[2]);
    return hour * 3600 + minute * 60 + second;
}

function secondsToTimeStr(seconds) {
    var hour = parseInt(seconds / 3600);
    if (hour < 10) {
        hour = '0' + hour;
    }
    var minute = parseInt((seconds % 3600) / 60);
    if (minute < 10) {
        minute = '0' + minute;
    }
    var second = (seconds % 60).toFixed(3);
    if (second < 10) {
        second = '0' + second;
    }
    return [hour, minute, second].join(":");
}


function dateToFormattedStr(date) {
    return date.getFullYear().toString() + "/" + ensure2DigitsStr(date.getMonth() + 1) + "/" + ensure2DigitsStr(date.getDay()) + " " + ensure2DigitsStr(date.getHours()) + ":" + ensure2DigitsStr(date.getMinutes()) + ":" + ensure2DigitsStr(date.getSeconds());
}

function ensure2DigitsStr(num) {
    var ret = num.toString();

    if (ret.length < 2)
        ret = "0" + ret;

    return ret;
}

function formattedDateToEpochs(date_str) {
    var ret = 0;
    var regexpdate = new RegExp(/(\d\d\d\d)\/(0[0-9]|1[0-2])\/(0[0-9]|1[0-9]|2[0-9]|3[0-1]) (0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])/);

    var found = date_str.match(regexpdate);
    if ( (found !== null) && (found.length > 6) ) {
        var yyyy = parseInt(found[1]);
        var MM = parseInt(found[2]);
        var dd = parseInt(found[3]);
        var hh = parseInt(found[4]);
        var mm = parseInt(found[5]);
        var ss = parseInt(found[6]);

        ret = new Date(Date.UTC(yyyy, MM - 1, dd, hh, mm, ss, 0)).getTime() / 1000;
    }

    return ret;
}