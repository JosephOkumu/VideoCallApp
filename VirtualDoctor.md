# Virtual Doctor Consultation - WebRTC Implementation

## Implementation Prompt for React-Laravel Doctor Booking Application

### Project Context
You have a doctor booking application built with React frontend and Laravel backend that includes features like AI assistant, payment processing, and appointment management. You need to integrate WebRTC-based video consultation functionality where both doctors and patients can initiate calls from their respective appointment views.

### Core Requirements

#### User Flow
1. **Appointment Context**: Both doctor and patient can access the same appointment
2. **Flexible Initiation**: Either party can click "Start Call" first
3. **Dynamic Join Logic**: The second person sees "Join Call" instead of "Start Call"
4. **WebRTC Integration**: Full video/audio communication with microphone toggle and end call functionality
5. **Real-time Signaling**: Instant notifications when someone starts/joins a call

### Technical Architecture

#### Backend (Laravel)
- **WebSocket Server**: Implement using ReactPHP or Ratchet for real-time signaling
- **Appointment Integration**: Link video calls to specific appointment IDs
- **Authentication**: Ensure only authorized doctor/patient can join their appointment call
- **Database Schema**: Track active calls, call history, and appointment status
- **API Endpoints**: RESTful APIs for call management and appointment updates

#### Frontend (React)
- **WebRTC Components**: React components for video calling interface
- **WebSocket Client**: Real-time connection to Laravel WebSocket server
- **Appointment Views**: Integration with existing doctor/patient dashboards
- **State Management**: Redux/Context for call states and UI updates
- **Responsive Design**: Mobile-friendly video consultation interface

#### WebRTC Signaling Flow
- **Room-based System**: Each appointment creates a unique WebRTC room
- **Peer Discovery**: Automatic detection when doctor/patient joins appointment
- **Signaling Messages**: Offers, answers, and ICE candidates via WebSocket
- **Connection Management**: Handle reconnections and call quality monitoring

### Implementation Prompt

**Please implement a WebRTC video consultation system for my React-Laravel doctor booking application with the following specifications:**

#### Laravel Backend Requirements:
1. **WebSocket Signaling Server** (Critical - Based on Simple WebRTC App)
   - Create a WebSocket server using ReactPHP/Ratchet for real-time signaling
   - Implement the same WebSocket architecture as the simple WebRTC app but appointment-based
   - Handle appointment-based rooms (room ID = appointment ID)
   - Authenticate users before allowing WebSocket connections
   - Store active call sessions in database with timestamps
   - **WebSocket Message Types** (same pattern as simple app):
     ```php
     // WebSocket message handlers needed:
     'register' => registerUser($appointmentId, $userRole)
     'startCall' => broadcastCallStart($appointmentId, $initiatorId)
     'joinCall' => notifyCallJoin($appointmentId, $joinerId)
     'signal' => forwardWebRTCSignaling($appointmentId, $signalData)
     'endCall' => broadcastCallEnd($appointmentId)
     ```

2. **API Endpoints**
   ```php
   // Routes needed:
   POST /api/appointments/{id}/start-call    // Initialize call for appointment
   POST /api/appointments/{id}/join-call     // Join existing call
   POST /api/appointments/{id}/end-call      // Terminate call
   GET  /api/appointments/{id}/call-status   // Check if call is active
   ```

3. **Database Schema Updates**
   ```sql
   // Add to appointments table:
   - call_status (enum: 'inactive', 'waiting', 'active', 'ended')
   - call_started_by (user_id of initiator)
   - call_started_at (timestamp)
   - call_ended_at (timestamp)
   
   // New table: call_sessions
   - id, appointment_id, doctor_id, patient_id
   - status, started_by, started_at, ended_at
   - signaling_data (JSON for WebRTC logs)
   ```

4. **Authentication & Authorization**
   - Verify user belongs to the appointment (doctor or patient)
   - Generate secure WebSocket tokens for authenticated connections
   - Implement role-based access (doctor/patient permissions)

#### React Frontend Requirements:
1. **Video Call Components**
   ```jsx
   // Components to create:
   <VideoConsultation appointmentId={id} userRole="doctor|patient" />
   <VideoCallInterface />
   <CallControls />
   <AppointmentCallButton />
   ```

