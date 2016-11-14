document.addEventListener('DOMContentLoaded', function() {
	chrome.storage.sync.get("NextcloudPasswords", function(items){
		recv = items["NextcloudPasswords"];
		console.log("from storage:",recv);
		document.querySelector("input[name=server]").value=recv.server;
		document.querySelector("input[name=username]").value=recv.user;
	});
});

document.forms[0].onsubmit = function(e) {
    e.preventDefault(); // Prevent submission
    server = document.querySelector("input[name=server]").value;
	username = document.querySelector("input[name=username]").value;
	password = document.querySelector("input[name=password]").value;
	console.log(server,username);
	
	chrome.storage.sync.set({ "NextcloudPasswords": {server: server, user: username} }, function(){
		// ehm?
	});
	
	chrome.runtime.getBackgroundPage(function(bgWindow) {
        bgWindow.setPopupData(server,username,password);
        window.close();     // Close dialog
    });
};
