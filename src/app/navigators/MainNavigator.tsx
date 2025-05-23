import { createNativeStackNavigator } from "@react-navigation/native-stack"
import MessageRoomScreen from "../screens/MessageRoom"
import app from "@/app"
import SplashScreen from "../screens/Splash"

export type MainNavigatorParamList = {
  SplashScreen: undefined
  MessageRoom: {
    roomId?: string
    roomCode?: string
    roomName?: string
  }
}

const Stack = createNativeStackNavigator<MainNavigatorParamList>()
export const MainNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, }}>
      <Stack.Screen name="SplashScreen" component={SplashScreen} />
      <Stack.Screen name="MessageRoom" component={MessageRoomScreen} />
    </Stack.Navigator>
  )
}
