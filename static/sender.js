
var peerConnection;

function onStreamToggle()
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
	cameraVideoElement.srcObject.getTracks().forEach(track => peerConnection.addTrack(track));
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
	streamToggleButton.onclick = onStreamToggle;
});

window.addEventListener('pagehide', async event =>
{
	if (!event.persisted)
		await closeConnection();
});
