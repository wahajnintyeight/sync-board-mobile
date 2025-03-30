import { Instance, SnapshotIn, SnapshotOut, types } from "mobx-state-tree"
import { withSetPropAction } from "./helpers/withSetPropAction"

/**
 * Room member model
 */
export const RoomMemberModel = types
  .model("RoomMember")
  .props({
    ip: types.maybe(types.string),
    userAgent: types.maybe(types.string),
    joinedAt: types.maybe(types.Date),
    deviceInfo: types.maybe(types.string)
  })

/**
 * Room message model
 */
export const RoomMessageModel = types
  .model("RoomMessage")
  .props({
    id: types.maybe(types.string),
    content: types.maybe(types.string),
    sender: types.maybe(types.string),
    timestamp: types.maybe(types.Date)
  })

/**
 * Room model representing a clipboard room
 */
export const RoomModel = types
  .model("Room")
  .props({
    _id: types.maybe(types.string),
    roomName: types.maybe(types.string),
    createdAt: types.maybe(types.Date),
    updatedAt: types.maybe(types.Date),
    totalMessages: types.optional(types.number, 0),
    lastMessage: types.maybe(types.Date),
    code: types.maybe(types.string),
    messages: types.optional(types.array(RoomMessageModel), []),
    members: types.optional(types.array(RoomMemberModel), [])
  })
  .actions(withSetPropAction)
  .views((self) => ({
    get memberCount() {
      return self.members.length
    },
    get onlineMemberCount() {
      // This is a placeholder - in a real app, you'd need to track online status
      return self.members.length
    }
  }))
  .actions((self) => ({
    updateRoomName(newName: string) {
      self.roomName = newName
    },
    addMessage(message: typeof RoomMessageModel.Type) {
      self.messages.push(message)
      self.totalMessages += 1
      self.lastMessage = new Date()
    }
  }))

export interface Room extends Instance<typeof RoomModel> {}
export interface RoomSnapshotOut extends SnapshotOut<typeof RoomModel> {}
export interface RoomSnapshotIn extends SnapshotIn<typeof RoomModel> {}
export const createRoomDefaultModel = () => types.optional(RoomModel, {})

