document.addEventListener('DOMContentLoaded', function() {
	getCurrentTabUrl(function(url){
		url = url.split("/");
		url = url[0]+"//"+url[2];
		document.querySelector("input[name=website]").value=url;
	});
});

document.forms[0].onsubmit = function(e) {
    e.preventDefault(); // Prevent submission
	var website = document.querySelector("input[name=website]").value;
	var username = document.querySelector("input[name=username]").value;
	var password = document.querySelector("input[name=password]").value;
	console.log("send",website,username);
	chrome.runtime.getBackgroundPage(function(bgWindow) {
		bgWindow.addAcc(website,username, password);
		window.close();
	});
};

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
