import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { withSetPropAction } from "./helpers/withSetPropAction"
import { SessionStore, SessionStoreModel } from "./SessionStore"
import { createRoom, joinRoom, updateRoomName, deleteRoom, getRoomInfo, sendRoomMessage, getRoomMessages } from "../services/api/implementations/roomApi"

export const RoomStoreModel = types
  .model("RoomStore")
  .props({
    currentRoom: types.maybe(types.frozen()),
    roomMessages: types.array(types.frozen()),
    loading: false,
    error: types.maybe(types.string),
    currentPage: 1,
    hasMore: true,
    totalMessages: 0
  })
  .actions(withSetPropAction)
  .actions((store) => ({
    async createNewRoom() {
      store.setProp("loading", true)
      try {
        const response = await createRoom()
        if (response.error != ""){
          const errorMessage = response.message
          store.setProp("error", errorMessage || "Unknown error creating room")
          throw new Error(errorMessage)
        }
        store.setProp("currentRoom", {room: response.result})
        store.setProp("error", undefined)
        return response.result
      } catch (error: unknown) {
        console.error("RoomStore.createNewRoom error:", error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        store.setProp("error", errorMessage || "Unknown error creating room")
        throw error
      } finally {
        store.setProp("loading", false)
      }
    },
    async joinRoomByCode(code: string, deviceInfo: string, sessionStore: SessionStore) {
      store.setProp("loading", true)
      try {
        const response = await joinRoom(code, deviceInfo)
        store.setProp("currentRoom", {room: response.result})
        sessionStore.setDeviceInfo(deviceInfo)
        store.setProp("error", undefined)
        return response.result
      } catch (error: unknown) {
        console.error("RoomStore.joinRoomByCode error:", error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        store.setProp("error", errorMessage)
        throw error
      } finally {
        store.setProp("loading", false)
      }
    },
    async updateRoomName(code: string, roomName: string) {
      store.setProp("loading", true)
      try {
        const response = await updateRoomName(code, roomName)
        store.setProp("error", undefined)
        return response
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        store.setProp("error", errorMessage)
        throw error
      } finally {
        store.setProp("loading", false)
      }
    },
    async deleteRoom(roomId: string) {
      store.setProp("loading", true)
      try {
        const response = await deleteRoom(roomId)
        store.setProp("currentRoom", undefined)
        store.setProp("error", undefined)
        return response
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        store.setProp("error", errorMessage)
        throw error
      } finally {
        store.setProp("loading", false)
      }
    },
    async fetchRoomInfo(roomId: string) {
      store.setProp("loading", true)
      try {
        const response = await getRoomInfo(roomId)
        store.setProp("currentRoom", response.room)
        store.setProp("error", undefined)
        return response
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        store.setProp("error", errorMessage)
        throw error
      } finally {
        store.setProp("loading", false)
      }
    },
    async getRoomMessages(roomCode: string, page: number = 1, limit: number = 10) {
      console.log("GET ROOM MESSAGES CALLED")
      store.setProp("loading", true)
      try {
        const response = await getRoomMessages(roomCode, page, limit)
        if (page === 1) {
          store.setProp("roomMessages", response.messages || [])
        } else {
          store.setProp("roomMessages", [...store.roomMessages, ...(response.messages || [])])
        }
        store.setProp("currentPage", page)
        store.setProp("hasMore", response.hasMore)
        store.setProp("totalMessages", response.totalMessages)
        store.setProp("error", undefined)
        return response
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        store.setProp("error", errorMessage)
        throw error
      } finally {
        store.setProp("loading", false)
      }
    },
    loadMoreMessages(roomCode: string) {
      if (store.hasMore && !store.loading) {
        return store.getRoomMessages(roomCode, store.currentPage + 1)
      }
    },
    async sendMessage(roomCode: string, message: string, sender: string) {
      store.setProp("loading", true)
      try {
        const response = await sendRoomMessage(roomCode, message, sender)
        store.setProp("error", undefined)
        return response
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        store.setProp("error", errorMessage)
        throw error
      } finally {
        store.setProp("loading", false)
      }
    },
    clearRoom() {
      store.setProp("currentRoom", undefined)
      store.setProp("roomMessages", [])
    }
  }))
  .views((store) => ({
    get isInRoom() {
      return !!store.currentRoom
    },
    get roomCode() {
      return store.currentRoom?.code
    },
    get roomId() {
      return store.currentRoom?._id
    },
    get messages() {
      return store.roomMessages
    }
  }))

export interface RoomStore extends Instance<typeof RoomStoreModel> {}
export interface RoomStoreSnapshot extends SnapshotOut<typeof RoomStoreModel> {}
