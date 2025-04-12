import React, { useState, useRef, useEffect } from "react"
import { View, ViewStyle, TextStyle, TouchableOpacity, ImageStyle, Share, Clipboard, ToastAndroid, Platform, Alert, Modal, Dimensions, TouchableWithoutFeedback } from "react-native"
import { Text, Icon } from "@/components"
import { useAppTheme } from "@/utils/useAppTheme"
import { ThemedStyle } from "@/theme"
import Animated, { SlideInRight, useAnimatedStyle, useSharedValue, withTiming, FadeIn } from "react-native-reanimated"

export interface MessageProps {
  message: {
    message: string
    sender: string
    timeStamp?: string
    createdAt?: string
    isAnonymous?: boolean
    deviceInfo?: string
    isAttachment?: boolean
    attachmentType?: string
    attachmentURL?: string
  }
  index: number
  isMe: boolean
  currentUserId?: string | null
  deviceInfo?: any
}

export function Message(props: MessageProps) {
  const { message, index, isMe, currentUserId } = props
  const { themed } = useAppTheme()
  const [modalVisible, setModalVisible] = useState(false)
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 })
  const messageRef = useRef<View>(null)
  
  // Animation values
  const scale = useSharedValue(1);

  // Helper function to get timestamp
  const getMessageTimestamp = (msg: any): string => {
    return msg?.timeStamp || msg?.createdAt || ''
  }

  const timestamp = getMessageTimestamp(message)

  // Close modal if back button is pressed (Android)
  useEffect(() => {
    const backHandler = () => {
      if (modalVisible) {
        closeModal();
        return true;
      }
      return false;
    };

    if (Platform.OS === 'android') {
      const { BackHandler } = require('react-native');
      BackHandler.addEventListener('hardwareBackPress', backHandler);
      return () => BackHandler.removeEventListener('hardwareBackPress', backHandler);
    }
  }, [modalVisible]);

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 100 });
  }

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  }

  const handleLongPress = () => {
    scale.value = withTiming(1, { duration: 100 });
    
    if (messageRef.current) {
      messageRef.current.measure((x, y, width, height, pageX, pageY) => {
        // Calculate position
        const windowWidth = Dimensions.get('window').width;
        const modalX = isMe ? Math.min(pageX - 130, windowWidth - 190) : pageX + 30;
        
        setModalPosition({ 
          x: modalX, 
          y: Math.max(60, pageY - 120) 
        });
        
        // Using requestAnimationFrame to ensure UI thread is free
        requestAnimationFrame(() => {
          setModalVisible(true);
        });
      });
    } else {
      setModalVisible(true);
    }
  }

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  // Function to close the modal
  const closeModal = () => {
    setModalVisible(false);
  };

  const handleCopyMessage = () => {
    if (message.message) {
      Clipboard.setString(message.message)
      
      // Show feedback that message was copied
      if (Platform.OS === 'android') {
        ToastAndroid.show('Message copied to clipboard', ToastAndroid.SHORT);
      } else {
        Alert.alert('Copied', 'Message copied to clipboard');
      }
    }
    closeModal();
  }

  const handleShareMessage = async () => {
    try {
      await Share.share({
        message: message.message || '',
      })
    } catch (error) {
      console.error("Error sharing message:", error)
    }
    closeModal();
  }

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={300}
      >
        <Animated.View
          ref={messageRef}
          entering={SlideInRight.delay(index * 50).springify()}
          style={[
            animatedStyle,
            themed($messageWrapper),
            isMe ? themed($myMessageWrapper) : themed($otherMessageWrapper)
          ]}
        >
          {!isMe && (
            <Text style={themed($senderName)}>
              {message.isAnonymous ? 'Anonymous' : (message.sender || 'User')}
            </Text>
          )}
          <View style={[
            themed($messageBox),
            isMe ? themed($myMessageBox) : themed($otherMessageBox)
          ]}>
            {message.isAttachment && message.attachmentURL ? (
              <View style={themed($attachmentContainer)}>
                <Icon icon="components" size={24} style={themed($attachmentIcon)} />
                <Text style={themed($attachmentText)}>
                  {message.attachmentType || 'Attachment'}
                </Text>
              </View>
            ) : (
              <Text style={[
                themed($messageText),
                isMe ? themed($myMessageText) : themed($otherMessageText)
              ]}>
                {message.message}
              </Text>
            )}
            <Text style={[
              themed($timestamp),
              isMe ? themed($myTimestamp) : themed($otherTimestamp)
            ]}>
              {timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Message Options Modal */}
      {modalVisible && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={closeModal}
          hardwareAccelerated={true}
        >
          <TouchableWithoutFeedback onPress={closeModal}>
            <View style={themed($fullScreenOverlay)}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <Animated.View 
                  entering={FadeIn.duration(150)}
                  style={[
                    themed($modalCard),
                    {
                      position: 'absolute',
                      left: modalPosition.x,
                      top: modalPosition.y,
                    }
                  ]}
                >
                  {/* Little arrow indicator */}
                  <View style={[themed($modalArrow), { alignSelf: isMe ? 'flex-end' : 'flex-start', marginRight: isMe ? 20 : 0, marginLeft: isMe ? 0 : 20 }]} />
                  
                  <View style={themed($modalContent)}>
                    <TouchableOpacity
                      style={themed($modalButton)}
                      onPress={handleCopyMessage}
                    >
                      <View style={themed($iconBubble)}>
                        <Icon icon="components" size={18} color={themed($iconColor).color as string} />
                      </View>
                      <Text style={themed($modalButtonText)}>Copy</Text>
                    </TouchableOpacity>
                    
                    <View style={themed($modalDivider)} />
                    
                    <TouchableOpacity
                      style={themed($modalButton)}
                      onPress={handleShareMessage}
                    >
                      <View style={themed($iconBubble)}>
                        <Icon icon="community" size={18} color={themed($iconColor).color as string} />
                      </View>
                      <Text style={themed($modalButtonText)}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  )
}

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

const $myTimestamp: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral100,
  opacity: 0.7,
})

const $otherTimestamp: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral800,
  opacity: 0.7,
})

const $senderName: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginBottom: spacing.xs,
  marginLeft: spacing.sm,
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

// Add new modal styles
const $fullScreenOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
})

const $modalCard: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 160,
  backgroundColor: colors.background,
  borderRadius: 16,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 6,
  elevation: 5,
})

const $modalArrow: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 0,
  height: 0,
  backgroundColor: 'transparent',
  borderStyle: 'solid',
  borderLeftWidth: 8,
  borderRightWidth: 8,
  borderBottomWidth: 10,
  borderLeftColor: 'transparent',
  borderRightColor: 'transparent',
  borderBottomColor: colors.background,
  transform: [{ translateY: -8 }],
})

const $modalContent: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderRadius: 16,
  overflow: 'hidden',
  paddingVertical: 8,
})

const $modalButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: spacing.md,
})

const $modalButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: '500',
  color: colors.text,
  marginLeft: 12,
})

const $modalDivider: ThemedStyle<ViewStyle> = ({ colors }) => ({
  height: 1,
  backgroundColor: colors.border,
  opacity: 0.4,
  marginHorizontal: 12,
})

const $iconBubble: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: colors.palette.neutral200,
  justifyContent: 'center',
  alignItems: 'center',
})

const $iconColor: ThemedStyle<{ color: string }> = ({ colors }) => ({
  color: colors.text,
})
