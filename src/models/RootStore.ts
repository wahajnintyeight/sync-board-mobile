import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { SocketStoreModel } from "./SocketStore"
import { AuthenticationStoreModel } from "./AuthenticationStore"
import { EpisodeStoreModel } from "./EpisodeStore"
import { SessionStoreModel } from "./SessionStore"
import { RoomStoreModel } from "./RoomStore"

/**
 * A RootStore model.
 */
export const RootStoreModel = types.model("RootStore").props({
  socketStore: types.optional(SocketStoreModel, {} as any),
  authenticationStore: types.optional(AuthenticationStoreModel, {}),
  episodeStore: types.optional(EpisodeStoreModel, {}),
  sessionStore: types.optional(SessionStoreModel, {}),
  roomStore: types.optional(RoomStoreModel, {})
})

/**
 * The RootStore instance.
 */
export interface RootStore extends Instance<typeof RootStoreModel> {}
/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStoreModel> {}
