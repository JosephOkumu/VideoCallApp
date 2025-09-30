class VideoCallApp {
    constructor() {
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.startCallBtn = document.getElementById('startCall');
        this.joinCallBtn = document.getElementById('joinCall');
        this.endCallBtn = document.getElementById('endCall');
        this.micToggleBtn = document.getElementById('micToggle');
        this.statusDiv = document.getElementById('status');
        this.waitingRoomDiv = document.getElementById('waitingRoom');
        this.joinAvailableDiv = document.getElementById('joinAvailable');
        
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.isCallActive = false;
        this.isWaiting = false;
        this.isMuted = false;
        this.peerId = 'peer_' + Math.random().toString(36).substr(2, 9);
        this.remotePeerId = null;
        this.websocket = null;
        
        this.setupEventListeners();
        this.connectWebSocket();
    }

    connectWebSocket() {
        const wsUrl = `wss://${window.location.hostname}:8444`;
        console.log('Connecting to WebSocket:', wsUrl);
        
        this.websocket = new WebSocket(wsUrl);
        
        this.websocket.onopen = () => {
            console.log('WebSocket connected');
            this.updateStatus('Connected - Ready to start or join a call');
            
            // Register with the server
            this.websocket.send(JSON.stringify({
                type: 'register',
                peerId: this.peerId
            }));
        };
        
        this.websocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('WebSocket message received:', message);
            
            switch (message.type) {
                case 'activeCall':
                    if (message.data && !this.isWaiting && !this.isCallActive) {
                        // Don't show join option to the person who created the call
                        if (message.data.creator !== this.peerId) {
                            this.showJoinOption(message.data);
                        }
                    }
                    break;
                    
                case 'joinerConnected':
                    if (this.isWaiting) {
                        this.remotePeerId = message.joinerId;
                        this.connectToPeer();
                    }
                    break;
                    
                case 'callEnded':
                    this.endCall();
                    break;
                    
                case 'signal':
                    this.handleSignalingMessage(message.from, message.data);
                    break;
            }
        };
        
        this.websocket.onclose = () => {
            console.log('WebSocket disconnected');
            this.updateStatus('Disconnected - Trying to reconnect...');
            
            // Reconnect after 3 seconds
            setTimeout(() => {
                this.connectWebSocket();
            }, 3000);
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    showJoinOption(callData) {
        this.joinAvailableDiv.style.display = 'block';
        this.waitingRoomDiv.style.display = 'none';
        this.startCallBtn.style.display = 'none';
        this.joinCallBtn.style.display = 'flex';
        this.updateStatus('Someone is waiting for you to join!');
        
        // Store the creator ID for connection
        this.remotePeerId = callData.creator;
        console.log('Join option shown for creator:', callData.creator);
    }
    
    showWaitingRoom() {
        this.waitingRoomDiv.style.display = 'block';
        this.joinAvailableDiv.style.display = 'none';
        this.startCallBtn.style.display = 'none';
        this.joinCallBtn.style.display = 'none';
    }

    setupEventListeners() {
        this.startCallBtn.addEventListener('click', () => this.startCall());
        this.joinCallBtn.addEventListener('click', () => this.joinCall());
        this.micToggleBtn.addEventListener('click', () => this.toggleMicrophone());
        this.endCallBtn.addEventListener('click', () => this.endCall());
    }

    async startCall() {
        try {
            this.updateStatus('Starting call...');
            this.startCallBtn.disabled = true;
            this.isWaiting = true;
            
            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            this.localVideo.srcObject = this.localStream;
            this.createPeerConnection();
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            this.isCallActive = true;
            this.showWaitingRoom();
            this.endCallBtn.style.display = 'flex';
            this.updateStatus('Waiting for someone to join...');
            
            // Notify server about starting call
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({
                    type: 'startCall',
                    creatorId: this.peerId
                }));
            }
        } catch (error) {
            console.error('Error starting call:', error);
            this.updateStatus('Error: Could not access camera/microphone');
            this.startCallBtn.disabled = false;
            this.isWaiting = false;
        }
    }
    
    async joinCall() {
        try {
            this.updateStatus('Joining call...');
            this.joinCallBtn.disabled = true;
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            this.localVideo.srcObject = this.localStream;
            this.createPeerConnection();
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            this.isCallActive = true;
            this.joinAvailableDiv.style.display = 'none';
            this.endCallBtn.style.display = 'flex';
            
            // Notify server about joining call
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({
                    type: 'joinCall',
                    joinerId: this.peerId,
                    creatorId: this.remotePeerId
                }));
            }
            
            this.updateStatus('Connecting to call...');
        } catch (error) {
            console.error('Error joining call:', error);
            this.updateStatus('Error: Could not access camera/microphone');
            this.joinCallBtn.disabled = false;
        }
    }

    createPeerConnection() {
        // Using free STUN servers for NAT traversal
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            this.remoteVideo.srcObject = this.remoteStream;
            this.updateStatus('Connected to peer');
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.remotePeerId) {
                this.sendSignalingMessage(this.remotePeerId, {
                    type: 'ice-candidate',
                    candidate: event.candidate
                });
            }
        };

        // Handle connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'connected') {
                this.updateStatus('Video call connected!');
            } else if (this.peerConnection.connectionState === 'disconnected') {
                this.updateStatus('Call disconnected');
            }
        };
    }

    async connectToPeer() {
        if (!this.isCallActive || !this.remotePeerId) return;

        try {
            this.updateStatus('Connecting to peer...');
            
            // Create offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            // Send offer via WebSocket
            this.sendSignalingMessage(this.remotePeerId, {
                type: 'offer',
                offer: offer
            });
        } catch (error) {
            console.error('Error connecting to peer:', error);
            this.updateStatus('Connection failed');
        }
    }

    handleSignalingMessage(from, data) {
        console.log('Handling signaling message from', from, ':', data);
        
        switch (data.type) {
            case 'offer':
                this.handleOffer(from, data.offer);
                break;
            case 'answer':
                this.handleAnswer(from, data.answer);
                break;
            case 'ice-candidate':
                this.handleIceCandidate(from, data.candidate);
                break;
        }
    }
    
    async handleOffer(from, offer) {
        try {
            this.remotePeerId = from;
            await this.peerConnection.setRemoteDescription(offer);
            
            // Create answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            // Send answer via WebSocket
            this.sendSignalingMessage(from, {
                type: 'answer',
                answer: answer
            });
            
            this.updateStatus('Connected!');
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }
    
    async handleAnswer(from, answer) {
        try {
            await this.peerConnection.setRemoteDescription(answer);
            this.updateStatus('Connected!');
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }
    
    async handleIceCandidate(from, candidate) {
        try {
            if (this.peerConnection) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    sendSignalingMessage(to, data) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'signal',
                from: this.peerId,
                to: to,
                data: data
            }));
        }
    }
    
    async endCall() {
        try {
            this.isCallActive = false;
            this.isWaiting = false;
            
            // Stop local stream
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }
            
            // Close peer connection
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }
            
            // Reset UI
            this.localVideo.srcObject = null;
            this.remoteVideo.srcObject = null;
            this.waitingRoomDiv.style.display = 'none';
            this.joinAvailableDiv.style.display = 'none';
            this.startCallBtn.style.display = 'flex';
            this.joinCallBtn.style.display = 'none';
            this.endCallBtn.style.display = 'none';
            this.startCallBtn.disabled = false;
            this.joinCallBtn.disabled = false;
            
            // Notify server
            if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                this.websocket.send(JSON.stringify({
                    type: 'endCall'
                }));
            }
            
            this.updateStatus('Call ended');
        } catch (error) {
            console.error('Error ending call:', error);
        }
    }
    
    toggleMicrophone() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.isMuted = !audioTrack.enabled;
                
                const micIcon = this.micToggleBtn.querySelector('.mic-icon');
                const micText = this.micToggleBtn.querySelector('.mic-text');
                
                if (this.isMuted) {
                    micIcon.textContent = '🔇';
                    micText.textContent = 'Mic Off';
                    this.micToggleBtn.classList.remove('active');
                } else {
                    micIcon.textContent = '🎤';
                    micText.textContent = 'Mic On';
                    this.micToggleBtn.classList.add('active');
                }
            }
        }
    }
    
    updateStatus(message) {
        this.statusDiv.textContent = `Status: ${message}`;
        console.log(message);
    }
}

// Initialize the app
const app = new VideoCallApp();
