import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { withSetPropAction } from "./helpers/withSetPropAction"
import { createRoom, joinRoom, updateRoomName, deleteRoom, getRoomInfo, sendRoomMessage } from "../services/api/implementations/roomApi"

export const RoomStoreModel = types
  .model("RoomStore")
  .props({
    currentRoom: types.maybe(types.frozen()),
    roomMessages: types.array(types.frozen()),
    loading: false,
    error: types.maybe(types.string)
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
    async joinRoomByCode(code: string, deviceInfo: string) {
      store.setProp("loading", true)
      try {
        const response = await joinRoom(code, deviceInfo)
        store.setProp("currentRoom", {room: response.result})
        store.setProp("error", undefined)
        return response.result
      } catch (error: unknown) {
        console.error("RoomStore.joinRoomByCode error:", error)
        const errorMessage = error instanceof Error ? error.message : String(error)
        store.setProp("error", error.message)
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
      } catch (error) {
        store.setProp("error", error.message)
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
      } catch (error) {
        store.setProp("error", error.message)
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
      } catch (error) {
        store.setProp("error", error.message)
        throw error
      } finally {
        store.setProp("loading", false)
      }
    },
    async sendMessage(roomCode: string, message: string, sender: string) {
      store.setProp("loading", true)
      try {
        const response = await sendRoomMessage(roomCode, message, sender)
        store.setProp("error", undefined)
        return response
      } catch (error) {
        store.setProp("error", error.message)
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
    }
  }))

export interface RoomStore extends Instance<typeof RoomStoreModel> {}
export interface RoomStoreSnapshot extends SnapshotOut<typeof RoomStoreModel> {}
