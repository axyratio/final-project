// import React from "react";
// import {
//     Dimensions,
//     Image,
//     Modal,
//     StyleSheet,
//     Text,
//     TouchableOpacity,
//     View,
// } from "react-native";
// import {
//     Gesture,
//     GestureDetector,
// } from "react-native-gesture-handler";

// const { width } = Dimensions.get("window");

// type Props = {
//   uri: string;
//   visible: boolean;
//   onClose: () => void;
//   onCropped: (newUri: string) => void;
// };

// import * as ImageManipulator from "expo-image-manipulator";
// import Animated, {
//     useAnimatedStyle,
//     useSharedValue
// } from "react-native-reanimated";

// export default function CropModal({
//   uri,
//   visible,
//   onClose,
//   onCropped,
// }: Props) {
//   // กรอบ crop
//   const cropSize = useSharedValue(width * 0.6);
//   const cropX = useSharedValue((width - cropSize.value) / 2);
//   const cropY = useSharedValue((width - cropSize.value) / 2);

//   const startX = useSharedValue(0);
// const startY = useSharedValue(0);
// const startSize = useSharedValue(cropSize.value);

// /* MOVE */
// const moveGesture = Gesture.Pan()
//   .onBegin(() => {
//     startX.value = cropX.value;
//     startY.value = cropY.value;
//   })
//   .onUpdate((e) => {
//     cropX.value = startX.value + e.translationX;
//     cropY.value = startY.value + e.translationY;

//     // clamp boundaries
//     cropX.value = Math.min(Math.max(cropX.value, 0), width - cropSize.value);
//     cropY.value = Math.min(Math.max(cropY.value, 0), width - cropSize.value);
//   });

// /* RESIZE */
// const resizeGesture = Gesture.Pan()
//   .onBegin(() => {
//     startSize.value = cropSize.value;
//   })
//   .onUpdate((e) => {
//     const newSize = startSize.value + e.translationX;

//     cropSize.value = Math.max(80, Math.min(newSize, width));

//     // clamp after resize
//     cropX.value = Math.min(Math.max(cropX.value, 0), width - cropSize.value);
//     cropY.value = Math.min(Math.max(cropY.value, 0), width - cropSize.value);
//   });

// // allow both gestures simultaneously
// const combinedGesture = Gesture.Simultaneous(moveGesture, resizeGesture);


//   const cropStyle = useAnimatedStyle(() => ({
//     width: cropSize.value,
//     height: cropSize.value,
//     transform: [
//       { translateX: cropX.value },
//       { translateY: cropY.value },
//     ],
//   }));

//   const handleCrop = async () => {
//     const result = await ImageManipulator.manipulateAsync(
//       uri,
//       [
//         {
//           crop: {
//             originX: cropX.value,
//             originY: cropY.value,
//             width: cropSize.value,
//             height: cropSize.value,
//           },
//         },
//       ],
//       { format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
//     );

//     onCropped(result.uri);
//     onClose();
//   };

//   return (
//     <Modal visible={visible} transparent animationType="fade">
//       <View style={styles.container}>
//         {/* ภาพพื้นหลัง */}
//         <Image source={{ uri }} style={styles.image} resizeMode="cover" />

//         {/* กรอบ crop */}
// {/* กรอบ crop */}
// <GestureDetector gesture={combinedGesture}>
//   <Animated.View style={[styles.cropBox, cropStyle]}>
//     <GestureDetector gesture={resizeGesture}>
//       <View style={styles.handle} />
//     </GestureDetector>
//   </Animated.View>
// </GestureDetector>


//         {/* ปุ่ม */}
//         <TouchableOpacity style={styles.button} onPress={handleCrop}>
//           <Text style={styles.text}>ครอป</Text>
//         </TouchableOpacity>

//         <TouchableOpacity style={styles.closeButton} onPress={onClose}>
//           <Text style={styles.text}>ปิด</Text>
//         </TouchableOpacity>
//       </View>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.9)",
//     justifyContent: "center",
//     alignItems: "center",
//   },

//   image: {
//     width,
//     height: width,
//   },

//   cropBox: {
//     position: "absolute",
//     borderWidth: 2,
//     borderColor: "#ff3366",
//   },

//   handle: {
//     width: 24,
//     height: 24,
//     backgroundColor: "#ff3366",
//     position: "absolute",
//     right: -12,
//     bottom: -12,
//     borderRadius: 12,
//   },

//   button: {
//     marginTop: 20,
//     backgroundColor: "#ff3366",
//     padding: 12,
//     borderRadius: 10,
//   },

//   closeButton: {
//     marginTop: 10,
//     backgroundColor: "#555",
//     padding: 10,
//     borderRadius: 10,
//   },

//   text: {
//     color: "#fff",
//     fontSize: 16,
//   },
// });
