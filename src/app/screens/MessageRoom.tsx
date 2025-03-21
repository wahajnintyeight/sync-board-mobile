import React, { useState, useRef } from "react"
import { observer } from "mobx-react-lite"
import { View, ViewStyle, TextInput, KeyboardAvoidingView, Platform, TextStyle, TouchableOpacity, ScrollView, Dimensions, ImageStyle } from "react-native"
import { Screen, Text, Icon, Header } from "@/components"
import { useAppTheme } from "@/utils/useAppTheme"
import { ThemedStyle } from "@/theme"
import { useNavigation } from "@react-navigation/native"

export default observer(function MessageRoomScreen() {
  const [message, setMessage] = useState("")
  const { themed } = useAppTheme()
  const navigation = useNavigation()
  const scrollViewRef = useRef<ScrollView>(null)

  // Generate a random room name
  const roomName = "Design Team Chat #4872"

  // Dummy messages for UI demonstration
  const messages = [
    { id: 1, text: "Hello! Welcome to the chat room!", sender: "other", timestamp: "10:30 AM" },
    { id: 2, text: "Hi there! Thanks for having me.", sender: "me", timestamp: "10:31 AM" },
    { id: 3, text: "How are you doing today?", sender: "other", timestamp: "10:32 AM" },
    { id: 4, text: "I'm doing great, thanks for asking!", sender: "me", timestamp: "10:33 AM" },
    { id: 5, text: "What's on your mind?", sender: "other", timestamp: "10:34 AM" },
    { id: 6, text: "Just working on this new app. It's coming along nicely!", sender: "me", timestamp: "10:35 AM" },
    { id: 7, text: "That sounds awesome! Can't wait to see it.", sender: "other", timestamp: "10:36 AM" },
    { id: 8, text: "I'll show you when it's ready. Still need to fix a few things.", sender: "me", timestamp: "10:37 AM" },
    { id: 9, text: "Take your time. Quality is more important than speed.", sender: "other", timestamp: "10:38 AM" },
    { id: 10, text: "You're absolutely right about that!", sender: "me", timestamp: "10:39 AM" },
  ]

  const handleSend = () => {
    if (message.trim()) {
      // Handle sending message
      setMessage("")
      // Scroll to bottom after sending
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }

  const renderMessage = (msg: any) => {
    const isMe = msg.sender === "me"
    return (
      <View 
        key={msg.id} 
        style={[
          themed($messageWrapper),
          isMe ? themed($myMessageWrapper) : themed($otherMessageWrapper)
        ]}
      >
        <View style={[
          themed($messageBox),
          isMe ? themed($myMessageBox) : themed($otherMessageBox)
        ]}>
          <Text style={[
            themed($messageText),
            isMe ? themed($myMessageText) : themed($otherMessageText)
          ]}>
            {msg.text}
          </Text>
          <Text style={themed($timestamp)}>{msg.timestamp}</Text>
        </View>
      </View>
    )
  }

  return (
    <Screen preset="fixed" safeAreaEdges={["top", "bottom"]} style={themed($screenContainer)}>
      {/* Header Section - 20% height */}
      <View style={themed($headerSection)}>
        <View style={themed($headerTopRow)}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={themed($backButton)}>
            <Icon icon="caretLeft" size={24} />
          </TouchableOpacity>
          <View style={themed($roomInfoContainer)}>
            <Text style={themed($roomName)}>{roomName}</Text>
            <View style={themed($participantsContainer)}>
              <View style={themed($onlineDot)} />
              <Text style={themed($participantsText)}>5 participants • 3 online</Text>
            </View>
          </View>
          <TouchableOpacity style={themed($menuButton)}>
            <Icon icon="more" size={24} />
          </TouchableOpacity>
        </View>
        
        <View style={themed($dateHeaderContainer)}>
        </View>
      </View>

      {/* Messages Container - 70% height */}
      <View style={$messagesOuterContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={themed($scrollView)}
          contentContainerStyle={themed($scrollViewContent)}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map(renderMessage)}
        </ScrollView>
      </View>

      {/* Input Section - At the bottom */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={themed($inputSection)}
      >
        <View style={themed($inputContainer)}>
          <Icon icon="components" size={20} style={themed($attachIcon)} />
          <TextInput
            style={themed($input)}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            onPress={handleSend}
            style={themed($sendButton)}
            disabled={!message.trim()}
          >
            <Icon 
              icon="caretRight" 
              size={24} 
              color={message.trim() ? "white" : "#666"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
})

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
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
