import { ApiResponse } from "apisauce";
import { storage } from "../../../utils/storage";
import { getGeneralApiProblem } from "../apiProblem";
import { RoomModel, RoomSnapshotIn, RoomMessageModel } from "../../../models/Room";
import { api } from "../api"; // Import the base API instance
import { getDeviceInfo } from "../../../utils/deviceInfo";

/**
 * Creates a new room.
 * @returns The response from the API.
 */
export const createRoom = async (): Promise<{ message: string; error?: string; result?: any }> => {
    try {
        // Get device info
        const deviceInfo = await getDeviceInfo();

        // The endpoint should be "/api/room/create" instead of just "room/create"
        const response: ApiResponse<any> = await api.apisauce.post(
            `/room/create`,
            { deviceInfo: deviceInfo.slugifiedDeviceName }
        );

        console.log("createRoom API response", response);
        if (!response.ok) {
            const problem = getGeneralApiProblem(response);
            throw new Error(problem?.kind || "unknown");
        }

        if(response.data.result == null){

            return {
                message: response.data?.message || "",
                error: response.data || "",
                result: response.data?.result || null
            };

        }
        // Store roomId and code in local storage
        if (response.data?.result._id) {
            await storage.set("roomId", response.data.result._id);
        }
        
        if (response.data?.result?.code) {
            await storage.set("roomCode", response.data.result.code);
        }

        return {
            message: response.data?.message || "",
            error: response.data?.error || "",
            result: response?.data?.result || null
        };
    } catch (error) {
        console.error("Error in createRoom:", error);
        throw error;
    }
};

/**
 * Join an existing room by code.
 * @param code The room code to join.
 * @param deviceInfo The device information.
 * @returns The response from the API.
 */
export const joinRoom = async (code: string, deviceInfo: string): Promise<{ message: string; error?: string; room?: any }> => {
    const response: ApiResponse<any> = await api.apisauce.post(
        `api/room/join`,
        { code, deviceInfo }
    );

    console.log("joinRoom API response", response);
    if (!response.ok) {
        const problem = getGeneralApiProblem(response);
        throw new Error(problem?.kind || "unknown");
    }

    // Store roomId and code in local storage
    if (response.data?.room?._id) {
        storage.set("roomId", response.data.room._id);
    }
    
    if (response.data?.room?.code) {
        storage.set("roomCode", response.data.room.code);
    }

    return {
        message: response.data?.message || "",
        error: response.data?.error || "",
        room: response.data?.room
    };
};

/**
 * Update room name.
 * @param code The room code.
 * @param roomName The new room name.
 * @returns The response from the API.
 */
export const updateRoomName = async (code: string, roomName: string): Promise<{ message: string; error?: string }> => {
    const response: ApiResponse<any> = await api.apisauce.put(
        `api/room/update`,
        { code, roomName }
    );

    console.log("updateRoomName API response", response);
    if (!response.ok) {
        const problem = getGeneralApiProblem(response);
        throw new Error(problem?.kind || "unknown");
    }

    return {
        message: response.data?.message || "",
        error: response.data?.error || ""
    };
};

/**
 * Delete a room.
 * @param roomId The ID of the room to delete.
 * @returns The response from the API.
 */
export const deleteRoom = async (roomId: string): Promise<{ message: string; error?: string }> => {
    const response: ApiResponse<any> = await api.apisauce.delete(
        `api/room/delete`,
        { id: roomId }
    );

    console.log("deleteRoom API response", response);
    if (!response.ok) {
        const problem = getGeneralApiProblem(response);
        throw new Error(problem?.kind || "unknown");
    }

    // Clear room data from storage
    storage.delete("roomId");
    storage.delete("roomCode");

    return {
        message: response.data?.message || "",
        error: response.data?.error || ""
    };
};

/**
 * Get room information.
 * @param roomId The ID of the room.
 * @returns The response from the API.
 */
export const getRoomInfo = async (roomId: string): Promise<{ message: string; error?: string; room?: any }> => {
    const response: ApiResponse<any> = await api.apisauce.get(
        `api/room/${roomId}`
    );

    console.log("getRoomInfo API response", response);
    if (!response.ok) {
        const problem = getGeneralApiProblem(response);
        throw new Error(problem?.kind || "unknown");
    }

    return {
        message: response.data?.message || "",
        error: response.data?.error || "",
        room: response.data?.room
    };
};

/**
 * Send a message to a room.
 * @param roomCode The room code.
 * @param message The message content.
 * @param sender The sender identifier.
 * @returns The response from the API.
 */
export const sendRoomMessage = async (roomCode: string, message: string, sender: string): Promise<{ message: string; error?: string }> => {
    const messageData = {
        content: message,
        sender: sender,
        timestamp: new Date()
    };

    const response: ApiResponse<any> = await api.apisauce.post(
        `api/room/${roomCode}/message`,
        { data: messageData }
    );

    console.log("sendRoomMessage API response", response);
    if (!response.ok) {
        const problem = getGeneralApiProblem(response);
        throw new Error(problem?.kind || "unknown");
    }

    return {
        message: response.data?.message || "",
        error: response.data?.error || ""
    };
}; 