import { ApiResponse } from "apisauce";
import { storage } from "../../../utils/storage";
import { getGeneralApiProblem } from "../apiProblem";
import { api } from "../api"; // Import the base API instance

/**
 * Creates a new room.
 * @param sessionData The data to create the room.
 * @returns The response from the API.
 */
export const createRoom = async (sessionData: { [key: string]: any }): Promise<{ message: string; error?: string; roomId?: string }> => {
    const response: ApiResponse<{ message: string; error?: string; roomId?: string }> = await api.apisauce.put(
        `v2/api/createRoom`,
        sessionData
    );

    console.log("response", response);
    if (!response.ok) {
        const problem = getGeneralApiProblem(response);
        throw new Error(problem?.kind || "unknown");
    }

    // Store sessionId in local storage
    if (response.data?.result) { // Check for 'result' instead of 'sessionId'
        storage.set("roomId", response.data.result); // Store the result as sessionId
    }

    return {
        message: response.data?.message || "",
        error: response.data?.error || "",
        roomId: response.data?.result || "", // Return the result as sessionId
    };
}; 