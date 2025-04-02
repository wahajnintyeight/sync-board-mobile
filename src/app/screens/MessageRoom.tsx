import React, { useState, useRef, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextInput, KeyboardAvoidingView, Platform, TextStyle, TouchableOpacity, ScrollView, Dimensions, ImageStyle, ActivityIndicator } from "react-native"
import { Screen, Text, Icon, Header } from "@/components"
import { useAppTheme } from "@/utils/useAppTheme"
import { ThemedStyle } from "@/theme"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"
import { initializeWebSocket, disconnectWebSocket, sendWebSocketMessage } from "@/services/websocket/server"
import Animated, { FadeIn, FadeOut, SlideInRight } from "react-native-reanimated"
import { RootStoreProvider } from "@/models/helpers/useStores"

export default observer(function MessageRoomScreen(props: any) {
  const [message, setMessage] = useState("")
  const [isConnecting, setIsConnecting] = useState(true)
  const { themed } = useAppTheme()
  const rootStore = useStores()
  const { roomStore, socketStore } = rootStore
  const navigation = useNavigation()
  const scrollViewRef = useRef<ScrollView>(null)

  // Get room data from store
  const room = roomStore.currentRoom.room || {}
  const roomId = roomStore.currentRoom.room._id
  const roomName = room.roomName || "New Chat Room"
  const roomCode = room.code || props.route?.params?.roomCode
  const userId = roomStore?.userId || null

  // console.log('[MessageRoom] roomId', room);
  // Check if store is available
  const isStoreAvailable = React.useMemo(() => {
    try {
      // Access a property to check if the store is detached
      const test = socketStore?.isConnected;
      return true;
    } catch (error) {
      console.error("Store is detached or unavailable:", error);
      return false;
    }
  }, [socketStore]);

  // Connect to WebSocket when component mounts
  useEffect(() => {
    let isMounted = true;
    let cleanup: (() => void) | null = null;
    
    const connectToSocket = async () => {
      console.log('[MessageRoom] connectToSocket called');
      console.log('[MessageRoom] isMounted', isMounted);
      if (!isMounted) return;
      setIsConnecting(true);
      
      try {
        if (socketStore && roomId) {
          console.log('[MessageRoom] Connecting to WebSocket', { roomId });
          const result = await initializeWebSocket(socketStore, roomId, userId, roomCode);
          cleanup = result.cleanup;
          
          if (isMounted) {
            setIsConnecting(false);
          }
        }
      } catch (error) {
        console.error('[MessageRoom] Failed to connect to WebSocket:', error);
        if (isMounted) {
          setIsConnecting(false);
        }
      }
    };

    console.log('[MessageRoom] roomId', roomId);
    console.log('[MessageRoom] socketStore', socketStore);
    console.log('[MessageRoom] isStoreAvailable', isStoreAvailable);
    if (roomId && socketStore && isStoreAvailable) {
      connectToSocket();
    }

    // Disconnect when component unmounts
    return () => {
      console.log('[MessageRoom] Component unmounting, cleaning up WebSocket');
      isMounted = false;
      
      try {
        if (cleanup) {
          cleanup();
        }
      } catch (error) {
        console.error('[MessageRoom] Error during cleanup:', error);
      }
    };
  }, [roomId, userId, roomCode, socketStore, isStoreAvailable]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (socketStore?.messages?.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [socketStore?.messages?.length])

  const handleSend = () => {
    if (!message.trim()) return;
    
    try {
      if (socketStore && socketStore.isConnected) {
        sendWebSocketMessage(socketStore, message.trim());
        setMessage("");
        // Scroll to bottom after sending
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const renderMessage = (msg, index) => {
    const isMe = msg.sender === userId ||
      (msg.isAnonymous && msg.deviceInfo === socketStore?.deviceInfo?.slugifiedDeviceName)

    return (
      <Animated.View
        key={msg.timeStamp || index}
        entering={SlideInRight.delay(index * 50).springify()}
        style={[
          themed($messageWrapper),
          isMe ? themed($myMessageWrapper) : themed($otherMessageWrapper)
        ]}
      >
        {!isMe && (
          <Text style={themed($senderName)}>
            {msg.isAnonymous ? 'Anonymous' : msg.sender}
          </Text>
        )}
        <View style={[
          themed($messageBox),
          isMe ? themed($myMessageBox) : themed($otherMessageBox)
        ]}>
          <Text style={[
            themed($messageText),
            isMe ? themed($myMessageText) : themed($otherMessageText)
          ]}>
            {msg.message}
          </Text>
          <Text style={[
            themed($timestamp),
            isMe ? themed($myTimestamp) : themed($otherTimestamp)
          ]}>
            {new Date(msg.timeStamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </Animated.View>
    )
  }

  // Group messages by date
  const groupedMessages = React.useMemo(() => {
    try {
      if (!socketStore?.messages || !Array.isArray(socketStore.messages)) {
        return {};
      }
      
      return socketStore.messages.reduce((groups, message) => {
        if (!message || !message.timeStamp) return groups;
        
        try {
          const date = new Date(message.timeStamp).toLocaleDateString();
          if (!groups[date]) {
            groups[date] = [];
          }
          groups[date].push(message);
        } catch (error) {
          console.error("Error processing message date:", error);
        }
        return groups;
      }, {});
    } catch (error) {
      console.error("Error grouping messages:", error);
      return {};
    }
  }, [socketStore?.messages]);

  if (!isStoreAvailable) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($container)}>
        <Header
          title="Chat Room"
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
        />
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="large" color={themed($loadingIndicator).color} />
          <Text style={themed($loadingText)}>Initializing chat...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <RootStoreProvider value={rootStore}>
      <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($container)}>
        <Header
          title={roomName}
          leftIcon="back"
          rightIcon={socketStore?.isConnected ? "check" : "x"}
          rightIconColor={socketStore?.isConnected ? "green" : "red"}
          onLeftPress={() => navigation.goBack()}
        />

        {/* Connection status indicator */}
        {socketStore?.isConnected === false && !socketStore?.error && !isConnecting && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={themed($connectionStatusBar)}
          >
            <Text style={themed($connectionStatusText)}>Disconnected - Attempting to reconnect...</Text>
          </Animated.View>
        )}

        {/* Message area */}
        <View style={themed($messageArea)}>
          {isConnecting ? (
            <Animated.View
              entering={FadeIn}
              style={themed($loadingContainer)}
            >
              <ActivityIndicator size="large" color={themed($loadingIndicator).color} />
              <Text style={themed($loadingText)}>Connecting to chat...</Text>
            </Animated.View>
          ) : socketStore?.error ? (
            <Animated.View
              entering={FadeIn}
              style={themed($errorContainer)}
            >
              <Icon icon="x" size={50} color={themed($errorIcon).color} />
              <Text style={themed($errorText)}>{socketStore.error}</Text>
              <TouchableOpacity
                style={themed($retryButton)}
                onPress={() => initializeWebSocket(socketStore, roomId, userId, roomCode)}
              >
                <Text style={themed($retryButtonText)}>Retry Connection</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={themed($scrollView)}
              contentContainerStyle={themed($scrollViewContent)}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
            >
              {Object.entries(groupedMessages).map(([date, messages]) => (
                <View key={date}>
                  <View style={themed($dateHeaderContainer)}>
                    <View style={themed($dateHeaderLine)} />
                    <View style={themed($dateHeaderTextContainer)}>
                      <Icon icon="calendar" size={14} color={themed($dateHeaderText).color} />
                      <Text style={themed($dateHeaderText)}>{date}</Text>
                    </View>
                    <View style={themed($dateHeaderLine)} />
                  </View>
                  {messages.map(renderMessage)}
                </View>
              ))}

              {(!socketStore?.messages || socketStore.messages.length === 0) && (
                <Animated.View
                  entering={FadeIn}
                  style={themed($emptyStateContainer)}
                >
                  <Icon icon="components" size={50} color={themed($emptyStateIcon).color} />
                  <Text style={themed($emptyStateText)}>No messages yet</Text>
                  <Text style={themed($emptyStateSubtext)}>Start the conversation!</Text>
                </Animated.View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Input Section */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          style={themed($inputSection)}
        >
          <Animated.View
            entering={FadeIn}
            style={themed($inputContainer)}
          >
            <Icon icon="components" size={20} style={themed($attachIcon)} />
            <TextInput
              style={themed($input)}
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message..."
              placeholderTextColor="#666"
              multiline
              maxLength={500}
              editable={socketStore?.isConnected && !socketStore?.error}
            />
            <TouchableOpacity
              onPress={handleSend}
              style={[
                themed($sendButton),
                (!message.trim() || !socketStore?.isConnected || socketStore?.error) && themed($disabledSendButton)
              ]}
              disabled={!message.trim() || !socketStore?.isConnected || socketStore?.error}
            >
              <Icon
                icon="caretRight"
                size={24}
                color={message.trim() && socketStore?.isConnected && !socketStore?.error ? "white" : "#666"}
              />
            </TouchableOpacity>
          </Animated.View>

          {socketStore?.isConnected === false && !socketStore?.error && !isConnecting && (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={themed($connectionStatusBar)}
            >
              <Text style={themed($connectionStatusText)}>Reconnecting...</Text>
            </Animated.View>
          )}
        </KeyboardAvoidingView>
      </Screen>
    </RootStoreProvider>
  )
})

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $headerSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  height: '20%', // Takes 20% of screen height
  backgroundColor: colors.background,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.sm,
})

const $headerTopRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingTop: 8,
  flex: 1,
})

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
})

