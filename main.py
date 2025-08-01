import json
import ssl

from aiortc import RTCPeerConnection, RTCSessionDescription
from aiohttp import web, web_request

connection: RTCPeerConnection = None

async def rtc_start_handle(request: web_request.Request) -> web.Response:
	global connection

	try:
		data = await request.json()

		if connection:
			raise RuntimeError('Unable to create a new connection: Connection not closed.')

		connection = RTCPeerConnection()

		# Get the session description
		sdp = data['sdp']
		sdp_type = data['type']
		description = RTCSessionDescription(sdp, sdp_type)
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
		if not connection:
			raise RuntimeError('Unable to close the connection: Connection not found.')

		await connection.close()
		connection = None

		return web.Response()
	except Exception as e:
		return web.Response(text=str(e), status=400)

async def index_handle(request: web_request.Request) -> web.FileResponse:
	return web.FileResponse(r'.\index.html')

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

def main() -> int:
	app = web.Application()
	init_routes(app)

	# SSL to enable HTTPS
	cert_file = r'.\secrets\cert.pem'
	key_file = r'.\secrets\key.pem'
	ssl_context = create_ssl_context(cert_file, key_file)

	# Run HTTPS application exposed to all devices on the local network
	web.run_app(app, host='0.0.0.0', port=8080, ssl_context=ssl_context)
	return 0

if __name__ == '__main__':
	exit(main())
