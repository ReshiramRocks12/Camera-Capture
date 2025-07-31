
function onStreamToggle()
{
	
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

window.addEventListener('pagehide', event =>
{
	if (!event.persisted)
	{
		// TODO: Exit logic
	}
});
