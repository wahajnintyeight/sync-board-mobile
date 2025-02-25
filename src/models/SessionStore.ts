import { Instance, SnapshotOut, types } from "mobx-state-tree";
import { createSession } from "../services/api/implementations/sessionApi";

export const SessionStoreModel = types
  .model("SessionStore")
  .props({
    sessionId: types.maybe(types.string),
    message: types.maybe(types.string),
    error: types.maybe(types.string),
  })
  .actions((store) => ({
    setSessionId(id: string) {
      store.sessionId = id;
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
      } catch (error) {
        store.error = error.message;
      }
    },
  }));

export interface SessionStore extends Instance<typeof SessionStoreModel> {}
export interface SessionStoreSnapshot extends SnapshotOut<typeof SessionStoreModel> {} 