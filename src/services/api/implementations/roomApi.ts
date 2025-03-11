import { ApiResponse } from "apisauce";
import { storage } from "../../../utils/storage";
import { getGeneralApiProblem } from "../apiProblem";
import { api } from "../api"; // Import the base API instance

/**
 * Creates a new room.
 * @param roomData The data to create the room.
 * @returns The response from the API.
 */
export const createRoom = async (roomData: { [key: string]: any }): Promise<{ message: string; error?: string; roomId?: string }> => {
    const response: ApiResponse<{ message: string; error?: string; roomId?: string }> = await api.apisauce.put(
        `room/create`,
        roomData
    );

    console.log("createRoom API response", response);
    if (!response.ok) {
        const problem = getGeneralApiProblem(response);
        throw new Error(problem?.kind || "unknown");
    }

    // Store roomId in local storage
    if (response.data?.result) {
        storage.set("roomId", response.data.result);
    }

    return {
        message: response.data?.message || "",
        error: response.data?.error || "",
        roomId: response.data?.result || "",
    };
}; 