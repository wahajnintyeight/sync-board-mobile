import { Instance, SnapshotOut, types } from "mobx-state-tree";
import { createSession } from "../services/api/implementations/sessionApi";
import { createRoom } from "../services/api/implementations/roomApi";

export const SessionStoreModel = types
  .model("SessionStore")
  .props({
    sessionId: types.maybe(types.string),
    roomId: types.maybe(types.string),
    message: types.maybe(types.string),
    error: types.maybe(types.string),
  })
  .actions((store) => ({
    setSessionId(id: string) {
      store.sessionId = id;
    },
    setRoomId(id: string) {
      store.roomId = id;
    },
    setMessage(msg: string) {
      store.message = msg;
    },
    setError(err: string) {
      store.error = err;
    },
    async createSession(sessionData: { [key: string]: any }) {
      try {
        const response = await createSession(sessionData);
        console.log("response", response)
        store.sessionId = response.sessionId || "";
        store.message = response.message || "";
        store.error = response.error || "";
      } catch (error: unknown) {
        // Type guard for error
        if (error instanceof Error) {
          store.error = error.message;
        } else {
          store.error = String(error);
        }
      }
    },
    getSessionId() {
      return store.sessionId;
    }
  }));

export interface SessionStore extends Instance<typeof SessionStoreModel> {}
export interface SessionStoreSnapshot extends SnapshotOut<typeof SessionStoreModel> {} 