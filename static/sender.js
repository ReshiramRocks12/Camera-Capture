
var peerConnection;
var settingsChannel;
var cameraSettings = {
	mirror: false,
	width: 0,
	height: 0,
	facingMode: 'user'
}

function stopUserCamera()
{
	const cameraVideoElement = document.getElementById('camera');
	const tracks = cameraVideoElement.srcObject.getTracks();
	tracks.forEach(track => track.stop());
}

function initializeUserCamera()
{
	const cameraVideoElement = document.getElementById('camera');
	navigator.mediaDevices.getUserMedia(
	{
		video: {
			facingMode: cameraSettings.facingMode
		},
		audio: false
	})
	.then(stream => cameraVideoElement.srcObject = stream)
	.catch(console.error);
}

function toggleStream()
{
	const streamToggleButton = document.getElementById('streamToggle');

	if (peerConnection)
	{
		closeConnection().catch(console.error);
		streamToggleButton.innerHTML = 'Start Streaming';
	}
	else
	{
		startConnection();
		streamToggleButton.innerHTML = 'Stop Streaming';
	}
}

function mirrorCamera()
{
	cameraSettings.mirror = !cameraSettings.mirror;
	const cameraVideoElement = document.getElementById('camera');
	cameraVideoElement.style.transform = cameraSettings.mirror ? 'scaleX(-1)' : '';
	sendSettings();
}

function switchCamera()
{
	cameraSettings.facingMode = (cameraSettings.facingMode == 'user' ? 'environment' : 'user');
	stopUserCamera();
	initializeUserCamera(); // Reinitialize camera to switch the video stream
}

function postJSON(site, body)
{
	return fetch(site,
	{
		method: 'POST',
		headers:
		{
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
}

function sendSettings()
{
	if (settingsChannel)
		if (settingsChannel.readyState === 'open')
			settingsChannel.send(JSON.stringify(cameraSettings));
		else
			settingsChannel.onopen = sendSettings;
}

async function onIceGatheringStateChange()
{
	// Wait for all ICE candidates to be gathered (no trickle ICE)
	if (peerConnection.iceGatheringState == 'complete')
	{
		// localDescription contains the full SDP with all ICE candidates
		const response = await postJSON('/rtcStart', peerConnection.localDescription.toJSON());
		const data = await response.json();
		await peerConnection.setRemoteDescription(data);

		const streamToggleButton = document.getElementById('streamToggle');
		streamToggleButton.disabled = false; // Re-enable the button
	}
}

function createPeerConnection()
{
	peerConnection = new RTCPeerConnection();
	settingsChannel = peerConnection.createDataChannel('settings',
	{
		ordered: true,
		reliable: true
	});

	const cameraVideoElement = document.getElementById('camera');
	cameraVideoElement.srcObject.getTracks().forEach(track =>
	{
		const settings = track.getSettings();
		peerConnection.addTrack(track);

		// Give the reciever the current settings to sync resolution
		cameraSettings.width = settings.width;
		cameraSettings.height = settings.height;
	});
}

function startConnection()
{
	const streamToggleButton = document.getElementById('streamToggle');
	const switchCameraButton = document.getElementById('switchCamera');

	switchCameraButton.disabled = true; // Disable the button so the camera stream is not changed while the connection is active
	streamToggleButton.disabled = true; // Temporarily disable the button until the connection is active 
	createPeerConnection();
	peerConnection.createOffer().then(async offer => await peerConnection.setLocalDescription(offer));
	peerConnection.onicegatheringstatechange = onIceGatheringStateChange;
	sendSettings();
}

async function closeConnection()
{
	const streamToggleButton = document.getElementById('streamToggle');
	const switchCameraButton = document.getElementById('switchCamera');

	streamToggleButton.disabled = true; // Temporarily disable the button until the connection has been closed
	await postJSON('/rtcStop', {}); // Signal reciever to stop the connection
	await peerConnection.close();
	peerConnection = null;

	streamToggleButton.disabled = false; // Re-enable the button
	switchCameraButton.disabled = false; // Allow the user to change the camera stream again
}

document.addEventListener('DOMContentLoaded', () =>
{
	// Fetch the user's camera
	initializeUserCamera();

	// Assign a callback for when the Stream Toggle button is clicked
	const streamToggleButton = document.getElementById('streamToggle');
	streamToggleButton.onclick = toggleStream;

	// Assign a callback for when the Mirror Camera button is clicked
	const mirrorCameraButton = document.getElementById('mirrorCamera');
	mirrorCameraButton.onclick = mirrorCamera;

	// Assign a callback for when the Switch Camera button is clicked
	const switchCameraButton = document.getElementById('switchCamera');
	switchCameraButton.onclick = switchCamera;
});

window.addEventListener('pagehide', async event =>
{
	if (!event.persisted)
		await closeConnection();
});
