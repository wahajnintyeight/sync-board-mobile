import React, { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"
import { Button, Screen, Text } from "@/components"
import { JoinRoom } from "@/components/JoinRoom"
import { ThemedStyle } from "@/theme"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { useAppTheme } from "@/utils/useAppTheme"
import { RootStoreProvider, useStores } from "@/models/helpers/useStores"
import { storage } from "@/utils/storage"
import { getDeviceInfo } from "@/utils/deviceInfo"
const welcomeLogo = require("../../assets/images/logo.png")
const welcomeFace = require("../../assets/images/welcome-face.png")
import { useNavigation } from "@react-navigation/native"
import { isRTL } from "@/i18n"


export default observer(function SplashScreen() {

  const rootStore = useStores();
  const { themed } = useAppTheme();
  const navigation = useNavigation();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joinRoomVisible, setJoinRoomVisible] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      // Load sessionId from storage
      const sessionId = await storage.getString("sessionId")
      const sessionExpiry = await storage.getNumber("sessionExpiry")
      console.log("sessionId", sessionId, 'exp', sessionExpiry, Date.now())
      if (sessionId === undefined || sessionExpiry < Date.now()) {
        // Call createSession if sessionId exists
        await rootStore.sessionStore.createSession({ sessionId })
      }

      // Set a timeout to remove the sessionId after 3600 seconds
      const timeoutId = setTimeout(() => {
        storage.delete("sessionId")
        rootStore.sessionStore.sessionId = "" // Clear the sessionId in the store
      }, 3600 * 1000) // 3600 seconds in milliseconds

      // Cleanup function to clear the timeout if the component unmounts
      return () => clearTimeout(timeoutId)
    }

    loadSession()
  }, [rootStore])

  const handleCreateRoom = async () => {
    console.log("Create room clicked")
    
    try {
      setIsCreatingRoom(true);
      
      // Call the createRoom method from the roomStore
      const result = await rootStore.roomStore.createNewRoom();
      
      console.log("Room created with ID:", result.roomId);
      console.log("Room code:", result.code);
      
      // Navigate to message screen with the room data
      navigation.navigate("MessageRoom", {
        roomId: result._id,
        roomCode: result.code
      });
    } catch (error) {
      console.error("Error creating room:", error);
      // You might want to show an error message to the user
    } finally {
      setIsCreatingRoom(false);
    }
  }

  const handleOpenJoinRoom = () => {
    setJoinRoomVisible(true);
  }

  const handleCloseJoinRoom = () => {
    setJoinRoomVisible(false);
  }

  return (
    <RootStoreProvider value={rootStore}>
      <Screen safeAreaEdges={["top"]} contentContainerStyle={themed($container)}>
        <View style={themed($topContainer)}>
          <Text
            testID="sync-board-heading"
            style={themed($syncBoardHeading)}
            preset="heading"
          >
            Sync board
          </Text>
        </View>

        <View style={themed($bottomContainer)}>
          <Button
            onPress={handleCreateRoom}
            style={themed($createRoomButton)}
            disabled={isCreatingRoom}
          >
            {isCreatingRoom ? "Creating Room..." : "Create Room"}
          </Button>
          <Button
            style={themed($joinRoomButton)}
            onPress={handleOpenJoinRoom}
          >
            <Text style={themed($joinRoomButtonText)}>
              Join Room
            </Text>
          </Button>
        </View>

        <JoinRoom 
          visible={joinRoomVisible} 
          onClose={handleCloseJoinRoom} 
        />
      </Screen>
    </RootStoreProvider>
  )

})

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $topContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexShrink: 1,
  flexGrow: 1,
  flexBasis: "57%",
  justifyContent: "center",
  paddingHorizontal: spacing.lg,
})

const $bottomContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexShrink: 1,
  flexGrow: 0,
  flexBasis: "23%",
  // backgroundColor: colors.palette.neutral100,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  paddingHorizontal: spacing.lg,
  justifyContent: "space-around",
})

const $welcomeLogo: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  height: 88,
  width: "100%",
  marginBottom: spacing.xxl,
})

const $welcomeFace: ImageStyle = {
  height: 169,
  width: 269,
  position: "absolute",
  bottom: -47,
  right: -80,
  transform: [{ scaleX: isRTL ? -1 : 1 }],
}

const $welcomeHeading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})

const $syncBoardHeading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 48,
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: spacing.md,
})

const $createRoomButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: 'limegreen',
  borderRadius: 25,
  paddingVertical: 12,
  paddingHorizontal: 20,
  alignItems: 'center',
})

const $joinRoomButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: '#D9EAD3', // Slightly beige-blue color
  borderRadius: 25,
  paddingVertical: 12,
  paddingHorizontal: 20,
  alignItems: 'center',
})

const $joinRoomButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: 'black',
})

const $root: ViewStyle = {
  flex: 1,
}