const $menuButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
})

const $roomInfoContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
})

const $roomName: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  fontWeight: 'bold',
  color: colors.text,
  marginBottom: spacing.xs,
})

const $participantsContainer: ThemedStyle<ViewStyle> = () => ({
  flexDirection: 'row',
  alignItems: 'center',
})

const $participantsText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
})

const $onlineDot: ThemedStyle<ViewStyle> = () => ({
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: 'green',
  marginRight: 6,
})

const $dateHeaderContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: spacing.xs,
  marginBottom: spacing.xs,
})

const $dateHeaderLine: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  height: 1,
  backgroundColor: colors.border,
})

const $dateHeaderTextContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: spacing.sm,
})

const $dateHeaderText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 13,
  color: colors.textDim,
  marginLeft: spacing.xs,
})

const $messagesOuterContainer: ViewStyle = {
  height: '70%', // Takes 70% of screen height
}

const $scrollView: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $scrollViewContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
})

const $inputSection: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  paddingTop: 8,
  paddingBottom: 4,
})

const $messageWrapper: ThemedStyle<ViewStyle> = () => ({
  marginVertical: 4,
  flexDirection: 'row',
})

const $myMessageWrapper: ThemedStyle<ViewStyle> = () => ({
  justifyContent: 'flex-end',
})

