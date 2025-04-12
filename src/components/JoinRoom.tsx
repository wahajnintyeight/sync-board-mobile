import React, { useRef, useState, useEffect } from "react"
import { StyleProp, TextStyle, View, ViewStyle, TextInput, Modal, TouchableOpacity, Alert, Platform, SafeAreaView, Image, PermissionsAndroid } from "react-native"
import { observer } from "mobx-react-lite" 
import { useAppTheme } from "@/utils/useAppTheme"
import type { ThemedStyle } from "@/theme"
import { Text } from "@/components/Text"
import { Button } from "@/components/Button"
import { useStores } from "@/models/helpers/useStores"
import { getDeviceInfo } from "@/utils/deviceInfo"
import { useNavigation } from "@react-navigation/native"
import { request, PERMISSIONS, openSettings, RESULTS } from 'react-native-permissions'
import { Commands, ReactNativeScannerView } from '@pushpendersingh/react-native-scanner'
import { Icon } from "@/components/Icon"

export interface JoinRoomProps {
  /**
   * An optional style override useful for padding & margin.
   */
  style?: StyleProp<ViewStyle>
  /**
   * Callback when modal is closed
   */
  onClose?: () => void
  /**
   * Whether the modal is visible
   */
  visible: boolean
}

/**
 * Join Room component with code input and QR scanner option
 */
