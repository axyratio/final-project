import React from 'react';
import { Image, Alert } from 'react-native';
import { Box, Text, Pressable, HStack } from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import type { UserTryOnImage } from '@/api/closet';
import * as ImagePicker from 'expo-image-picker';

interface ModelSelectorProps {
  userImages: UserTryOnImage[];
  selectedModel: UserTryOnImage | null;
  onSelectModel: (image: UserTryOnImage) => void;
  onAddModel: (file: File | string) => void;
  onDeleteModel: (imageId: string) => void; // ✅ แก้จาก number เป็น string
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  userImages,
  selectedModel,
  onSelectModel,
  onAddModel,
  onDeleteModel,
}) => {

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7
    });

    if (!result.canceled && result.assets[0]) {
      onAddModel(result.assets[0].uri);
    }
  };

  const handleDelete = (image: UserTryOnImage) => {
    Alert.alert(
      'ยืนยันการลบ',
      'คุณต้องการลบภาพนี้หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: () => onDeleteModel(image.user_image_id), // ตอนนี้เป็น string เหมือนกันแล้ว
        },
      ]
    );
  };

  return (
    <Box>
      <Text fontSize="sm" color="gray.600" mb={4}>
        ภาพในตัวของคุณ
      </Text>

      <HStack flexWrap="wrap" justifyContent="flex-start" mx="-1%">
        <Pressable
          onPress={handlePickImage}
          width="31.3%"
          style={{ aspectRatio: 3/4 }}
          bg="white"
          borderWidth={2}
          borderColor="gray.300"
          borderStyle="dashed"
          borderRadius="lg"
          justifyContent="center"
          alignItems="center"
          m="1%"
          mb={3}
        >
          <Ionicons name="add" size={32} color="#9CA3AF" />
        </Pressable>

        {userImages.map((image) => (
          <Box
            key={image.user_image_id}
            width="31.3%"
            style={{ aspectRatio: 3/4 }}
            m="1%"
            mb={3}
            position="relative"
          >
            <Pressable
              onPress={() => onSelectModel(image)}
              width="100%"
              height="100%"
              borderRadius="lg"
              overflow="hidden"
              borderWidth={2}
              borderColor={selectedModel?.user_image_id === image.user_image_id ? '#7c3aed' : 'transparent'}
            >
              <Image
                source={{ uri: image.image_url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </Pressable>

            <Pressable
              onPress={() => handleDelete(image)}
              position="absolute"
              top={1}
              right={1}
              bg="red.500"
              borderRadius="full"
              p={1}
              zIndex={10}
              _pressed={{ bg: 'red.600' }}
            >
              <Ionicons name="close" size={16} color="white" />
            </Pressable>
          </Box>
        ))}
      </HStack>
    </Box>
  );
};