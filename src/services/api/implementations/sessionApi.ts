import { ApiResponse } from "apisauce";
import { storage } from "../../../utils/storage";
import { getGeneralApiProblem } from "../apiProblem";
import { api } from "../api"; // Import the base API instance

/**
 * Creates a new session.
 * @param sessionData The data to create the session.
 * @returns The response from the API.
 */
export const createSession = async (sessionData: { [key: string]: any }): Promise<{ message: string; error?: string; sessionId?: string }> => {
    const response: ApiResponse<{ message: string; error?: string; sessionId?: string; result?: string }> = await api.apisauce.put(
        `/createSession`,
        sessionData
    );

    console.log("response", response);
    if (!response.ok) {
        const problem = getGeneralApiProblem(response);
        throw new Error(problem?.kind || "unknown");
    }

    // Store sessionId in local storage
    if (response.data?.result) { // Check for 'result' instead of 'sessionId'
        storage.set("sessionId", response.data.result); // Store the result as sessionId
        storage.set("sessionExpiry", Date.now() + 60 * 60 * 1000); // Set session expiry to 1 hour from now
    }

    return {
        message: response.data?.message || "",
        error: response.data?.error || "",
        sessionId: response.data?.result || "", // Return the result as sessionId
    };
}; 