export const JoinRoom = observer(function JoinRoom(props: JoinRoomProps) {
  const { style, onClose, visible } = props
  const { themed } = useAppTheme()
  const [roomCode, setRoomCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")
  const [showScanner, setShowScanner] = useState(false)
  const [isCameraPermissionGranted, setIsCameraPermissionGranted] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const scannerRef = useRef(null)
  const rootStore = useStores()
  const navigation = useNavigation()

  useEffect(() => {
    if (showScanner) {
      checkCameraPermission()
    }
    
    return () => {
      // Clean up camera resources when component unmounts
      if (scannerRef.current) {
        Commands.releaseCamera(scannerRef.current)
      }
    }
  }, [showScanner])

  // Format the input to ensure it's 6 alphanumeric characters
  const handleCodeChange = (text: string) => {
    // Remove non-alphanumeric characters and convert to uppercase
    const formattedText = text.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
    // Limit to 6 characters
    setRoomCode(formattedText.slice(0, 6))
  }

  const handleJoinRoom = async () => {
    if (roomCode.length !== 6) {
      setError("Please enter a valid 6-character room code")
      return
    }

    try {
      setIsJoining(true)
      setError("")
      
      // Get device info for joining
      const deviceInfo = await getDeviceInfo()
      
      // Call the joinRoomByCode method from the roomStore
      const result = await rootStore.roomStore.joinRoomByCode(roomCode, deviceInfo.slugifiedDeviceName)
      
      // console.log("Joined room:", result)
      
      // Close the modal
      if (onClose) onClose()
      
      // Navigate to message screen with the room data
      navigation.navigate("MessageRoom", {
        roomId: result.room?._id,
        roomCode: result.room?.code,
        roomName: result.room?.roomName || "Joined Room"
      })
    } catch (error) {
      console.error("Error joining room:", error)
      setError(error instanceof Error ? error.message : "Failed to join room")
    } finally {
      setIsJoining(false)
    }
  }

  const handleScanQR = () => {
    setShowScanner(true)
    setError("")
  }

  const handleBarcodeScanned = event => {
    const { data } = event?.nativeEvent
    console.log("Scanned QR code:", data)
    
    // Extract code from URL if present
    const url = new URL(data)
    const code = url.searchParams.get('code')
    
    // Validate the scanned code
    if (code && code.length === 6) {
      setRoomCode(code)
      setShowScanner(false)
      
      // Auto-join the room after scanning
      handleJoinRoomWithCode(code)
    } else {
      setError("Invalid QR code. Please scan a valid room code.")
      setShowScanner(false)
    }
  }

  const handleJoinRoomWithCode = async (code) => {
    try {
      setIsJoining(true)
      setError("")
      
      // Get device info for joining
      const deviceInfo = await getDeviceInfo()
      
      // Call the joinRoomByCode method from the roomStore
      const result = await rootStore.roomStore.joinRoomByCode(code, deviceInfo.slugifiedDeviceName)
      
      console.log("Joined room via QR:", result)
      
      // Close the modal
      if (onClose) onClose()
      
      // Navigate to message screen with the room data
      navigation.navigate("MessageRoom", {
        roomId: result.room?._id,
        roomCode: result.room?.code,
        roomName: result.room?.roomName || "Joined Room"
      })
    } catch (error) {
      console.error("Error processing QR code:", error)
      setError(error instanceof Error ? error.message : "Failed to join room")
    } finally {
      setIsJoining(false)
    }
  }

  const closeScanner = () => {
    if (scannerRef.current) {
      Commands.releaseCamera(scannerRef.current)
    }
    setShowScanner(false)
    setIsActive(false)
  }

  const checkCameraPermission = async () => {
    request(
      Platform.OS === 'ios'
        ? PERMISSIONS.IOS.CAMERA
        : PERMISSIONS.ANDROID.CAMERA,
    ).then(async (result) => {
      switch (result) {
        case RESULTS.UNAVAILABLE:
          setError('Camera is not available on this device')
          break
        case RESULTS.DENIED:
          Alert.alert(
            'Permission Denied',
            'You need to grant camera permission to scan QR codes',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: openSettings }
            ]
          )
          break
        case RESULTS.GRANTED:
          setIsCameraPermissionGranted(true)
          break
        case RESULTS.BLOCKED:
          Alert.alert(
            'Permission Blocked',
            'You need to grant camera permission to scan QR codes',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: openSettings }
            ]
          )
          break
      }
    })
  }

  // Render the QR scanner when showScanner is true
  if (visible && showScanner) {
    if (isCameraPermissionGranted) {
      return (
        <Modal
          visible={visible}
          transparent={false}
          animationType="slide"
          onRequestClose={closeScanner}
        >
          <SafeAreaView style={themed($scannerContainer)}>
            <View style={themed($scannerHeader)}>
              <Text style={themed($scannerTitle)}>
                Scan Room QR Code
              </Text>
              <Text style={themed($scannerSubtitle)}>
                Scan a QR code to join a shared clipboard space
              </Text>
            </View>

            {isActive && (
              <ReactNativeScannerView
                ref={scannerRef}
                style={themed($scanner)}
                onQrScanned={handleBarcodeScanned}
                pauseAfterCapture={false}
                isActive={isActive}
                showBox={true}
              />
            )}

            <View style={themed($scannerInstructions)}>
              <View style={themed($instructionItem)}>
                <Icon icon="clipboard" size={24} color="limegreen" />
                <Text style={themed($instructionText)}>
                  Scan to join a shared clipboard space
                </Text>
              </View>
              <View style={themed($instructionItem)}>
                <Icon icon="sync" size={24} color="limegreen" />
                <Text style={themed($instructionText)}>
                  Share text, links, and more between devices
                </Text>
              </View>
              <View style={themed($instructionItem)}>
                <Icon icon="security" size={24} color="limegreen" />
                <Text style={themed($instructionText)}>
                  Secure and private sharing between your devices
                </Text>
              </View>
            </View>

            <Button
              style={themed($cancelScanButton)}
              onPress={closeScanner}
            >
              <Text style={themed($cancelScanButtonText)}>Cancel Scan</Text>
            </Button>
          </SafeAreaView>
        </Modal>
      )
    } else {
      return (
        <Modal
          visible={visible}
          transparent={false}
          animationType="slide"
          onRequestClose={closeScanner}
        >
          <SafeAreaView style={themed($permissionDeniedContainer)}>
            <Text style={themed($permissionDeniedText)}>
              Camera access is needed to scan QR codes.
            </Text>
            <Button
              style={themed($cancelScanButton)}
              onPress={closeScanner}
            >
              <Text style={themed($cancelScanButtonText)}>Go Back</Text>
            </Button>
          </SafeAreaView>
        </Modal>
      )
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={themed($modalOverlay)}>
        <View style={[themed($container), style]}>
          <Text style={themed($title)}>Join Room</Text>
          
          <View style={themed($inputContainer)}>
            <TextInput
              style={themed($input)}
              value={roomCode}
              onChangeText={handleCodeChange}
              placeholder="Enter 6-digit room code"
              placeholderTextColor="#999"
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
          
          <Text style={themed($orText)}>OR</Text>
          
          <Button
            style={themed($scanButton)}
            onPress={handleScanQR}
          >
            <View style={themed($scanButtonContent)}>
              <Icon icon="qrCode" size={20} color="#333" />
              <Text style={themed($scanButtonText)}>Scan QR Code</Text>
            </View>
          </Button>
          
          {error ? <Text style={themed($errorText)}>{error}</Text> : null}
          
          <View style={themed($buttonContainer)}>
            <Button
              style={themed($cancelButton)}
              onPress={onClose}
            >
              <Text style={themed($cancelButtonText)}>Cancel</Text>
            </Button>
            
            <Button
              style={themed($joinButton)}
              onPress={handleJoinRoom}
              disabled={roomCode.length !== 6 || isJoining}
            >
              <Text style={themed($joinButtonText)}>
                {isJoining ? "Joining..." : "Join"}
              </Text>
            </Button>
          </View>
        </View>
    </View>
    </Modal>
  )
})

