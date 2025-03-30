/**
 * This Api class lets you define an API endpoint and methods to request
 * data and process it.
 *
 * See the [Backend API Integration](https://docs.infinite.red/ignite-cli/boilerplate/app/services/#backend-api-integration)
 * documentation for more details.
 */
import { ApiResponse, ApisauceInstance, create, AUTH_HEADERS, DEFAULT_HEADERS } from "apisauce"
import Config from "../../config"
import { GeneralApiProblem, getGeneralApiProblem } from "./apiProblem"
import type { ApiConfig, ApiFeedResponse } from "./api.types"
import type { EpisodeSnapshotIn } from "../../models/Episode"
import { createSession } from "./implementations/sessionApi"
import { createRoom, getRoom, joinRoom, leaveRoom, sendMessage, getMessages, getRoomMembers, getRoomMember, updateRoomName } from "./implementations/roomApi"
import { storage } from "@/utils/storage"
import { SessionStoreModel } from "@/models/SessionStore"
import { useStores } from "@/models/helpers/useStores"
import { RootStoreModel } from "@/models"

/**
 * Configuring the apisauce instance.
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL,
  timeout: 10000,
}

/**
 * Manages all requests to the API. You can use this class to build out
 * various requests that you need to call from your backend API.
 */
export class Api {
  apisauce: ApisauceInstance
  config: ApiConfig

  /**
   * Set up our API instance. Keep this lightweight!
   */
  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {

    this.config = config
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: DEFAULT_HEADERS
    })
    // Add a request transform to ensure the latest sessionId is used for each request
    this.prepareSessionHeader()
  }

  prepareSessionHeader() {
    this.apisauce.addAsyncRequestTransform(async (request) => {
      const latestSessionId = await storage.getString("sessionId")
      if (latestSessionId) {
        request.headers["sessionId"] = latestSessionId
      } 
    })
  }

  handleSessionExpiry() {
    this.apisauce.addAsyncResponseTransform(async response => {
      const responseData = response.data
      if (responseData.code === 1006) {
        storage.delete("sessionId")
        storage.delete("sessionExpiry")
        //call createSession
        await this.createSession({ sessionId: "" })
      }
    })
  }

  /**
   * Gets a list of recent React Native Radio episodes.
   */
  async getEpisodes(): Promise<{ kind: "ok"; episodes: EpisodeSnapshotIn[] } | GeneralApiProblem> {
    // make the api call
    const response: ApiResponse<ApiFeedResponse> = await this.apisauce.get(
      `api.json?rss_url=https%3A%2F%2Ffeeds.simplecast.com%2FhEI_f9Dx`,
    )

    // the typical ways to die when calling an api
    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) return problem
    }

    // transform the data into the format we are expecting
    try {
      const rawData = response.data

      // This is where we transform the data into the shape we expect for our MST model.
      const episodes: EpisodeSnapshotIn[] =
        rawData?.items.map((raw) => ({
          ...raw,
        })) ?? []

      return { kind: "ok", episodes }
    } catch (e) {
      if (__DEV__ && e instanceof Error) {
        console.error(`Bad data: ${e.message}\n${response.data}`, e.stack)
      }
      return { kind: "bad-data" }
    }
  }

  // Expose the createSession function
  createSession = createSession

  // Expose the createRoom function
  createRoom = createRoom

  // Expose the getRoom function
  getRoom = getRoom

  // Expose the joinRoom function
  joinRoom = joinRoom

  // Expose the leaveRoom function
  // leaveRoom = leaveRoom

  // Expose the sendMessage function
  sendMessage = sendMessage

  // Expose the getMessages function
  getMessages = getMessages

  // Expose the getRoomMembers function
  getRoomMembers = getRoomMembers

  // Expose the getRoomMember function
  getRoomMember = getRoomMember

  // Expose the updateRoomName function
  // updateRoomName = updateRoomName
}

// Singleton instance of the API for convenience
export const api = new Api()
