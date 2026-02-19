// components/closet/outfit-selector.tsx

import type { GarmentImage, Product, ProductVariant } from "@/api/closet";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Box, Center, HStack, Pressable, Text } from "native-base";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, Image, ScrollView } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_ASPECT_RATIO = 3 / 4;
const IMAGE_HEIGHT = SCREEN_WIDTH / IMAGE_ASPECT_RATIO;

export type OutfitTabId = "select" | "result" | "product";

interface OutfitSelectorProps {
  product: Product | null;
  garments: GarmentImage[];

  productGarments?: ProductVariant[];

  selectedVariant: ProductVariant | null;
  selectedGarment: GarmentImage | null;

  selectedProductGarment?: ProductVariant | null;

  onSelectVariant: (variant: ProductVariant) => void;
  onSelectGarment: (garment: GarmentImage) => void;

  onSelectProductGarment?: (variant: ProductVariant) => void;

  onAddOutfit: (imageUri: string) => void;
  resultImageUrl?: string;

  onDeleteVariant: (variantId: string) => void;
  onDeleteGarment: (garmentId: string) => void;

  onDeleteProductGarment?: (variantId: string) => void;

  outfitTabId?: OutfitTabId;
  onChangeOutfitTabId?: (id: OutfitTabId) => void;
}

