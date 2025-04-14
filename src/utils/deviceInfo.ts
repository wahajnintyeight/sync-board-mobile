import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import { storage } from "./storage";

/**
 * Gets device information for room creation and joining
 */
export const getDeviceInfo = async () => {
    try {
        // Check storage first
        const cachedDeviceInfo = storage.getString('deviceInfo');
        if (cachedDeviceInfo !== undefined) {
            try {
                // Return just the slugifiedDeviceName if that's what's needed by consumers
                const parsedInfo = JSON.parse(cachedDeviceInfo);
                return parsedInfo
            } catch (parseError) {
                console.error('Error parsing cached device info:', parseError);
                // Continue to generate new device info if parsing fails
            }
        }

        // Get device name - using react-native-device-info if available
        let deviceName = 'Unknown Device';
        try {
            if (DeviceInfo) {
                deviceName = await DeviceInfo.getDeviceName();
            } else {
                deviceName = `${Platform.OS}_Device_${Math.floor(Math.random() * 10000)}`;
            }
        } catch (e) {
            console.log('Error getting device name:', e);
            deviceName = `${Platform.OS}_Device_${Math.floor(Math.random() * 10000)}`;
        }

        // Get IP address - using NetInfo if available, or fallback to a timestamp
        let ipAddress = '127.0.0.1';
        try {
            // Try to get IP from a public API
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            ipAddress = data.ip;

        } catch (e) {
            console.error('Error getting IP address:', e);
            // Use timestamp as fallback
            ipAddress = `127.0.0.1-${Date.now()}`;
        }

        // Clean up device name
        const slugifiedName = deviceName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const slugifiedDeviceName = `${slugifiedName}-${ipAddress}`;

        const deviceInfo = {
            slugifiedDeviceName,
            deviceName,
            ipAddress
        };

        // Cache the device info
        console.log('Device info:', deviceInfo);
        storage.set('deviceInfo', JSON.stringify(deviceInfo));

        const check = storage.getString('deviceInfo');
        
        // Return just the slugifiedDeviceName to match expected behavior
        return deviceInfo;
    } catch (error) {
        console.error('Error getting device info:', error);
        const slugifiedDeviceName = `unknown_device-127.0.0.1-${Date.now()}`;
        const fallbackInfo = {
            slugifiedDeviceName,
            deviceName: 'Unknown Device',
            ipAddress: '127.0.0.1'
        };
        storage.set('deviceInfo', JSON.stringify(fallbackInfo));
        return fallbackInfo;
    }
}; 