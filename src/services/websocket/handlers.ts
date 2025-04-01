import { SocketStore } from "../../models/SocketStore"

/**
 * Set up WebSocket event handlers
 * 
 * @param socketStore The MobX-State-Tree socket store
 * @param socket WebSocket instance
 * @param userId User identifier (optional)
 * @param roomCode Room code (optional)
 * @param deviceInfo Device information
 */
export const setupSocketHandlers = (
  socketStore: SocketStore,
  socket: WebSocket,
  userId: string | null,
  roomCode: string | null,
  deviceInfo: any
) => {
  console.log('[WebSocket] Setting up socket handlers');
  
  // Store references to original listeners so we can remove them later
  const onOpenListener = () => {
    console.log('[WebSocket] Socket connected');
    if (socketStore.isAlive) {
      socketStore.setConnected(true);

      // Send join message if room code is provided
      if (roomCode != null) {
        socketStore.sendSocketMessage('joinClipRoom', {
          code: roomCode,
          isAnonymous: !userId,
          userId: userId || '',
          deviceInfo
        });
      }
    } else {
      console.warn('[WebSocket] Store is detached, cannot handle onOpen');
    }
  };

  // Handle socket close event
  const onCloseListener = () => {
    console.log('[WebSocket] Socket closed');
    if (socketStore.isAlive) {
      socketStore.setConnected(false);
      socketStore.setProp("error", 'Socket connection closed');
    } else {
      console.warn('[WebSocket] Store is detached, cannot handle onClose');
    }
  };

  // Handle socket error event
  const onErrorListener = (error: Event) => {
    console.error('[WebSocket] Socket error:', error);
    if (socketStore.isAlive) {
      socketStore.setConnected(false);
      socketStore.setProp("error", `Socket error: ${error}`);
    } else {
      console.warn('[WebSocket] Store is detached, cannot handle onError');
    }
  };

  // Handle incoming messages
  const onMessageListener = (event: MessageEvent) => {
    try {
      const socketData = JSON.parse(event.data);
      console.log('[WebSocket] Message received:', socketData.action);
      
      // Skip processing if store is detached
      if (!socketStore.isAlive) {
        console.warn('[WebSocket] Store is detached, cannot process message');
        return;
      }
      
      switch (socketData.action) {
        case 'sendRoomMessage':
          handleRoomMessage(socketStore, socketData, userId, deviceInfo);
          break;
          
        case 'memberJoined':
          socketStore.addMember(socketData.payload);
          break;
          
        case 'memberLeft':
          socketStore.removeMember(socketData.payload.id);
          break;
          
        default:
          console.log('[WebSocket] Unhandled message type:', socketData);
      }
    } catch (error) {
      console.error('[WebSocket] Error processing message:', error);
    }
  };

  // Set up event listeners
  socket.addEventListener('open', onOpenListener);
  socket.addEventListener('close', onCloseListener);
  socket.addEventListener('error', onErrorListener);
  socket.addEventListener('message', onMessageListener);

  // Return a cleanup function to remove event listeners
  return () => {
    console.log('[WebSocket] Cleaning up event listeners');
    try {
      socket.removeEventListener('open', onOpenListener);
      socket.removeEventListener('close', onCloseListener);
      socket.removeEventListener('error', onErrorListener);
      socket.removeEventListener('message', onMessageListener);
    } catch (error) {
      console.error('[WebSocket] Error cleaning up listeners:', error);
    }
  };
}

/**
 * Handle room messages
 * 
 * @param socketStore The MobX-State-Tree socket store
 * @param socketData Data received from the socket
 * @param userId User identifier
 * @param deviceInfo Device information
 */
const handleRoomMessage = (
  socketStore: SocketStore,
  socketData: any,
  userId: string | null,
  deviceInfo: any
) => {
  console.log('[WebSocket] Processing room message');
  
  if (!socketStore.isAlive) {
    console.warn('[WebSocket] Store is detached, cannot handle room message');
    return;
  }
  
  // Skip messages from the same anonymous device
  if (
    socketData.data.isAnonymous === true &&
    socketData.data.deviceInfo === deviceInfo.slugifiedDeviceName
  ) {
    console.log('[WebSocket] Skipping own anonymous message');
    return;
  }
  
  // Create new message object
  const newMessage = {
    message: socketData.data.message,
    sender: userId || '',
    timeStamp: socketData.data.timeStamp,
    isAttachment: socketData.data.isAttachment || false,
    attachmentType: socketData.data.attachmentType || '',
    attachmentURL: socketData.data.attachmentURL || '',
    deviceInfo: deviceInfo.slugifiedDeviceName,
    isAnonymous: socketData.data.userId === '' ? true : false
  }
  
  // Add message to store
  socketStore.addMessage(newMessage);
}