const $modalOverlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
})

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 16,
  padding: spacing.lg,
  width: '90%',
  alignItems: 'center',
})

const $title: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.bold,
  fontSize: 24,
  color: colors.text,
  marginBottom: 20,
})

const $inputContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: "100%",
  marginBottom: spacing.md,
})

const $input: ThemedStyle<TextStyle> = ({ colors, typography, spacing }) => ({
  fontFamily: typography.primary.normal,
  fontSize: 18,
  color: colors.text,
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  padding: spacing.sm,
  textAlign: "center",
  letterSpacing: 2,
})

const $orText: ThemedStyle<TextStyle> = ({ colors, typography, spacing }) => ({
  fontFamily: typography.primary.normal,
  fontSize: 16,
  color: colors.textDim,
  marginVertical: spacing.sm,
})

const $scanButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  borderRadius: 12,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  marginBottom: spacing.md,
  width: "80%",
})

const $scanButtonText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.medium,
  fontSize: 16,
  color: colors.text,
  textAlign: "center",
})

const $errorText: ThemedStyle<TextStyle> = ({ colors, typography, spacing }) => ({
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.error,
  marginBottom: spacing.sm,
  textAlign: "center",
})

const $buttonContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  width: "100%",
  marginTop: spacing.md,
})

const $cancelButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral200,
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 20,
  flex: 1,
  marginRight: 10,
})

const $cancelButtonText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.medium,
  fontSize: 16,
  color: colors.text,
  textAlign: "center",
})

const $joinButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: "limegreen",
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 20,
  flex: 1,
  marginLeft: 10,
})

const $joinButtonText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.medium,
  fontSize: 16,
  color: "white",
  textAlign: "center",
})

const $scannerContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 20,
})

const $scannerHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: 'center',
  paddingHorizontal: spacing.lg,
  marginBottom: spacing.md,
})

const $scannerTitle: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.bold,
  fontSize: 28,
  color: colors.text,
  marginBottom: 8,
  textAlign: "center",
})

const $scannerSubtitle: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.normal,
  fontSize: 16,
  color: colors.textDim,
  textAlign: "center",
  marginBottom: 10,
})

const $scanner: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  width: '100%',
})

const $scannerInstructions: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 16,
  padding: spacing.md,
  width: '90%',
  marginVertical: spacing.lg,
})

const $instructionItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: spacing.sm,
})

const $instructionText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.normal,
  fontSize: 14,
  color: colors.text,
  marginLeft: 10,
})

const $cancelScanButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral200,
  borderRadius: 12,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  marginTop: spacing.md,
  width: '80%',
})

const $cancelScanButtonText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.medium,
  fontSize: 16,
  color: colors.text,
  textAlign: "center",
})

const $scanButtonContent: ThemedStyle<ViewStyle> = () => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
})

const $permissionDeniedContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: spacing.lg,
})

const $permissionDeniedText: ThemedStyle<TextStyle> = ({ colors, typography }) => ({
  fontFamily: typography.primary.medium,
  fontSize: 16,
  color: colors.text,
  textAlign: 'center',
  marginBottom: 20,
})
