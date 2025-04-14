import React, { useState, useRef, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextInput, KeyboardAvoidingView, Platform, TextStyle, TouchableOpacity, ScrollView, Dimensions, ImageStyle, ActivityIndicator } from "react-native"
import { Screen, Text, Icon, Header } from "@/components"
import { Message } from "@/components/Message"
import { useAppTheme } from "@/utils/useAppTheme"
import { ThemedStyle } from "@/theme"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "@/models"
import { initializeWebSocket, disconnectWebSocket, sendWebSocketMessage } from "@/services/websocket/server"
import Animated, { FadeIn, FadeOut, SlideInRight } from "react-native-reanimated"
import { RootStoreProvider } from "@/models/helpers/useStores"
import { storage } from "@/utils/storage"

interface Message {
  timeStamp?: string;
  createdAt?: string;
  message: string;
  sender: string;
  isAnonymous?: boolean;
  deviceInfo?: string;
  isAttachment?: boolean;
  attachmentType?: string;
  attachmentURL?: string;
}

export default observer(function MessageRoomScreen() {
  const [message, setMessage] = useState("")
  const [isConnecting, setIsConnecting] = useState(true)
  const [roomMessagesState, setRoomMessagesState] = useState([])
  const { themed } = useAppTheme()
  const rootStore = useStores()
  const { roomStore, socketStore, sessionStore } = rootStore
  const navigation = useNavigation()
  const scrollViewRef = useRef<ScrollView>(null)
  
  // Add state to track if messages are still loading
  const [messagesLoading, setMessagesLoading] = useState(true)
  
  // Get current device info from either storage or the sessionStore
  const [currentDeviceInfo, setCurrentDeviceInfo] = useState<string | null>(null)
  
  // Load device info on component mount
  useEffect(() => {
    const loadDeviceInfo = async () => {
      // Try to get device info from sessionStore first
      if (sessionStore?.deviceInfo) {
        setCurrentDeviceInfo(sessionStore.deviceInfo)
        return
      }
      
      // Fall back to storage
      const storedDeviceInfo = storage.getString('deviceInfo')
      if (storedDeviceInfo) {
        try {
          console.log("[MessageRoom] Device Info:", storedDeviceInfo)
          const parsedInfo = JSON.parse(storedDeviceInfo)
          setCurrentDeviceInfo(parsedInfo.slugifiedDeviceName)
          return
        } catch (error) {
          console.error('Error parsing stored device info:', error)
        }
      }
      
      // Last resort: try socketStore
      if (socketStore?.deviceInfo?.slugifiedDeviceName) {
        setCurrentDeviceInfo(socketStore.deviceInfo.slugifiedDeviceName)
      }
    }
    
    loadDeviceInfo()
  }, [sessionStore?.deviceInfo, socketStore?.deviceInfo])

  // Helper functions to safely handle different message timestamp formats
  const getMessageTimestamp = (msg: any): string => {
    return msg?.timeStamp || msg?.createdAt || '';
  }
  
  const compareMessageTimestamps = (a: any, b: any): number => {
    const aTime = getMessageTimestamp(a);
    const bTime = getMessageTimestamp(b);
    
    if (!aTime) return 1;
    if (!bTime) return -1;
    return new Date(aTime).getTime() - new Date(bTime).getTime();
  }
  
  const isDuplicateMessage = (msg1: any, msg2: any): boolean => {
    if (!msg1 || !msg2) return false;
    
    const time1 = getMessageTimestamp(msg1);
    const time2 = getMessageTimestamp(msg2);
    
    return time1 === time2 && msg1.message === msg2.message;
  }

  // Get room data from store
  const room = roomStore.currentRoom?.room || {}
  const roomId = roomStore.currentRoom?.room?._id || null
  const roomName = room.roomName || "New Chat Room"
  const roomCode = room.code || roomStore.currentRoom?.roomCode
  const userId = currentDeviceInfo

  // State to hold combined messages from both roomStore and socketStore
  const [combinedMessages, setCombinedMessages] = useState<Message[]>([])

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

  // Scroll to bottom when new messages arrive or when combined messages change
  useEffect(() => {
    if (
      !messagesLoading && 
      (combinedMessages.length > 0 || (socketStore?.messages && socketStore?.messages.length > 0))
    ) {
      // Use requestAnimationFrame to ensure UI has updated before scrolling
      requestAnimationFrame(() => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });
    }
  }, [combinedMessages.length, socketStore?.messages?.length, messagesLoading]);
  // Combine messages from both roomStore and socketStore
  useEffect(() => {
    // Only fetch messages once when component mounts and roomCode is available
    const fetchMessages = async () => {
      if (roomCode) {
        // Only fetch if we don't have messages or need to refresh
          setMessagesLoading(true); // Start loading
          try {
            const res = await roomStore.getRoomMessages(roomCode, 1, 10);
            console.log("RES:",res)
            if (res.messages && res.messages.length > 0) {
              setRoomMessagesState(res.messages);
              console.log(`[MessageRoom] Fetched ${res.messages.length} messages successfully`);
            } else {
              setRoomMessagesState([]);
              console.log("[MessageRoom] No messages found for room");
            }
          } catch (error) {
            console.error("[MessageRoom] Error fetching messages:", error);
            // Set empty array on error to avoid undefined issues
            setRoomMessagesState([]);
          } finally {
            setMessagesLoading(false); // End loading regardless of success/failure
          }
      } else {
        console.log("[MessageRoom] No room code available, skipping message fetch");
        setMessagesLoading(false);
      }
    };
    
    fetchMessages();
  }, [roomCode]); // Only depends on roomCode to prevent unnecessary fetches
  
  // Process and combine messages whenever either source changes
  useEffect(() => {
    const roomMessages = roomMessagesState || [];
    const socketMessages = socketStore?.messages || [];
    
    // Create a new array with all unique messages
    const allMessages = [...roomMessages];
    
    // Add socket messages if they're not already in the list
    socketMessages.forEach(socketMsg => {
      if (!socketMsg) return;
      
      const isDuplicate = allMessages.some(existingMsg => 
        isDuplicateMessage(existingMsg, socketMsg)
      );
      
      if (!isDuplicate) {
        allMessages.push(socketMsg);
      }
    });
    
    // Preserve any locally added messages that aren't yet in server responses
    // This ensures messages we've added locally don't disappear during refreshes
    if (combinedMessages.length > 0) {
      combinedMessages.forEach(localMsg => {
        // Only check messages that were recently added (within last minute)
        const msgTime = new Date(getMessageTimestamp(localMsg)).getTime();
        const now = new Date().getTime();
        const isRecent = now - msgTime < 60000; // Within last minute
        
        if (isRecent) {
          const isDuplicate = allMessages.some(serverMsg => 
            serverMsg.message === localMsg.message && 
            Math.abs(new Date(getMessageTimestamp(serverMsg)).getTime() - 
                    new Date(getMessageTimestamp(localMsg)).getTime()) < 3000
          );
          
          if (!isDuplicate) {
            allMessages.push(localMsg);
          }
        }
      });
    }
    
    // Sort messages by timestamp
    allMessages.sort(compareMessageTimestamps);
    
    // Update combined messages
    setCombinedMessages(allMessages);
    
  }, [roomStore.roomMessages, socketStore?.messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    try {
      if (socketStore && socketStore.isConnected) {
        // Create a temporary message object to display immediately
        const newMessage: Message = {
          message: message.trim(),
          sender: userId || '',
          createdAt: new Date().toISOString(),
          isAnonymous: true,
          deviceInfo: currentDeviceInfo || socketStore?.deviceInfo?.slugifiedDeviceName || '',
        };
        
        // Add the message to the combined messages array to show it immediately
        const updatedMessages = [...combinedMessages, newMessage];
        setCombinedMessages(updatedMessages);
        
        // Actually send the message to the server
        sendWebSocketMessage(socketStore, message.trim());
        
        // Clear the input
        setMessage("");
        
        // No need for scroll logic here as it's handled by the useEffect above
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const renderMessage = (msg: Message, index: number) => {
    // Check if message is from current user by comparing deviceInfo with our deviceInfo
    const isMe = msg.deviceInfo === currentDeviceInfo || 
                 msg.deviceInfo === socketStore?.deviceInfo?.slugifiedDeviceName ||
                 msg.deviceInfo === sessionStore?.deviceInfo;
      
    return (
      <Message
        key={getMessageTimestamp(msg) || index}
        message={msg}
        index={index}
        isMe={isMe}
        currentUserId={userId}
        deviceInfo={socketStore?.deviceInfo}
      />
    )
  }

  // Group messages by date
  const groupedMessages = React.useMemo(() => {
    try {
      if (!combinedMessages || !Array.isArray(combinedMessages) || combinedMessages.length === 0) {
        return {};
      }
      
      return combinedMessages.reduce((groups: Record<string, Message[]>, message) => {
        if (!message) return groups;
        
        const timestamp = getMessageTimestamp(message);
        if (!timestamp) return groups;
        
        try {
          const date = new Date(timestamp).toLocaleDateString();
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
  }, [combinedMessages]);

  // Handle scroll to load more messages
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
    const paddingToBottom = 20
    const isCloseToTop = contentOffset.y <= paddingToBottom

    if (isCloseToTop && roomStore.hasMore && !roomStore.loading) {
      roomStore.loadMoreMessages(roomStore.roomCode)
    }
  }

  if (!isStoreAvailable) {
    return (
      <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($container)}>
        <Header
          title="Chat Room"
          leftIcon="back"
          onLeftPress={() => navigation.goBack()}
        />
        <View style={themed($loadingContainer)}>
          <ActivityIndicator size="large" color={themed($loadingIndicator).color as string} />
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
              <ActivityIndicator size="large" color={themed($loadingIndicator).color as string} />
              <Text style={themed($loadingText)}>Connecting to chat...</Text>
            </Animated.View>
          ) : socketStore?.error ? (
            <Animated.View
              entering={FadeIn}
              style={themed($errorContainer)}
            >
              <Icon icon="x" size={50} color={themed($errorIcon).color as string} />
              <Text style={themed($errorText)}>{socketStore.error}</Text>
              <TouchableOpacity
                style={themed($retryButton)}
                onPress={() => initializeWebSocket(socketStore, roomId, userId, roomCode)}
              >
                <Text style={themed($retryButtonText)}>Retry Connection</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : messagesLoading ? (
            <Animated.View
              entering={FadeIn}
              style={themed($loadingContainer)}
            >
              <ActivityIndicator size="large" color={themed($loadingIndicator).color as string} />
              <Text style={themed($loadingText)}>Loading messages...</Text>
            </Animated.View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={themed($scrollView)}
              contentContainerStyle={themed($scrollViewContent)}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
              onScroll={handleScroll}
              scrollEventThrottle={400}
            >
              {roomStore.messages.map((msg, index) => renderMessage(msg, index))}

              {roomStore.loading && (
                <View style={themed($loadingMoreContainer)}>
                  <ActivityIndicator size="small" color={themed($loadingIndicator).color as string} />
                  <Text style={themed($loadingMoreText)}>Loading more messages...</Text>
                </View>
              )}

              {(!roomStore.messages || roomStore.messages.length === 0) && (
                <Animated.View
                  entering={FadeIn}
                  style={themed($emptyStateContainer)}
                >
                  <Icon icon="components" size={50} color={themed($emptyStateIcon).color as string} />
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
                (!message.trim() || !socketStore?.isConnected || !!socketStore?.error) && themed($disabledSendButton)
              ]}
              disabled={!message.trim() || !socketStore?.isConnected || !!socketStore?.error}
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
  marginTop: spacing.sm,
  marginBottom: spacing.sm,
})

const $dateHeaderLine: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  height: 1,
  backgroundColor: colors.border,
})

const $dateHeaderTextContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 12,
  marginHorizontal: spacing.sm,
})

const $dateHeaderText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 13,
  color: colors.textDim,
  marginLeft: spacing.xs,
  fontWeight: '500',
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
  elevation: 1,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 1,
})

const $myMessageBox: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.primary500,
  borderBottomLeftRadius: 16,
  borderBottomRightRadius: 4,
  borderTopRightRadius: 4,
})

const $otherMessageBox: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral300,
  borderTopLeftRadius: 4,
})

const $messageText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 16,
  marginBottom: spacing.xs,
  lineHeight: 22,
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
  marginTop: 4,
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

const $loadingIndicator: ThemedStyle<{ color: string }> = ({ colors }) => ({
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

const $errorIcon: ThemedStyle<{ color: string }> = ({ colors }) => ({
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

const $emptyStateIcon: ThemedStyle<{ color: string }> = ({ colors }) => ({
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

const $attachmentContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  padding: spacing.xs,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 8,
  marginBottom: spacing.xs,
})

const $attachmentIcon: ThemedStyle<ImageStyle> = ({ colors }) => ({
  marginRight: 8,
  tintColor: colors.palette.neutral800,
})

const $attachmentText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral800,
  fontSize: 14,
})

const $loadingMoreContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  padding: spacing.sm,
})

const $loadingMoreText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.sm,
  fontSize: 14,
  color: colors.textDim,
})