const $otherMessageWrapper: ThemedStyle<ViewStyle> = () => ({
  justifyContent: 'flex-start',
})

const $messageBox: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  maxWidth: '80%',
  padding: spacing.sm,
  borderRadius: 16,
  borderBottomLeftRadius: 4,
})

const $myMessageBox: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.primary500,
  borderBottomLeftRadius: 16,
  borderBottomRightRadius: 4,
})

const $otherMessageBox: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral300,
})

const $messageText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 16,
  marginBottom: spacing.xs,
})

const $myMessageText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
})

const $otherMessageText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral800,
})

const $timestamp: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  opacity: 0.7,
  alignSelf: 'flex-end',
})

const $attachIcon: ThemedStyle<ImageStyle> = ({ colors, spacing }) => ({
  marginRight: spacing.sm,
  tintColor: colors.textDim,
})

const $inputContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  padding: spacing.sm,
  marginHorizontal: spacing.sm,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 25,
  backgroundColor: colors.background,
})

const $input: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  flex: 1,
  maxHeight: 80,
  marginRight: spacing.sm,
  padding: spacing.xs,
  paddingHorizontal: spacing.sm,
  color: colors.text,
  fontSize: 16,
})

const $sendButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: colors.palette.primary500,
  justifyContent: 'center',
  alignItems: 'center',
})

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
})

const $loadingIndicator: ThemedStyle<ViewStyle> = ({ colors }) => ({
  color: colors.palette.primary500,
})

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  fontSize: 16,
  color: colors.textDim,
})

const $errorContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: spacing.lg,
})

const $errorIcon: ThemedStyle<ImageStyle> = ({ colors }) => ({
  color: colors.error,
})

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  fontSize: 16,
  color: colors.error,
  textAlign: 'center',
})

const $retryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.lg,
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  backgroundColor: colors.palette.primary500,
  borderRadius: 8,
})

const $retryButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontWeight: 'bold',
})

const $emptyStateContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: spacing.xl,
})

const $emptyStateIcon: ThemedStyle<ImageStyle> = ({ colors }) => ({
  color: colors.textDim,
  opacity: 0.5,
})

const $emptyStateText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  fontSize: 18,
  fontWeight: 'bold',
  color: colors.textDim,
})

const $emptyStateSubtext: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.xs,
  fontSize: 14,
  color: colors.textDim,
  opacity: 0.7,
})

const $senderName: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginBottom: spacing.xs,
  marginLeft: spacing.sm,
})

const $myTimestamp: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  opacity: 0.7,
})

const $otherTimestamp: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral800,
  opacity: 0.7,
})

const $offlineDot: ThemedStyle<ViewStyle> = () => ({
  backgroundColor: 'red',
})

const $connectionStatusBar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.angry500,
  padding: spacing.xs,
  alignItems: 'center',
  marginTop: spacing.xs,
  borderRadius: 4,
  marginHorizontal: spacing.sm,
})

const $connectionStatusText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  fontSize: 12,
  fontWeight: 'bold',
})

const $disabledSendButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral300,
})

const $messageArea: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: 'transparent',
})
