
var API_PATH = "/index.php/apps/passwords/api/0.1/passwords";
var SERVER, USER, PASSWORD;
var data;
var count;

if(PASSWORD==undefined) {
	chrome.browserAction.setPopup({popup: "popup.html"});
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
	//chrome.tabs.executeScript(null, {code: getInsertCode("uuuuser", "ppppppppassword")});
	getCurrentTabUrl(function(url){
		url=url.split("/")[2];
		if(data[url]) {
			console.log("URL match!");
			//chrome.browserAction.setIcon({path: "icon-green-32.png"});
			chrome.tabs.executeScript(null, {code: getInsertCode(data[url][0], data[url][1])});
		} else {
			console.log("NO URL match!");
			//chrome.browserAction.setIcon({path: "icon-red-32.png"});
		}
		//setTimeout(function(x){chrome.browserAction.setIcon({path: "icon-32.png"});},500);
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
function addAcc_(website, username, pw, parse_error_counter){
	var website_filtered = website.split("/")[2];
	console.log("addAcc called", website_filtered, username);
	data[website_filtered] = [username, pw];
    indicatorAction();
	console.log("POST fetching...");
	chrome.browserAction.setBadgeBackgroundColor({color: "#ff9c34"});
	chrome.browserAction.setBadgeText({text:" "});
    fetch(SERVER+API_PATH, {
        credentials: 'omit', // this is the default value
        cache: 'no-store',
        method: 'POST',
        headers: {
	        "Content-Type": "application/json",
            "Authorization": "Basic "+btoa(USER+":"+PASSWORD)
        },
        body: 	"{\"website\":\""+website_filtered+"\"," +
				"\"pass\":\""+pw+"\"," +
				"\"loginname\":\""+username+"\"," +
				"\"address\": \""+website+"\"," +
				"\"notes\": \"\"}"
    }).then(function(res) {
        console.log("POST request ok?", res.ok);
        if (!res.ok) {
            throw Error(res.statusText);
        } else {
	        //console.log(res);
	        res.json().then(function(resJson) {
				console.log(resJson);
		        chrome.browserAction.setBadgeBackgroundColor({color: "#3cd23c"});
		        setTimeout(resetBadge,1000);
	        }).catch(function(error) {
		        console.log("parse error 2", error);
		        if(parse_error_counter<30) {
			        parse_error_counter++;
		            addAcc_(website,username,pw,parse_error_counter);
		        }
	        });
        }
    }).catch(function(error) {
        console.log("Network error", error);
	    chrome.browserAction.setBadgeBackgroundColor({color: "#e31c1e"});
	    setTimeout(resetBadge,5000);
    });
}

function resetBadge() {
	chrome.browserAction.setBadgeText({text:""});
}

function loadData(cb) {
	loadData_(cb, 0);
}
function loadData_(cb, parse_error_count){
	if(SERVER) {
		console.log("GET fetching...");
		chrome.browserAction.setBadgeBackgroundColor({color: "#ff9c34"});
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
					console.log(data);
					data = processData(data);
					chrome.browserAction.setBadgeBackgroundColor({color: "#3cd23c"});
					setTimeout(resetBadge,1000);
					if(cb!=undefined) {
						cb();
					}
				}).catch(function(error) {
					console.log("parse error 1", error);
					if(parse_error_count<20) {
						parse_error_count++;
						loadData_(cb, parse_error_count);
					}
				});
			}
			return res;
		}).catch(function(error) {
			console.log("Network/Auth error", error);
			chrome.browserAction.setBadgeBackgroundColor({color: "#e31c1e"});
			setTimeout(resetBadge,1000);
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

	return "document.querySelector('body').style.backgroundColor='#cfc';									\
			document.querySelectorAll('"+UsernameSelectors+"').forEach(function(x){x.value='"+user+"'});	\
			document.querySelectorAll('input[type=password]').forEach(function(x){x.value='"+pw+"'});";
}
/*
var user = "hans";
var pw = ",jjxfd,nfksfdkh";

var matchUser = ["input[name=id]", "input[name=username]", "input[type=email]"];
for(i=0;i<matchUser.length;i++){
	matched = document.querySelectorAll(matchUser[i]);
	console.log(matchUser[i], matched);
	if(matched!=[]) {
		matched.forEach(function(x){x.value=user});
	}
}
document.querySelectorAll("input[type=password]").forEach(function(x){x.value=pw});

try{
	document.querySelector("button[type=submit]").click();
} catch(e){console.log("exeption", e)}
try{
	document.querySelector("input[type=submit]").click()
} catch(e){console.log("exeption", e)}
*/

/*
document.querySelector("input[name=id]").value=123  // http://uploaded.net/file/8ezq1j3k
document.querySelector("input[name=username]").value=123  // play.spotify.com
document.querySelector("input[type=password]").value=123
document.querySelector("button[type=submit]").click();

google:
document.querySelector("input[type=email]").value="foo@bar.de"
document.querySelector("button[type=submit]").click()
...
document.querySelector("input[type=password]").value=123
document.querySelector("input[type=submit]").click()

*/


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