export const OutfitSelector: React.FC<OutfitSelectorProps> = ({
  product,
  garments,

  productGarments = [],

  selectedVariant,
  selectedGarment,

  selectedProductGarment = null,

  onSelectVariant,
  onSelectGarment,

  onSelectProductGarment = () => {},

  onAddOutfit,
  resultImageUrl,
  onDeleteVariant,
  onDeleteGarment,

  onDeleteProductGarment = () => {},

  outfitTabId,
  onChangeOutfitTabId,
}) => {
  const router = useRouter();

  const tabIds: OutfitTabId[] = useMemo(
    () => ["select", "result", "product"],
    [],
  );

  // ✅ ใช้ prop outfitTabId เป็นหลัก
  const controlledIndex = outfitTabId ? tabIds.indexOf(outfitTabId) : -1;
  const initialIndex = controlledIndex >= 0 ? controlledIndex : 0;

  const [activeTab, setActiveTab] = useState(initialIndex);

  // ✅ sync internal state <- prop
  useEffect(() => {
    if (controlledIndex >= 0) {
      console.log("🔄 [OutfitSelector] Syncing tab from prop:", outfitTabId);
      setActiveTab(controlledIndex);
    }
  }, [controlledIndex, outfitTabId]);

  const setTab = (idx: number) => {
    const safeIdx = Math.max(0, Math.min(idx, tabIds.length - 1));
    const id = tabIds[safeIdx] ?? "select";

    console.log("📍 [OutfitSelector] Changing tab to:", id);
    setActiveTab(safeIdx);

    // แจ้ง parent
    onChangeOutfitTabId?.(id);
  };

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "สิทธิ์การเข้าถึงถูกปฏิเสธ",
        "กรุณาอนุญาตให้แอปเข้าถึงคลังรูปภาพเพื่อเพิ่มชุด",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      // aspect: [3, 4],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      onAddOutfit(result.assets[0].uri);
    }
  };

  const handleDeleteVariant = (variant: ProductVariant) => {
    Alert.alert(
      "ยืนยันการลบ",
      `ต้องการลบตัวเลือก ${variant.name_option} หรือไม่?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบ",
          style: "destructive",
          onPress: () => onDeleteVariant(variant.variant_id),
        },
      ],
    );
  };

  const handleDeleteGarment = (garment: GarmentImage) => {
    Alert.alert("ยืนยันการลบ", `ต้องการลบ ${garment.name} หรือไม่?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => onDeleteGarment(garment.garment_id),
      },
    ]);
  };

  const handleDeleteProductGarment = (variant: ProductVariant) => {
    Alert.alert("ยืนยันการลบ", `ต้องการลบ ${variant.name_option} หรือไม่?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => onDeleteProductGarment(variant.variant_id),
      },
    ]);
  };

  const getCurrentImage = () => {
    if (selectedVariant) {
      return (
        selectedVariant.images?.[0]?.image_url ||
        product?.images?.[0]?.image_url ||
        undefined
      );
    }
    if (selectedGarment) return selectedGarment.image_url || undefined;
    if (selectedProductGarment)
      return selectedProductGarment.images?.[0]?.image_url || undefined;
    return product?.images?.[0]?.image_url || undefined;
  };

  const currentImage = getCurrentImage();

  return (
    <Box flex={1} bg="white">
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        height={IMAGE_HEIGHT}
        bg="gray.50"
        alignItems="center"
        borderRadius={5}
      >
        {activeTab === 0 || activeTab === 2 ? (
          currentImage ? (
            <Image
              source={{ uri: currentImage }}
              style={{ width: "90%", height: "90%" }}
              resizeMode="contain"
            />
          ) : (
            <Center flex={1}>
              <Ionicons name="image-outline" size={48} color="#A1A1AA" />
              <Text color="gray.400" mt={2}>
                ไม่มีรูปให้แสดง
              </Text>
            </Center>
          )
        ) : (
          <Box style={{ width: "100%", height: "100%" }} bg="gray.100">
            {resultImageUrl ? (
              <Image
                source={{ uri: resultImageUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Center flex={1}>
                <Ionicons name="color-wand-outline" size={48} color="#A1A1AA" />
                <Text color="gray.400" mt={2}>
                  กดปุ่มเพื่อเริ่มลองชุด
                </Text>
              </Center>
            )}
          </Box>
        )}
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        scrollEventThrottle={16}
      >
        <Box height={IMAGE_HEIGHT - 50} bg="transparent" />

        <Box
          bg="white"
          borderTopRadius="3xl"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            elevation: 12,
          }}
          minHeight={SCREEN_HEIGHT}
        >
          <Center py={4}>
            <Box width={12} height={1.5} bg="gray.200" borderRadius="full" />
          </Center>

          <Box px={5} pb={3} bg="white">
            <HStack bg="gray.100" p={1} borderRadius="2xl">
              <Pressable
                flex={1}
                py={2.5}
                onPress={() => setTab(0)}
                bg={activeTab === 0 ? "white" : "transparent"}
                borderRadius="xl"
                style={
                  activeTab === 0
                    ? {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 3,
                        elevation: 2,
                      }
                    : {}
                }
              >
                <Text
                  textAlign="center"
                  color={activeTab === 0 ? "violet.600" : "gray.500"}
                  fontWeight="bold"
                  fontSize="xs"
                >
                  เลือกชุด
                </Text>
              </Pressable>

              {/* <Pressable
                flex={1}
                py={2.5}
                onPress={() => setTab(1)}
                bg={activeTab === 1 ? "white" : "transparent"}
                borderRadius="xl"
                style={
                  activeTab === 1
                    ? {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 3,
                        elevation: 2,
                      }
                    : {}
                }
              >
                <Text
                  textAlign="center"
                  color={activeTab === 1 ? "violet.600" : "gray.500"}
                  fontWeight="bold"
                  fontSize="xs"
                >
                  ผลลัพธ์ AI
                </Text>
              </Pressable> */}

              <Pressable
                flex={1}
                py={2.5}
                onPress={() => setTab(2)}
                bg={activeTab === 2 ? "white" : "transparent"}
                borderRadius="xl"
                style={
                  activeTab === 2
                    ? {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 3,
                        elevation: 2,
                      }
                    : {}
                }
              >
                <Text
                  textAlign="center"
                  color={activeTab === 2 ? "violet.600" : "gray.500"}
                  fontWeight="bold"
                  fontSize="xs"
                >
                  เสื้อจากสินค้า
                </Text>
              </Pressable>
            </HStack>
          </Box>

          <Box p={3}>
            {activeTab === 0 ? (
              <Box flexDirection="row" flexWrap="wrap">
                <Pressable
                  onPress={handlePickImage}
                  width="31.3%"
                  style={{ aspectRatio: 3 / 4 }}
                  bg="gray.50"
                  borderWidth={1.5}
                  borderColor="gray.200"
                  borderStyle="dashed"
                  borderRadius="2xl"
                  justifyContent="center"
                  alignItems="center"
                  m="1%"
                >
                  <Box bg="white" p={2} borderRadius="full" shadow={1}>
                    <Ionicons name="add" size={24} color="#7C3AED" />
                  </Box>
                  <Text
                    fontSize="xs"
                    mt={2}
                    color="gray.400"
                    fontWeight="medium"
                  >
                    เพิ่มชุด
                  </Text>
                </Pressable>

                {garments.map((garment) => (
                  <Box
                    key={garment.garment_id}
                    width="31.3%"
                    m="1%"
                    position="relative"
                  >
                    <Pressable
                      onPress={() => onSelectGarment(garment)}
                      width="100%"
                      style={{ aspectRatio: 3 / 4 }}
                      borderRadius="2xl"
                      overflow="hidden"
                      borderWidth={2}
                      borderColor={
                        selectedGarment?.garment_id === garment.garment_id
                          ? "violet.600"
                          : "transparent"
                      }
                    >
                      <Image
                        source={{ uri: garment.image_url }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="contain"
                      />
                      {selectedGarment?.garment_id === garment.garment_id && (
                        <Box
                          position="absolute"
                          top={1}
                          left={1}
                          bg="violet.600"
                          borderRadius="full"
                          p={0.5}
                        >
                          <Ionicons name="checkmark" size={10} color="white" />
                        </Box>
                      )}
                      <Box
                        position="absolute"
                        bottom={1}
                        left={1}
                        right={1}
                        bg="rgba(0,0,0,0.6)"
                        px={1}
                        py={0.5}
                        borderRadius="md"
                      >
                        <Text fontSize="2xs" color="white" numberOfLines={1}>
                          {garment.name}
                        </Text>
                      </Box>
                    </Pressable>

                    <Pressable
                      onPress={() => handleDeleteGarment(garment)}
                      position="absolute"
                      top={-5}
                      right={-5}
                      bg="white"
                      borderRadius="full"
                      p={1}
                      zIndex={10}
                      shadow={2}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </Pressable>
                  </Box>
                ))}

                {product?.variants?.map((variant) => (
                  <Box
                    key={variant.variant_id}
                    width="31.3%"
                    m="1%"
                    position="relative"
                  >
                    <Pressable
                      onPress={() => onSelectVariant(variant)}
                      width="100%"
                      style={{ aspectRatio: 3 / 4 }}
                      borderRadius="2xl"
                      overflow="hidden"
                      borderWidth={2}
                      borderColor={
                        selectedVariant?.variant_id === variant.variant_id
                          ? "violet.600"
                          : "transparent"
                      }
                    >
                      <Image
                        source={{ uri: variant?.images?.[0]?.image_url }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                      {selectedVariant?.variant_id === variant.variant_id && (
                        <Box
                          position="absolute"
                          top={1}
                          left={1}
                          bg="violet.600"
                          borderRadius="full"
                          p={0.5}
                        >
                          <Ionicons name="checkmark" size={10} color="white" />
                        </Box>
                      )}
                      <Box
                        position="absolute"
                        bottom={1}
                        left={1}
                        right={1}
                        bg="rgba(124,58,237,0.8)"
                        px={1}
                        py={0.5}
                        borderRadius="md"
                      >
                        <Text fontSize="2xs" color="white" numberOfLines={1}>
                          {variant.name_option}
                        </Text>
                      </Box>
                    </Pressable>

                    <Pressable
                      onPress={() => handleDeleteVariant(variant)}
                      position="absolute"
                      top={-5}
                      right={-5}
                      bg="white"
                      borderRadius="full"
                      p={1}
                      zIndex={10}
                      shadow={2}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </Pressable>
                  </Box>
                ))}
              </Box>
            ) : activeTab === 1 ? (
              <Center py={20}>
                {resultImageUrl ? (
                  <Text color="gray.500" fontWeight="medium">
                    เลื่อนลงเพื่อดูภาพผลลัพธ์แบบเต็มจอ
                  </Text>
                ) : (
                  <Box alignItems="center">
                    <Ionicons name="images-outline" size={40} color="#D1D5DB" />
                    <Text color="gray.400" mt={2}>
                      ยังไม่มีรูปผลลัพธ์จากการลองชุด
                    </Text>
                  </Box>
                )}
              </Center>
            ) : (
              <Box flexDirection="row" flexWrap="wrap">
                {productGarments.length === 0 ? (
                  <Center width="100%" py={20}>
                    <Ionicons name="shirt-outline" size={48} color="#D1D5DB" />
                    <Text color="gray.400" mt={2}>
                      ยังไม่มีเสื้อจากสินค้า
                    </Text>
                    <Text color="gray.400" fontSize="xs" mt={1}>
                      กดปุ่ม "ลองเสื้อ" ในหน้าสินค้าเพื่อเพิ่ม
                    </Text>
                  </Center>
                ) : (
                  productGarments.map((variant) => (
                    <Box
                      key={variant.variant_id}
                      width="31.3%"
                      m="1%"
                      position="relative"
                    >
                      <Pressable
                        onPress={() => onSelectProductGarment(variant)}
                        width="100%"
                        style={{ aspectRatio: 3 / 4 }}
                        borderRadius="2xl"
                        overflow="hidden"
                        borderWidth={2}
                        borderColor={
                          selectedProductGarment?.variant_id ===
                          variant.variant_id
                            ? "violet.600"
                            : "transparent"
                        }
                      >
                        <Image
                          source={{ uri: variant?.images?.[0]?.image_url }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                        {selectedProductGarment?.variant_id ===
                          variant.variant_id && (
                          <Box
                            position="absolute"
                            top={1}
                            left={1}
                            bg="violet.600"
                            borderRadius="full"
                            p={0.5}
                          >
                            <Ionicons
                              name="checkmark"
                              size={10}
                              color="white"
                            />
                          </Box>
                        )}
                        <Box
                          position="absolute"
                          bottom={1}
                          left={1}
                          right={1}
                          bg="rgba(16,185,129,0.8)"
                          px={1}
                          py={0.5}
                          borderRadius="md"
                        >
                          <Text fontSize="2xs" color="white" numberOfLines={1}>
                            {variant.name_option}
                          </Text>
                        </Box>
                      </Pressable>

                      <Pressable
                        onPress={() => handleDeleteProductGarment(variant)}
                        position="absolute"
                        top={-5}
                        right={-5}
                        bg="white"
                        borderRadius="full"
                        p={1}
                        zIndex={10}
                        shadow={2}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#EF4444"
                        />
                      </Pressable>
                    </Box>
                  ))
                )}
              </Box>
            )}

            <Box height={100} />
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
};
