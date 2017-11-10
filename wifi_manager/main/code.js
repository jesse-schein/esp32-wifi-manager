// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

var apList = null;
var selectedSSID = "";
var refreshAPInterval = null; 
var checkStatusInterval = null;


function stopCheckStatusInterval(){
	if(checkStatusInterval != null){
		clearInterval(checkStatusInterval);
		checkStatusInterval = null;
	}
}

function stopRefreshAPInterval(){
	if(refreshAPInterval != null){
		clearInterval(refreshAPInterval);
		refreshAPInterval = null;
	}
}

function startCheckStatusInterval(){
	checkStatusInterval = setInterval(checkStatus, 950);
}

function startRefreshAPInterval(){
	refreshAPInterval = setInterval(refreshAP, 2800);
}

$(function() {
	
	
	$("#wifi-status").on("click", ".ape", function() {
		$( "#wifi" ).slideUp( "fast", function() {});
		$( "#connect-details" ).slideDown( "fast", function() {});
	});
	
	
	$("#wifi-list").on("click", ".ape", function() {
		selectedSSID = $(this).text();
		$( "#ssid-pwd" ).text(selectedSSID);
		$( "#wifi" ).slideUp( "fast", function() {});
		$( "#connect" ).slideDown( "fast", function() {});
		
		//update wait screen
		$( "#loading" ).show();
		$( "#connect-success" ).hide();
		$( "#connect-fail" ).hide();		
	});
	
	$("#cancel").on("click", function() {
		selectedSSID = "";
		$( "#connect" ).slideUp( "fast", function() {});
		$( "#wifi" ).slideDown( "fast", function() {});
	});
	
	$(document).on("click", "#join", function() {
		performConnect();
	});
	
	$("#ok-details").on("click", function() {
		$( "#connect-details" ).slideUp( "fast", function() {});
		$( "#wifi" ).slideDown( "fast", function() {});
		
	});
	
	$("#ok-credits").on("click", function() {
		$( "#credits" ).slideUp( "fast", function() {});
		$( "#app" ).slideDown( "fast", function() {});
		
	});
	
	$("#acredits").on("click", function(event) {
		event.preventDefault();
		$( "#app" ).slideUp( "fast", function() {});
		$( "#credits" ).slideDown( "fast", function() {});
	});
	
	$("#ok-connect").on("click", function() {
		$( "#connect-wait" ).slideUp( "fast", function() {});
		$( "#wifi" ).slideDown( "fast", function() {});
	});
	
	$("#disconnect").on("click", function() {
		$( "#connect-details-wrap" ).addClass('blur');
		$( "#diag-disconnect" ).slideDown( "fast", function() {});
	});
	
	$("#no-disconnect").on("click", function() {
		$( "#diag-disconnect" ).slideUp( "fast", function() {});
		$( "#connect-details-wrap" ).removeClass('blur');
	});
	
	$("#yes-disconnect").on("click", function() {
		
		stopCheckStatusInterval();
		selectedSSID = "";
		
		$( "#diag-disconnect" ).slideUp( "fast", function() {});
		$( "#connect-details-wrap" ).removeClass('blur');
		
		$.ajax({
			url: '/connect',
			type: 'DELETE',
			success: function(result) {
				
			}
		});
		
		startCheckStatusInterval();
		
		$( "#connect-details" ).slideUp( "fast", function() {});
		$( "#wifi" ).slideDown( "fast", function() {})
	});
	
	
	
	
	
	
	
	
	//first time the page loads: attempt get the connection status and start the wifi scan
	refreshAP();
	startCheckStatusInterval();
	startRefreshAPInterval();


	
	
});




