# Simple Video Call Application

A WebRTC-based video calling application with automatic peer discovery, microphone toggle, and call end functionality. Features real-time WebSocket signaling for seamless connections between devices on the same network.

## Features

- **Automatic Peer Discovery**: No manual link sharing - second device automatically detects available calls
- **Real-time Video Calling**: WebRTC peer-to-peer video communication
- **WebSocket Signaling**: Instant connection notifications and WebRTC signaling
- **Microphone Toggle**: Blue button to mute/unmute audio with visual feedback
- **End Call**: Red button to terminate calls on both devices
- **HTTPS Support**: Secure connections for mobile camera/microphone access
- **Responsive Design**: Works on desktop and mobile devices
- **Cross-Device**: Connect laptop and phone on the same WiFi network

## Quick Start

### 1. Install Dependencies
```bash
pip3 install websockets
```

### 2. Start the Server
```bash
python3 signaling_server.py
```

### 3. Access the Application
- **Laptop**: `https://localhost:8443/`
- **Phone**: `https://192.168.1.8:8443/` (replace with your laptop's IP)

### 4. Make a Video Call
1. **Laptop**: Click "Start Call" → Shows "Waiting for someone to join..."
2. **Phone**: Automatically shows "Join Call" button → Click it
3. **Both devices**: Allow camera/microphone permissions
4. **Connected**: See each other's video streams instantly!

## How It Works

### Automatic Join Flow
1. User on laptop clicks "Start Call"
2. WebSocket server broadcasts call availability
3. Other devices on the network instantly see "Join Call" option
4. No manual link sharing or room codes needed

### WebSocket Signaling
- **Port 8443**: HTTPS server for serving files
- **Port 8444**: WebSocket server for real-time signaling
- Handles WebRTC offers, answers, and ICE candidates
- Automatic reconnection on connection loss

## Technical Architecture

### Server Components
- **signaling_server.py**: Dual-server setup (HTTPS + WebSocket)
- **SSL Certificates**: `cert.pem` and `key.pem` for HTTPS/WSS
- **Real-time Communication**: WebSocket-based signaling instead of HTTP polling

### Client Components
- **script.js**: WebSocket client with WebRTC integration
- **index.html**: Modern UI with video elements and controls
- **styles.css**: Responsive design with gradient backgrounds

### WebRTC Configuration
- **STUN Servers**: Google's free STUN servers for NAT traversal
- **ICE Candidates**: Automatic exchange via WebSocket
- **Media Constraints**: Video + Audio with mobile optimization

## File Structure

```
WebRTC/
├── signaling_server.py    # WebSocket + HTTPS server
├── script.js             # WebSocket client + WebRTC logic
├── index.html            # UI structure
├── styles.css            # Responsive styling
├── cert.pem             # SSL certificate
├── key.pem              # SSL private key
├── https_server.py      # Legacy HTTP server (unused)
└── README.md            # This documentation
```

## Browser Requirements

- **Chrome 56+** (recommended)
- **Firefox 44+**
- **Safari 11+**
- **Edge 79+**
- **Mobile browsers** with WebRTC support

## Security & HTTPS

### Why HTTPS is Required
- WebRTC requires secure contexts for camera/microphone access
- Mobile devices especially strict about permissions
- WebSocket connections use WSS (secure WebSocket)

### SSL Certificate Setup
The application uses self-signed certificates for local development:
- Accept security warnings when first accessing
- Certificates work for local network access (192.168.x.x)

## Troubleshooting

### WebSocket Connection Issues
```bash
# Check if server is running
ps aux | grep signaling_server

# Restart server
pkill -f signaling_server.py
python3 signaling_server.py
```

### Camera/Microphone Access
- Ensure HTTPS connection (not HTTP)
- Accept browser permission prompts
- Check browser settings for camera/microphone permissions

### Network Connectivity
- Both devices must be on same WiFi network
- Check firewall settings for ports 8443 and 8444
- Use laptop's actual IP address for phone connection

## Development Notes

### WebSocket Message Types
- `register`: Client registers with server
- `startCall`: Creator starts a call
- `activeCall`: Server notifies about available calls
- `joinCall`: Joiner connects to call
- `signal`: WebRTC signaling (offers, answers, ICE candidates)
- `endCall`: Terminate call on all devices

### Key Improvements Over HTTP Polling
- **Instant notifications**: No 2-second polling delays
- **Real-time signaling**: WebRTC messages sent immediately
- **Better UX**: Immediate "Join Call" button appearance
- **Reduced server load**: No constant HTTP requests

## Future Enhancements

- Multiple simultaneous calls support
- Screen sharing functionality
- Chat messaging during calls
- Call recording capabilities
- TURN server integration for better NAT traversal



## Option 1: Laravel WebSockets Package is the simplest and best for your needs.

🎯 Single Server Solution:
bash
# Just add to your existing Laravel project
```bash
composer require beyondcode/laravel-websockets
php artisan websockets:serve
```