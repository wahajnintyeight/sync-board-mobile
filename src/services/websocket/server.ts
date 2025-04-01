import { SocketStore } from "../../models/SocketStore"
import { setupSocketHandlers } from "./handlers"
import {getDeviceInfo} from "../../utils/deviceInfo" // Using the proper utility

/**
 * Initialize WebSocket connection and set up event handlers
 * 
 * @param socketStore The MobX-State-Tree socket store
 * @param roomId Room identifier
 * @param userId User identifier (optional)
 * @param roomCode Room code (optional)
 */
export const initializeWebSocket = async (
  socketStore: SocketStore,
  roomId: string,
  userId: string | null,
  roomCode: string | null
) => {
  console.log('[WebSocketServer] Initializing WebSocket connection', { roomId, userId: userId ? 'exists' : 'null' });
  
  // Track if we got an early cleanup
  let isCleaned = false;
  let cleanupHandlers: (() => void) | null = null;
  
  try {
    // First get device info
    const deviceInfo = await getDeviceInfo();
    console.log('[WebSocketServer] Device info obtained');
    
    // Check if store is still alive before proceeding
    if (!socketStore.isAlive) {
      console.warn('[WebSocketServer] Store is detached, aborting initialization');
      return { cleanup: () => {} };
    }
    
    socketStore.setDeviceInfo(deviceInfo);
    
    // Connect to WebSocket
    const isConnected = socketStore.connect(roomId, userId, roomCode);
    if (!isConnected) {
      throw new Error("Failed to connect socket");
    }
    
    // Set up event handlers for the socket
    if (socketStore.socket) {
      console.log('[WebSocketServer] Setting up event handlers');
      cleanupHandlers = setupSocketHandlers(socketStore, socketStore.socket, userId, roomCode, deviceInfo);
    } else {
      throw new Error("Failed to create WebSocket connection");
    }
    
    // Return a cleanup function
    return {
      cleanup: () => {
        console.log('[WebSocketServer] Running cleanup function');
        isCleaned = true;
        if (cleanupHandlers) {
          cleanupHandlers();
        }
        
        try {
          if (socketStore.isAlive) {
            disconnectWebSocket(socketStore);
          }
        } catch (error) {
          console.error('[WebSocketServer] Cleanup error:', error);
        }
      }
    };
  } catch (error) {
    console.error("[WebSocketServer] Error initializing WebSocket:", error);
    if (socketStore.isAlive) {
      socketStore.setProp("error", `WebSocket initialization error: ${error}`);
    }
    
    // Return empty cleanup if we have an error
    return {
      cleanup: () => {
        console.log('[WebSocketServer] Running error cleanup function');
        isCleaned = true;
        if (cleanupHandlers) {
          cleanupHandlers();
        }
      }
    };
  }
}

/**
 * Disconnect from WebSocket
 * 
 * @param socketStore The MobX-State-Tree socket store
 */
export const disconnectWebSocket = (socketStore: SocketStore) => {
  console.log('[WebSocketServer] Disconnecting WebSocket');
  if (socketStore.isAlive) {
    socketStore.disconnect();
  } else {
    console.warn('[WebSocketServer] Cannot disconnect - store is detached');
  }
}

/**
 * Send a message through the WebSocket
 * 
 * @param socketStore The MobX-State-Tree socket store
 * @param message Message content
 */
export const sendWebSocketMessage = (socketStore: SocketStore, message: string) => {
  console.log('[WebSocketServer] Sending message');
  if (socketStore.isAlive) {
    return socketStore.sendMessage(message);
  } else {
    console.warn('[WebSocketServer] Cannot send message - store is detached');
    return false;
  }
}

/**
 * Send a custom event through the WebSocket
 * 
 * @param socketStore The MobX-State-Tree socket store
 * @param eventType Type of event
 * @param data Event data
 */
export const sendWebSocketEvent = (socketStore: SocketStore, eventType: string, data: any) => {
  console.log(`[WebSocketServer] Sending custom event: ${eventType}`);
  if (socketStore.isAlive) {
    return socketStore.sendSocketMessage(eventType, data);
  } else {
    console.warn('[WebSocketServer] Cannot send event - store is detached');
    return false;
  }
}
