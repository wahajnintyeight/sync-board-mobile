import React, { FC, useEffect, useState } from "react"
import { observer } from "mobx-react-lite"
import { Image, ImageStyle, TextStyle, View, ViewStyle, TouchableOpacity, Linking, Animated } from "react-native"
import { Button, Screen, Text } from "@/components"
import { JoinRoom } from "@/components/JoinRoom"
import { ThemedStyle } from "@/theme"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { useAppTheme } from "@/utils/useAppTheme"
import { RootStoreProvider, useStores } from "@/models/helpers/useStores"
import { storage } from "@/utils/storage"
import { getDeviceInfo } from "@/utils/deviceInfo"
import { useNavigation } from "@react-navigation/native"
import { isRTL } from "@/i18n"
import { Ionicons } from "@expo/vector-icons"

const welcomeLogo = require("../../assets/images/logo.png")
const welcomeFace = require("../../assets/images/welcome-face.png")

export default observer(function SplashScreen() {

  const rootStore = useStores();
  const { themed } = useAppTheme();
  const navigation = useNavigation();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [joinRoomVisible, setJoinRoomVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const loadSession = async () => {
      // Load sessionId from storage
      const sessionId = await storage.getString("sessionId")
      const sessionExpiry = await storage.getNumber("sessionExpiry")
      console.log("sessionId", sessionId, 'exp', sessionExpiry, Date.now())
      if (sessionId === undefined || sessionExpiry < Date.now()) {
        await rootStore.sessionStore.createSession({ sessionId })
      }

      const timeoutId = setTimeout(() => {
        storage.delete("sessionId")
        rootStore.sessionStore.sessionId = "" // Clear the sessionId in the store
      }, 3600 * 1000) // 3600 seconds in milliseconds

      return () => clearTimeout(timeoutId)
    }

    loadSession()
  }, [rootStore])

  const handleCreateRoom = async () => {
    console.log("Create room clicked")
    
    try {
      setIsCreatingRoom(true);
      
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

  const handleClearStorage = async () => {
    try {
      storage.clearAll();
      setShowAlert(true);
      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Animate out after 2 seconds
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowAlert(false));
      }, 2000);
      
      // Force component remount by changing the key
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error clearing storage:", error);
    }
  };

  return (
    <RootStoreProvider value={rootStore} key={refreshKey}>
      <Screen safeAreaEdges={["top"]} contentContainerStyle={themed($container)}>
        {showAlert && (
          <Animated.View 
            style={[
              themed($alertContainer),
              {
                opacity: fadeAnim,
                transform: [{
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0]
                  })
                }]
              }
            ]}
          >
            <Text style={themed($alertText)}>Storage cleared successfully</Text>
          </Animated.View>
        )}
        
        <TouchableOpacity 
          style={themed($settingsButton)} 
          onPress={handleClearStorage}
        >
          <Ionicons name="refresh" size={24} style={themed($settingsIcon)} />
        </TouchableOpacity>
        
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

const $settingsButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: 'absolute',
  top: 20,
  right: 20,
  zIndex: 1,
  padding: 8,
  borderRadius: 20,
  backgroundColor: colors.palette.neutral200,
})

const $settingsIcon: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $alertContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: 'absolute',
  top: 20,
  left: 20,
  right: 20,
  backgroundColor: colors.palette.primary500,
  padding: 16,
  borderRadius: 8,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
  elevation: 5,
})

const $alertText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontSize: 16,
  fontWeight: '500',
})
