main=function(){

var API_PATH = "/index.php/apps/passwords/api/0.1/passwords";
var RETRY_TIME = 500; // ms
var RETRIES = 20;

var SERVER, USER, PASSWORD; // set via setPopupData
var data;
var count;

if(PASSWORD==undefined) {
	chrome.browserAction.setPopup({popup: "popup.html"});
	chrome.browserAction.setIcon({path: "icons/icon-32.png"});
}

chrome.browserAction.onClicked.addListener(function() {
	if(SERVER){
		if(data==undefined){
			loadData(action);
		} else {
			action();
			loadData();
		}
	}
});

function indicatorListener() {
	if(SERVER){
		if(data==undefined){
			loadData(indicatorAction);
		} else {
			indicatorAction();
		}
	}
}
function indicatorAction() {
	getCurrentTabUrl(function(url){
		if(data!=undefined) {
			url=url.split("/")[2];
			if(data[url]) {
				chrome.browserAction.setPopup({popup: ""});
				chrome.browserAction.setIcon({path: "icons/icon-green-32.png"});
			} else {
				chrome.browserAction.setPopup({popup: "popup-add.html"});
				chrome.browserAction.setIcon({path: "icons/icon-32.png"});
			}
		}
	});
}

function action(){
	getCurrentTabUrl(function(url){
		url=url.split("/")[2];
		if(data[url]) { // URL match
			chrome.tabs.executeScript(null, {code: getInsertCode(data[url][0], data[url][1])});
		}
		console.log(url);
	});
	count++;
	//chrome.browserAction.setBadgeText({text:" "});
	//chrome.browserAction.setBadgeBackgroundColor({color: [r(0,255),r(0,255),r(0,255),255]});
}

function r(min,max){return Math.floor((Math.random() * max) + min) }

function setPopupData(server,username,password) { // calles from popup.js
	SERVER = server;
	USER = username;
	PASSWORD = password;
	console.log("received data!",SERVER,USER);
	loadData(function(){
		if(data!=undefined) {
			chrome.browserAction.setPopup({popup: ""});
			chrome.tabs.onUpdated.addListener(indicatorListener);
			chrome.tabs.onActivated.addListener(indicatorListener);
			indicatorAction();
			//action();
		} else {
			chrome.browserAction.setIcon({path: "icons/icon-red-32.png"});
		}
	});
}
function addAcc(website,username, pw) {
	addAcc_(website, username, pw, 0);
}

function addAcc_(website, username, pw, parse_error_count){
	var website_filtered = website.split("/")[2];
	console.log("addAcc called", website_filtered, username);
	data[website_filtered] = [username, pw];
    indicatorAction();
	console.log("POST fetching...");
	setBadge("wait");
	var body = '{"website":"'+website_filtered+'",' +
		'"pass":'+JSON.stringify(pw)+',' +
		'"loginname":'+JSON.stringify(username)+',' +
		'"address": '+JSON.stringify(website)+',' +
		'"notes": ""}';
	//console.log("send data:",body);
    fetch(SERVER+API_PATH, {
        credentials: 'omit', // this is the default value
        cache: 'no-store',
        method: 'POST',
        headers: {
	        "Content-Type": "application/json",
            "Authorization": "Basic "+btoa(USER+":"+PASSWORD)  // base64 encode credentials
        },
        body: body
    }).then(function(res) {
        console.log("POST request ok?", res.ok);
        if (!res.ok) {
            throw Error(res.statusText);
        } else {
	        res.json().then(function(resJson) {
		        setBadge("ok");
		        indicatorAction();
		        resetBadge();
	        }).catch(function(error) {
		        console.log("parse error 2", error);
		        setBadge("error");
                if(parse_error_count<RETRIES) {
                    parse_error_count++;
                    setTimeout(function(){
                        console.log("POST retry #",parse_error_count);
                        addAcc_(website,username,pw,parse_error_count);
                    },RETRY_TIME)
                }
	        });
        }
    }).catch(function(error) {
        console.log("Network error", error);
	    setBadge("error");
	    resetBadge();
        chrome.browserAction.setIcon({path: "icons/icon-red-32.png"});
    });
}

function setBadge(s){
	var color = "";
	switch (s) {
		case "ok": color = "#73d216"; break;   // Tango Colors:
		case "wait": color = "#edd400"; break; // http://tango.freedesktop.org/Tango_Icon_Theme_Guidelines
		case "error": color = "#cc0000"; break;
	}
	chrome.browserAction.setBadgeBackgroundColor({color: color});
	chrome.browserAction.setBadgeText({text:" "});
}

function resetBadge(timeout) {
	if(timeout==undefined) timeout = 2000;
	setTimeout(function(){
		chrome.browserAction.setBadgeText({text:""});
	},timeout);
}

function loadData(cb) {
	loadData_(cb, 0);
}
function loadData_(cb, parse_error_count){
	if(SERVER) {
		console.log("GET fetching...");
		setBadge("wait");
		chrome.browserAction.setBadgeText({text:" "});
		fetch(SERVER+API_PATH, {
			credentials: 'omit', // this is the default value
			cache: 'no-store',
			headers: {
				Authorization: "Basic "+btoa(USER+":"+PASSWORD)
			}
		}).then(function(res) {
			console.log("GET request ok?", res.ok);
			if (!res.ok) {
				throw Error(res.statusText);
			} else {
				res.json().then(function(resJson) {
					data = resJson.filter(function(ele){return ele.creation_date!=null});
					data = data.filter(function(ele){return ele.deleted=="0"});
					data = processData(data);
					setBadge("ok");
					resetBadge();
					indicatorAction();
					if(cb!=undefined) {
						cb();
					}
				}).catch(function(error) {
					console.log("parse error 1", error);
					setBadge("error");
					if(parse_error_count<RETRIES) {
						parse_error_count++;
                        setTimeout(function(){
                        		console.log("GET retry #",parse_error_count);
                            	loadData_(cb, parse_error_count);
                        	},RETRY_TIME)
					}
				});
			}
			return res;
		}).catch(function(error) {
			console.log("Network/Auth error", error);
			setBadge("error");
			resetBadge();
			chrome.browserAction.setIcon({path: "icons/icon-red-32.png"});
		});
	} else {
		console.warn("loadData without SERVER set");
	}
}

function processData(input){
	var out = {};
	input.forEach(function(x){
		if(x.properties){
			var prop={};
			try{
				prop=JSON.parse("{" + x.properties.split(', "notes')[0] + "}")
			} catch(e){console.log("exception", e)}
			
			var url="";
			try{
				url=prop["address"].split("/");
				if(url.length>1) {
					url=url[2]
				} else {
					 url=url[0]
				}
			} catch(e){console.log("exception", e)}

			//console.log(url,prop.loginname,x.pass);
			if(url) {
				out[url] = [prop.loginname,x.pass];
			}
		}
	});
	return out;
}

function getInsertCode(user,pw){
	var UsernameSelectors = "input[name=id], input[name=lid], input[name=username], input[name=Username], input[name=userName],	\
						 input[name=user], input[name=email], input[name=Email], input[name=eMail], input[name=acct],		\
						 input[type=text], input[type=email], input[name=acc], input[name=login][type=text]";
	var u = encodeURIComponent(user);
	var p = encodeURIComponent(pw);
	return "document.querySelector('body').style.backgroundColor='#cfc';			                						\
			document.querySelectorAll('"+UsernameSelectors+"').forEach(function(x){x.value=decodeURIComponent('"+u+"')});	\
			document.querySelectorAll('input[type=password]').forEach(function(x){ x.value=decodeURIComponent('"+p+"')});";
}


function getCurrentTabUrl(callback) { // from Chromes tutorial extension
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    // chrome.tabs.query invokes the callback with a list of tabs that match the
    // query. When the popup is opened, there is certainly a window and at least
    // one tab, so we can safely assume that |tabs| is a non-empty array.
    // A window can only have one active tab at a time, so the array consists of
    // exactly one tab.
    var tab = tabs[0];

    // A tab is a plain object that provides information about the tab.
    // See https://developer.chrome.com/extensions/tabs#type-Tab
    var url = tab.url;

    // tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
    console.assert(typeof url == 'string', 'tab.url should be a string');

    callback(url);
  });

  // Most methods of the Chrome extension APIs are asynchronous. This means that
  // you CANNOT do something like this:
  //
  // var url;
  // chrome.tabs.query(queryInfo, function(tabs) {
  //   url = tabs[0].url;
  // });
  // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

return {
	"setPopupData" : setPopupData,
	"addAcc" : addAcc
}

}();
