#!/usr/bin/env python3
import http.server
import ssl
import socketserver
import json
import urllib.parse
from datetime import datetime, timedelta
import threading
import time
import websockets
import asyncio
import os

PORT = 8443
WS_PORT = 8444

# Store signaling data and room information in memory
signaling_data = {}
rooms = {}
connected_clients = {}  # peer_id: websocket
cleanup_interval = 300  # 5 minutes

# WebSocket handler
async def handle_websocket(websocket):
    peer_id = None
    try:
        print(f"New WebSocket connection from {websocket.remote_address}")
        
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get('type')
                
                print(f"Received message: {data}")
                
                if msg_type == 'register':
                    peer_id = data.get('peerId')
                    connected_clients[peer_id] = websocket
                    print(f"Registered peer: {peer_id}")
                    
                    # Send current room status
                    if 'active_call' in rooms:
                        await websocket.send(json.dumps({
                            'type': 'activeCall',
                            'data': rooms['active_call']
                        }))
                    
                elif msg_type == 'startCall':
                    creator_id = data.get('creatorId')
                    rooms['active_call'] = {
                        'creator': creator_id,
                        'joiner': None,
                        'created_at': datetime.now().isoformat()
                    }
                    
                    # Notify all other clients about the new call
                    for client_id, client_ws in connected_clients.items():
                        if client_id != creator_id:
                            try:
                                await client_ws.send(json.dumps({
                                    'type': 'activeCall',
                                    'data': rooms['active_call']
                                }))
                            except:
                                pass
                    
                elif msg_type == 'joinCall':
                    joiner_id = data.get('joinerId')
                    creator_id = data.get('creatorId')
                    
                    if 'active_call' in rooms and rooms['active_call']['creator'] == creator_id:
                        rooms['active_call']['joiner'] = joiner_id
                        
                        # Notify creator that someone joined
                        if creator_id in connected_clients:
                            try:
                                await connected_clients[creator_id].send(json.dumps({
                                    'type': 'joinerConnected',
                                    'joinerId': joiner_id
                                }))
                            except:
                                pass
                
                elif msg_type == 'endCall':
                    if 'active_call' in rooms:
                        del rooms['active_call']
                    
                    # Notify all clients that call ended
                    for client_id, client_ws in connected_clients.items():
                        try:
                            await client_ws.send(json.dumps({
                                'type': 'callEnded'
                            }))
                        except:
                            pass
                
                elif msg_type == 'signal':
                    # Forward signaling messages
                    to_peer = data.get('to')
                    if to_peer in connected_clients:
                        try:
                            await connected_clients[to_peer].send(json.dumps({
                                'type': 'signal',
                                'from': data.get('from'),
                                'data': data.get('data')
                            }))
                        except:
                            pass
                            
            except json.JSONDecodeError:
                print(f"Invalid JSON received: {message}")
            except Exception as e:
                print(f"Error handling message: {e}")
                
    except websockets.exceptions.ConnectionClosed:
        print(f"WebSocket connection closed")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Clean up on disconnect
        if peer_id and peer_id in connected_clients:
            del connected_clients[peer_id]
            print(f"Removed peer: {peer_id}")

class SignalingHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Only serve static files now
        super().do_GET()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def cleanup_old_data():
    """Remove old signaling data periodically"""
    while True:
        time.sleep(cleanup_interval)
        current_time = datetime.now()
        cutoff_time = current_time - timedelta(minutes=10)
        
        for peer_id in list(signaling_data.keys()):
            signaling_data[peer_id] = [
                msg for msg in signaling_data[peer_id]
                if datetime.fromisoformat(msg.get('timestamp', '1970-01-01')) > cutoff_time
            ]
            
            if not signaling_data[peer_id]:
                del signaling_data[peer_id]

async def start_websocket_server():
    # Create SSL context for WebSocket
    ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    ssl_context.load_cert_chain('cert.pem', 'key.pem')
    
    print(f"WebSocket server starting on wss://0.0.0.0:{WS_PORT}")
    return await websockets.serve(handle_websocket, "0.0.0.0", WS_PORT, ssl=ssl_context)

def start_http_server():
    # Create HTTPS server for static files
    httpd = socketserver.TCPServer(("", PORT), SignalingHandler)
    
    # Create SSL context
    context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    context.load_cert_chain('cert.pem', 'key.pem')
    
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    
    print(f"HTTPS Server running at https://0.0.0.0:{PORT}/")
    print(f"Access from your phone: https://192.168.1.8:{PORT}/")
    
    httpd.serve_forever()

if __name__ == "__main__":
    async def main():
        # Start WebSocket server
        ws_server = await start_websocket_server()
        
        # Start HTTP server in a separate thread
        http_thread = threading.Thread(target=start_http_server, daemon=True)
        http_thread.start()
        
        print("Both servers running. Press Ctrl+C to stop.")
        
        try:
            await ws_server.wait_closed()
        except KeyboardInterrupt:
            print("\nServers stopped.")
    
    asyncio.run(main())