2. **WebSocket Integration** (Core Feature - Same as Simple WebRTC App)
   - React hook for WebSocket connection management (useWebSocket custom hook)
   - Real-time signaling for WebRTC offers/answers/ICE candidates via WebSocket
   - Automatic reconnection on connection loss (3-second retry like simple app)
   - State synchronization between doctor and patient views
   - **WebSocket Client Implementation**:
     ```javascript
     // React WebSocket hook needed:
     const useAppointmentWebSocket = (appointmentId, userRole) => {
       const wsUrl = `wss://${domain}:8444/appointment/${appointmentId}`;
       // Handle same message types as simple WebRTC app:
       // 'activeCall', 'joinerConnected', 'callEnded', 'signal'
     }
     ```

3. **UI Integration**
   - Add "Start Call" / "Join Call" buttons to appointment cards
   - Video call overlay/modal within existing appointment views
   - Call status indicators in appointment lists
   - Mobile-responsive video consultation interface

4. **State Management**
   ```javascript
   // Redux/Context state structure:
   callState: {
     appointmentId: null,
     status: 'inactive|waiting|active|ended',
     localStream: null,
     remoteStream: null,
     isInitiator: false,
     participants: { doctor: null, patient: null }
   }
   ```

#### WebRTC Implementation Details:
1. **WebSocket Signaling Architecture** (Exact Same Pattern as Simple WebRTC App)
   - Use appointment ID as WebSocket room identifier (instead of random peer IDs)
   - Laravel WebSocket server broadcasts to room participants
   - Handle WebRTC offer/answer exchange via WebSocket (same as simple app)
   - ICE candidate exchange for NAT traversal via WebSocket
   - **WebSocket Server Ports**: 
     - Port 8443: HTTPS server for serving React build
     - Port 8444: WebSocket server for real-time signaling (same as simple app)

2. **Connection Flow**
   ```javascript
   // Implementation flow:
   1. User clicks "Start Call" → API call + WebSocket room join
   2. Other user sees "Join Call" via real-time WebSocket notification
   3. WebRTC peer connection establishment via signaling server
   4. Video/audio streams exchange
   5. Call controls (mute, end call) with bilateral updates
   ```

3. **WebSocket Error Handling & Reconnection** (Same as Simple WebRTC App)
   - Handle WebSocket disconnections gracefully with automatic reconnection
   - 3-second retry interval for WebSocket reconnection (same as simple app)
   - Automatic WebRTC reconnection attempts via WebSocket signaling
   - Fallback UI states for connection issues
   - Call quality monitoring and user feedback
   - **WebSocket Connection Management**:
     ```javascript
     // Same pattern as simple WebRTC app:
     websocket.onclose = () => {
       console.log('WebSocket disconnected');
       setTimeout(() => connectWebSocket(), 3000); // Same 3-second retry
     };
     ```

#### Security Considerations:
1. **Authentication**
   - JWT tokens for WebSocket authentication
   - Verify appointment ownership before allowing calls
   - Rate limiting for call initiation attempts

2. **Privacy & Compliance**
   - HIPAA-compliant call logging (if applicable)
   - Secure WebRTC connections (HTTPS/WSS only)
   - Optional call recording with consent management

#### Integration Points:
1. **Existing Features**
   - Link with appointment scheduling system
   - Integration with payment status (only paid appointments can call)
   - AI assistant integration during calls (optional)
   - Notification system for call invitations

2. **Database Relationships**
   ```php
   // Laravel Model relationships:
   Appointment::hasMany(CallSession::class)
   User::hasMany(CallSession::class, 'doctor_id')
   User::hasMany(CallSession::class, 'patient_id')
   ```

#### Deployment Considerations:
1. **WebSocket Server** (Critical - Same Infrastructure as Simple WebRTC App)
   - Deploy WebSocket server as separate service or integrate with Laravel
   - Configure SSL certificates for WSS connections (same cert.pem/key.pem pattern)
   - Load balancing for multiple WebSocket instances
   - **WebSocket Server Setup** (Based on Simple WebRTC App):
     ```php
     // Laravel WebSocket server implementation:
     // Use ReactPHP/Ratchet to create WebSocket server on port 8444
     // Handle same message types as Python WebSocket server in simple app
     // Appointment-based rooms instead of peer-based rooms
     ```

2. **STUN/TURN Servers**
   - Configure STUN servers for NAT traversal
   - Optional TURN servers for restricted networks
   - Monitor WebRTC connection success rates

### Expected Deliverables:
1. **Laravel WebSocket signaling server** with appointment-based rooms (port 8444)
2. **React WebSocket client components** for video consultation interface
3. **WebSocket message handlers** for real-time signaling (same types as simple app)
4. API endpoints for call management
5. Database migrations for call tracking
6. Authentication and authorization middleware
7. Mobile-responsive UI integration
8. **WebSocket error handling and reconnection logic** (3-second retry pattern)
9. Documentation for deployment and configuration

### Testing Requirements:
- **Unit tests for WebSocket signaling logic** (message handling, room management)
- **WebSocket connection tests** (connect, disconnect, reconnect scenarios)
- Integration tests for appointment-call workflow
- E2E tests for doctor-patient video consultation flow
- Cross-browser compatibility testing
- Mobile device testing (iOS/Android)

### Key WebSocket Implementation Notes:
- **Dual Server Setup**: Laravel serves React app (port 8443) + WebSocket server (port 8444)
- **Same Message Types**: 'register', 'startCall', 'joinCall', 'signal', 'endCall'
- **Room-Based**: Each appointment ID becomes a WebSocket room
- **Real-Time Signaling**: WebRTC offers/answers/ICE candidates via WebSocket
- **Auto-Reconnection**: 3-second retry on WebSocket disconnection
- **SSL/WSS**: Secure WebSocket connections for production

**Please implement this system following the exact same WebSocket-based WebRTC patterns used in the simple WebRTC application, but adapted for the appointment-based, multi-user React-Laravel architecture described above. The WebSocket implementation is the core technology that makes the real-time video consultation possible.**
