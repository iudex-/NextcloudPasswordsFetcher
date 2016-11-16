document.addEventListener('DOMContentLoaded', function() {
	getCurrentTabUrl(function(url){
		url = url.split("/");
		url = url[0]+"//"+url[2];
		document.querySelector("input[name=website]").value = url;
	});
	var genpw = document.getElementById("genpw");
	genpw.addEventListener("click", function (e) {
		e.preventDefault();
		var pw = generatePassword(25);
		document.querySelector("input[name=password]").value = pw;
		chrome.tabs.executeScript(null, {
			code: "document.querySelectorAll('input[type=password]').forEach(function(x){x.value='"+pw+"'})"
		});
	});

});

document.forms[0].onsubmit = function(e) {
    e.preventDefault(); // Prevent submission
	var website = document.querySelector("input[name=website]").value;
	var username = document.querySelector("input[name=username]").value;
	var password = document.querySelector("input[name=password]").value;
	console.log("send",website,username);
	chrome.runtime.getBackgroundPage(function(bgWindow) {
		bgWindow.main.addAcc(website, username, password);
		window.close();
	});
};

function r(min,max){return Math.floor((Math.random() * (max-min+1) + min)) }
function generatePassword(length){
	var ret = "";
	for(var i=0;i<length;i++){
		var rand = r(33,126);
		var char = String.fromCharCode(rand);
		console.log(rand,char);
		ret = ret+""+char;
	}
	return ret;
}

function getCurrentTabUrl(callback) {
	var queryInfo = {
		active: true,
		currentWindow: true
	};
	chrome.tabs.query(queryInfo, function(tabs) {
		var tab = tabs[0];
		var url = tab.url;
		console.assert(typeof url == 'string', 'tab.url should be a string');
		callback(url);
	});
}
