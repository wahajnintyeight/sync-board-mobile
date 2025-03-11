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
import { NavigationContainer, useNavigation } from "@react-navigation/native"
import { MainNavigator } from "./navigators"
const App = () => {
 



  // const handleCreateRoom = async () => {
  //   console.log("Create room clicked")
  //   try {
  //     // Call the createRoom method from the sessionStore
  //     await rootStore.sessionStore.createRoom({});
  //     console.log("Room created with ID:", rootStore.sessionStore.roomId);
  //     // You can add navigation to the room or other logic here
  //   } catch (error) {
  //     console.error("Error creating room:", error);
  //   }
  // }

  return (
    <NavigationContainer>
      <MainNavigator />
    </NavigationContainer>
  )
}



export default observer(App)

