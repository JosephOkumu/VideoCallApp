#!/usr/bin/env python3
import http.server
import ssl
import socketserver
import os

PORT = 8443

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

# Change to the directory containing the web files
web_dir = os.path.dirname(os.path.realpath(__file__))
os.chdir(web_dir)

# Create server
with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    # Create SSL context
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain('cert.pem', 'key.pem')
    
    # Wrap the socket with SSL
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    print(f"HTTPS Server running at https://0.0.0.0:{PORT}/")
    print(f"Access from your phone: https://192.168.1.8:{PORT}/")
    print("Note: You'll need to accept the security warning about the self-signed certificate")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
