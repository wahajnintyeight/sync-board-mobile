import { Instance, SnapshotIn, SnapshotOut, types, destroy, getEnv, getRoot, isAlive, clone } from "mobx-state-tree"
import { withSetPropAction } from "./helpers/withSetPropAction"
import Config from "@/config"

// Message structure for chat messages
const MessageModel = types.model("Message")
  .props({
    message: types.string,
    sender: types.string,
    timeStamp: types.maybeNull(types.string),
    isAttachment: types.optional(types.boolean, false),
    attachmentType: types.optional(types.string, ""),
    attachmentURL: types.optional(types.string, ""),
    deviceInfo: types.maybeNull(types.string),
    isAnonymous: types.optional(types.boolean, false),
  })

// Member model for room participants
const MemberModel = types.model("Member")
  .props({
    id: types.string,
    // Add other member properties as needed
  })

/**
 * WebSocket store for managing socket connections and messages
 */
export const SocketStoreModel = types
  .model("SocketStore")
  .props({
    isConnected: types.optional(types.boolean, false),
    roomId: types.maybeNull(types.string),
    roomCode: types.maybeNull(types.string),
    messages: types.optional(types.array(MessageModel), []),
    members: types.optional(types.array(MemberModel), []),
    error: types.maybeNull(types.string),
    deviceInfo: types.maybeNull(types.frozen()),
    lastMessage: types.maybeNull(types.string)
  })
  .volatile(self => ({
    // Store WebSocket reference in volatile state
    socket: null as WebSocket | null,
    // Track if cleanup has been performed
    hasBeenCleaned: false,
    // Store cleanup handler
    cleanupHandler: null as (() => void) | null,
  }))
  .actions(withSetPropAction)
  .views(self => ({
    get connectionStatus() {
      return {
        isConnected: self.isConnected,
        roomId: self.roomId,
        roomCode: self.roomCode
      }
    },
    
    get isAlive() {
      try {
        return isAlive(self);
      } catch (e) {
        console.log("[SocketStore] Error checking if store is alive:", e);
        return false;
      }
    }
  }))
  .actions(self => ({
    afterCreate() {
      console.log("[SocketStore] Store created");
    },
    
    beforeDestroy() {
      console.log("[SocketStore] Store being destroyed, cleaning up");
      this.cleanup();
    },
    
    cleanup() {
      if (self.hasBeenCleaned) {
        console.log("[SocketStore] Already cleaned up, skipping");
        return;
      }
      
      try {
        console.log("[SocketStore] Running cleanup");
        
        // Run cleanup handler if exists
        if (self.cleanupHandler) {
          self.cleanupHandler();
          self.cleanupHandler = null;
        }
        
        // Close socket if open
        if (self.socket) {
          try {
            if (self.socket.readyState === WebSocket.OPEN) {
              self.socket.close(1000, "Cleanup");
            }
          } catch (e) {
            console.error("[SocketStore] Error closing socket:", e);
          }
          self.socket = null;
        }
        
        self.hasBeenCleaned = true;
        console.log("[SocketStore] Cleanup complete");
      } catch (error) {
        console.error("[SocketStore] Error during cleanup:", error);
      }
    },
    
    setCleanupHandler(handler: () => void) {
      self.cleanupHandler = handler;
    },
    
    connect(roomId: string, userId: string | null, roomCode: string | null) {
      try {
        console.log('[SocketStore] Connecting to socket', `${Config.WS_URL}?room=${roomId}`);
        
        // First ensure we're cleaned up
        this.cleanup();
        self.hasBeenCleaned = false;
        
        const socketURL = Config.WS_URL;
        const newSocket = new WebSocket(`${socketURL}?room=${roomId}`);
        
        self.setProp("roomId", roomId);
        self.setProp("roomCode", roomCode);
        self.setProp("error", null);
        self.setProp("isConnected", false);
        self.socket = newSocket;
        
        console.log('[SocketStore] Socket created:', !!self.socket);
        return true;
      } catch (error) {
        console.error('[SocketStore] WebSocket connection error:', error);
        self.setProp("error", `Connection error: ${error}`);
        return false;
      }
    },

    disconnect() {
      try {
        console.log('[SocketStore] Disconnecting socket...');
        if (self.socket && self.socket.readyState === WebSocket.OPEN) {
          // Send disconnect message
          this.sendSocketMessage('disconnect', {
            roomId: 'room-'+self.roomCode
          });

          // Close the socket properly
          setTimeout(() => {
            try {
              if (self.socket) {
                self.socket.close(1000, 'Normal closure');
                console.log('[SocketStore] Socket closed');
              }
              this.reset();
            } catch (error) {
              console.error('[SocketStore] Error in disconnect timeout:', error);
            }
          }, 100);
        } else {
          this.reset();
        }
      } catch (error) {
        console.error('[SocketStore] Error disconnecting:', error);
        self.setProp("error", `Disconnect error: ${error}`);
        this.reset();
      }
    },

    reset() {
      try {
        console.log('[SocketStore] Resetting store');
        self.setProp("isConnected", false);
        self.setProp("roomId", null);
        self.setProp("roomCode", null);
        self.setProp("error", null);
        self.setProp("deviceInfo", null);
        self.setProp("lastMessage", null);
        
        // Clear arrays using replacements to avoid detachment issues
        self.setProp("messages", []);
        self.setProp("members", []);
        
        self.socket = null;
      } catch (error) {
        console.error('[SocketStore] Error resetting store:', error);
      }
    },

    setDeviceInfo(deviceInfo: any) {
      self.setProp("deviceInfo", deviceInfo);
    },

    sendMessage(message: string) {
      try {
        console.log('[SocketStore] Sending message', self.socket?.readyState);
        if (!self.socket || self.socket.readyState !== WebSocket.OPEN) {
          throw new Error('Socket not connected');
        }
        
        const messageData = {
          roomId: self.roomId,
          code: self.roomCode,
          message,
          timeStamp: new Date().toISOString(),
          sender: null, // Will be set by server
          isAttachment: false,
          attachmentType: '',
          attachmentURL: '',
          isAnonymous: true,
          deviceInfo: self.deviceInfo
        };

        this.sendSocketMessage('sendRoomMessage', messageData);
        return true;
      } catch (error) {
        console.error('[SocketStore] Send message error:', error);
        self.setProp("error", `Send message error: ${error}`);
        return false;
      }
    },

    sendSocketMessage(eventType: string, data: any) {
      try {
        if (self.socket && self.socket.readyState === WebSocket.OPEN) {
          const msg = {
            action: eventType,
            data: data
          };
          console.log('[SocketStore] Sending message', msg);
          self.socket.send(JSON.stringify(msg));
          console.log(`[SocketStore] Sent ${eventType} message`);
          return true;
        }
        return false;
      } catch (error) {
        console.error(`[SocketStore] Error sending ${eventType} message:`, error);
        return false;
      }
    },

    clearMessages() {
      try {
        // Replace array instead of modifying in place
        self.setProp("messages", []);
      } catch (error) {
        console.error('[SocketStore] Error clearing messages:', error);
      }
    },

    clearError() {
      self.setProp("error", null);
    },

    addMessage(messageData: any) {
      try {
        // Create a new array with the new message to avoid modification issues
        const newMessages = [...self.messages.slice(), messageData];
        self.setProp("messages", newMessages);
        self.setProp("lastMessage", messageData.timeStamp);
        console.log('[SocketStore] Message added, total:', self.messages.length);
      } catch (error) {
        console.error('[SocketStore] Error adding message:', error);
      }
    },

    addMember(member: any) {
      try {
        // Create a new array with the new member to avoid modification issues
        const newMembers = [...self.members.slice(), member];
        self.setProp("members", newMembers);
        console.log('[SocketStore] Member added, total:', self.members.length);
      } catch (error) {
        console.error('[SocketStore] Error adding member:', error);
      }
    },

    removeMember(memberId: string) {
      try {
        const filteredMembers = self.members.filter(m => m.id !== memberId);
        self.setProp("members", filteredMembers);
        console.log('[SocketStore] Member removed, remaining:', filteredMembers.length);
      } catch (error) {
        console.error('[SocketStore] Error removing member:', error);
      }
    },

    setConnected(connected: boolean) {
      self.setProp("isConnected", connected);
      console.log('[SocketStore] Connection status set to:', connected);
    }
  }));

export interface SocketStore extends Instance<typeof SocketStoreModel> {}
export interface SocketStoreSnapshotOut extends SnapshotOut<typeof SocketStoreModel> {}
export interface SocketStoreSnapshotIn extends SnapshotIn<typeof SocketStoreModel> {}
export const createSocketStoreDefaultModel = () => types.optional(SocketStoreModel, {})

