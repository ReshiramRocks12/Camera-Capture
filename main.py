import argparse
import asyncio
import json
import ssl
import sys

import aiortc
import cv2
import numpy as np

from aiohttp import web, web_request
from aiortc import rtcrtpreceiver

connection: aiortc.RTCPeerConnection = None
settings = None

def create_connection() -> None:
	global connection
	
	if connection:
		raise RuntimeError('Unable to create a new connection: Connection not closed.')

	connection = aiortc.RTCPeerConnection()
	connection.add_listener('track', on_track_recieved)

async def close_connection() -> None:
	global connection
	
	if not connection:
		raise RuntimeError('Unable to close the connection: Connection not found.')

	await connection.close()
	connection = None
	
async def index_handle(request: web_request.Request) -> web.FileResponse:
	return web.FileResponse(r'.\index.html')

async def rtc_start_handle(request: web_request.Request) -> web.Response:
	global connection

	try:
		create_connection()

		data = await request.json()

		# Get the session description
		sdp = data['sdp']
		sdp_type = data['type']
		description = aiortc.RTCSessionDescription(sdp, sdp_type)
		await connection.setRemoteDescription(description)

		# Create an answer with ICE candidates to respond to the offer
		answer = await connection.createAnswer()
		await connection.setLocalDescription(answer)

		return web.Response(
			content_type='application/json',
			text=json.dumps({ 'sdp': answer.sdp, 'type': answer.type })
		)
	except Exception as e:
		return web.Response(text=str(e), status=400)

async def rtc_stop_handle(request: web_request.Request) -> web.Response:
	global connection

	try:
		await close_connection()
		cv2.destroyAllWindows()

		return web.Response()
	except Exception as e:
		return web.Response(text=str(e), status=400)

async def settings_handle(request: web_request.Request) -> web.Response:
	global settings

	try:
		data = await request.json()
		settings = data

		return web.Response()
	except Exception as e:
		return web.Response(text=str(e), status=400)

def create_ssl_context(certificate_file_path: str, key_file_path: str, password: str | None = None) -> ssl.SSLContext:
	# Create and return an SSL context used for client authentication
	ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
	ssl_context.load_cert_chain(certificate_file_path, key_file_path, password)
	return ssl_context

def init_routes(app: web.Application) -> None:
	app.router.add_static('/static/', path=r'.\static', name='static') # Static resources
	app.router.add_get('/', index_handle) # Leads to index.html

	app.router.add_post('/rtcStart', rtc_start_handle) # Route to signal start of stream
	app.router.add_post('/rtcStop', rtc_stop_handle) # Route to signal end of stream
	app.router.add_post('/settings', settings_handle) # Route to send camera settings

async def handle_video(track: rtcrtpreceiver.RemoteStreamTrack) -> None:
	global settings

	try:
		cv2.namedWindow('Camera Capture - Reciever', cv2.WINDOW_AUTOSIZE)
		while not track.readyState == 'ended':
			frame = await track.recv()
			image: np.ndarray = frame.to_ndarray(format='bgr24')
			image = cv2.resize(image, (settings['width'], settings['height'])) # Resize to the incoming size of the image stream
			if settings['mirror']:
				image = cv2.flip(image, 1)
			cv2.imshow('Camera Capture - Reciever', image)
			cv2.waitKey(1)

	except Exception as e:
		if connection: # If this is not caused by the connection closing
			print(str(e))

async def on_webapp_shutdown(app: web.Application):
	if connection:
		await close_connection()

def on_track_recieved(track: rtcrtpreceiver.RemoteStreamTrack) -> None:
	if track.kind == 'video':
		asyncio.create_task(handle_video(track))

def parse_arguments() -> argparse.Namespace:
	parser = argparse.ArgumentParser('Runs a web server to recieve a camera stream.')
	parser.add_argument('--host', type=str, default='0.0.0.0', help='Network interface to bind the server to')
	parser.add_argument('--port', type=int, default=8080, help='Port to bind the server to')
	parser.add_argument('--certfile', type=str, default=r'.\cert.pem', help='A path to an SSL certificate file')
	parser.add_argument('--keyfile', type=str, default=r'.\key.pem', help='A path to an SSL private key file')
	parser.add_argument('--password', type=str, default=None, help='The password of the SSL private key')
	
	return parser.parse_args()

def main() -> int:
	args = parse_arguments()

	app = web.Application()
	init_routes(app)
	app.on_shutdown.append(on_webapp_shutdown)

	try:
		# SSL to enable HTTPS
		cert_file = args.certfile
		key_file = args.keyfile
		password = args.password
		ssl_context = create_ssl_context(cert_file, key_file, password)
	except Exception as e:
		print(f'An error occurred creating an SSL context: {str(e)}')
		return 1

	# Run HTTPS application on the provided network interface and port
	host = args.host
	port = args.port
	web.run_app(app, host=host, port=port, ssl_context=ssl_context)
	return 0

if __name__ == '__main__':
	sys.exit(main())
