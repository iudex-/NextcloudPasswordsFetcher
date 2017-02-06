
function save_options() {
	var data = { options: {
		matchSubdomain: subdomainCheck.checked,
	}};
	console.log(data);
	chrome.storage.sync.set(data, function(){
		statusText.textContent = 'Options saved.';
		setTimeout(function() {
			statusText.textContent = '';
		}, 750);
	});
	return false;
}

function restore_options() {
	chrome.storage.sync.get({options: {
		matchSubdomain: true, // default values
	}}, function(items) {
		console.log(items);
		subdomainCheck.checked = items.options.matchSubdomain;
	});
}

var subdomainCheck = document.getElementById('subdomainCheck');
var statusText = document.getElementById('status');

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);