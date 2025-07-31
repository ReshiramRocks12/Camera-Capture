import ssl

from aiohttp import web, web_request

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

def main() -> int:
	app = web.Application()
	init_routes(app)

	cert_file = r'.\secrets\cert.pem'
	key_file = r'.\secrets\key.pem'
	ssl_context = create_ssl_context(cert_file, key_file)

	# Run HTTPS application exposed to all devices on the local network
	web.run_app(app, host='0.0.0.0', port=8080, ssl_context=ssl_context)
	return 0

if __name__ == '__main__':
	exit(main())
