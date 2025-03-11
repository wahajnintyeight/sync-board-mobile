import React, { useEffect } from "react"
import { observer } from "mobx-react-lite"
import { Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"
import { Button, Screen, Text } from "@/components"
import { isRTL } from "@/i18n"
import { ThemedStyle } from "@/theme"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { useAppTheme } from "@/utils/useAppTheme"
import { RootStoreProvider, useStores } from "@/models/helpers/useStores"
import { storage } from "@/utils/storage"
const welcomeLogo = require("../../assets/images/logo.png")
const welcomeFace = require("../../assets/images/welcome-face.png")

const App = () => {
  const rootStore = useStores();
  const { themed } = useAppTheme();

  
  useEffect(() => {
    const loadSession = async () => {
      // Load sessionId from storage
      const sessionId = await storage.getString("sessionId")

      console.log("sessionId", sessionId)
      if (sessionId === undefined) {
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
    // await rootStore.sessionStore.createRoom({ sessionId: rootStore.sessionStore.sessionId })
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
          >
            Create Room
          </Button>
          <Button
            style={themed($joinRoomButton)}
          >
            <Text style={themed($joinRoomButtonText)}>
              Join Room
            </Text>
          </Button>
        </View>
      </Screen>
    </RootStoreProvider>
  )
}



export default observer(App)

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