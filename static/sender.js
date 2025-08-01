
var peerConnection;
var cameraSettings = {
	mirror: false,
	width: 0,
	height: 0
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
	postJSON('/settings', cameraSettings);
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

async function onIceGatheringStateChange()
{
	if (peerConnection.iceGatheringState == 'complete')
	{
		const response = await postJSON('/rtcStart', peerConnection.localDescription.toJSON());
		response.json().then(async data => await peerConnection.setRemoteDescription(data));
		const streamToggleButton = document.getElementById('streamToggle');
		streamToggleButton.disabled = false;
	}
}

function createPeerConnection()
{
	peerConnection = new RTCPeerConnection();
	const cameraVideoElement = document.getElementById('camera');
	cameraVideoElement.srcObject.getTracks().forEach(track =>
	{
		const settings = track.getSettings();
		peerConnection.addTrack(track);
		cameraSettings.width = settings.width;
		cameraSettings.height = settings.height;
		postJSON('/settings', cameraSettings);
	});
}

function startConnection()
{
	const streamToggleButton = document.getElementById('streamToggle');
	streamToggleButton.disabled = true;
	createPeerConnection();
	peerConnection.createOffer().then(async offer => await peerConnection.setLocalDescription(offer));
	peerConnection.onicegatheringstatechange = onIceGatheringStateChange;
}

async function closeConnection()
{
	const streamToggleButton = document.getElementById('streamToggle');
	streamToggleButton.disabled = true;
	await postJSON('/rtcStop', {});
	await peerConnection.close();
	peerConnection = null;
	streamToggleButton.disabled = false;
}

document.addEventListener('DOMContentLoaded', () =>
{
	// Fetch the user's camera
	const cameraVideoElement = document.getElementById('camera');
	navigator.mediaDevices.getUserMedia({ video: true, audio: false })
		.then(stream => cameraVideoElement.srcObject = stream)
		.catch(console.error);

	// Assign a callback for when the button is clicked
	const streamToggleButton = document.getElementById('streamToggle');
	streamToggleButton.onclick = toggleStream;

	// Assign a callback for when the button is clicked
	const mirrorCameraButton = document.getElementById('mirrorCamera');
	mirrorCameraButton.onclick = mirrorCamera;
});

window.addEventListener('pagehide', async event =>
{
	if (!event.persisted)
		await closeConnection();
});