function performConnect(){
	
	//stop the status refresh. This prevents a race condition where a status 
	//request would be refreshed with wrong ip info from a previous connection
	//and the request would automatically shows as succesful.
	stopCheckStatusInterval();
	
	//stop refreshing wifi list
	stopRefreshAPInterval();
	
	//reset connection 
	$( "#loading" ).show();
	$( "#connect-success" ).hide();
	$( "#connect-fail" ).hide();
	
	$( "#ok-connect" ).prop("disabled",true);
	$( "#ssid-wait" ).text(selectedSSID);
	$( "#connect" ).slideUp( "fast", function() {});
	$( "#connect-wait" ).slideDown( "fast", function() {});
	
	
	
	var xhr = new XMLHttpRequest();
	xhr.onload = function() {
		if(this.status == 200){
			//start refreshing every now and then the IP page
			//to see if the connection to the STA is made
		}
		else{
			//alert(this.responseText);
		}
	};
	
	var pwd = $("#pwd").val();
	xhr.open("POST", "/connect", true);
	xhr.setRequestHeader('Authorization', "\x02{0}\x03\x02{1}\x03".format(selectedSSID, pwd));
	xhr.send();
	
	//now we can re-set the intervals regardless of result
	startCheckStatusInterval();
	startRefreshAPInterval();
	
}



function rssiToIcon(rssi){
	if(rssi >= -60){
		return 'w0';
	}
	else if(rssi >= -67){
		return 'w1';
	}
	else if(rssi >= -75){
		return 'w2';
	}
	else{
		return 'w3';
	}
}


function refreshAP(){
	$.getJSON( "/ap.json", function( data ) {
		if(data.length > 0){
			//sort by signal strength
			data.sort(function (a, b) {
				var x = a["rssi"]; var y = b["rssi"];
				return ((x < y) ? 1 : ((x > y) ? -1 : 0));
			});
			apList = data;
			refreshAPHTML(apList);
			
		}
	});
}

function refreshAPHTML(data){
	var h = "";
	data.forEach(function(e, idx, array) {
		//<div class="ape brdb"><div class="w0"><div class="pw">a0308</div></div></div>
		h += '<div class="ape{0}"><div class="{1}"><div class="{2}">{3}</div></div></div>'.format(idx === array.length - 1?'':' brdb', rssiToIcon(e.rssi), e.auth==0?'':'pw',e.ssid);
		h += "\n";
	});
	
	$( "#wifi-list" ).html(h)
}




function checkStatus(){
	$.getJSON( "/status", function( data ) {
		if(data.hasOwnProperty('ssid') && data['ssid'] != ""){
			if(data["ssid"] === selectedSSID){
				//that's a connection attempt
				if(data["urc"] === 0){
					//got connection
					$("#connected-to span").text(data["ssid"]);
					$("#connect-details h1").text(data["ssid"]);
					$("#ip").text(data["ip"]);
					$("#netmask").text(data["netmask"]);
					$("#gw").text(data["gw"]);
					$("#wifi-status").slideDown( "fast", function() {});
					
					//unlock the wait screen if needed
					$( "#ok-connect" ).prop("disabled",false);
					
					//update wait screen
					$( "#loading" ).hide();
					$( "#connect-success" ).show();
					$( "#connect-fail" ).hide();
				}
				else if(data["urc"] === 1){
					//failed attempt
					$("#connected-to span").text('');
					$("#connect-details h1").text('');
					$("#ip").text('0.0.0.0');
					$("#netmask").text('0.0.0.0');
					$("#gw").text('0.0.0.0');
					
					//don't show any connection
					$("#wifi-status").slideUp( "fast", function() {});
					
					//unlock the wait screen
					$( "#ok-connect" ).prop("disabled",false);
					
					//update wait screen
					$( "#loading" ).hide();
					$( "#connect-fail" ).show();
					$( "#connect-success" ).hide();
				}
			}
			else if(data.hasOwnProperty('urc') && data['urc'] === 0){
				//ESP32 is already connected to a wifi without having the user do anything
				if( !($("#wifi-status").is(":visible")) ){
					$("#connected-to span").text(data["ssid"]);
					$("#connect-details h1").text(data["ssid"]);
					$("#ip").text(data["ip"]);
					$("#netmask").text(data["netmask"]);
					$("#gw").text(data["gw"]);
					$("#wifi-status").slideDown( "fast", function() {});
				}
			}
		}
		else if(data.hasOwnProperty('urc') && data['urc'] === 2){
			//that's a manual disconnect
			if($("#wifi-status").is(":visible")){
				$("#wifi-status").slideUp( "fast", function() {});
			}
		}
	})
	.fail(function() {
		//don't do anything, the server might be down while esp32 recalibrates radio
	});


}
