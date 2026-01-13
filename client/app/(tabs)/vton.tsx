import type {
  CreateVTONSessionRequest,
  GarmentImage,
  Product,
  ProductVariant,
  UserTryOnImage,
  VTONBackground,
  VTONSession,
} from "@/api/closet";
import { closetApi, mockData } from "@/api/closet";
import { BackgroundSelector } from "@/components/closet/background-selector";
import { ModelSelector } from "@/components/closet/model-selector";
import { OutfitSelector } from "@/components/closet/outfit-selector";
import { ResultSelector } from "@/components/closet/result-selector";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Box, Button, Center, HStack, Pressable, Spinner, Text, useToast } from "native-base";
import React, { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

type MainTabId = "result" | "model" | "outfit" | "background";
type OutfitTabId = "select" | "product";

const MAIN_TAB_IDS: MainTabId[] = ["result", "model", "outfit", "background"];
const OUTFIT_TAB_IDS: OutfitTabId[] = ["select", "product"];

function mainTabIdToIndex(id?: string): number {
  const idx = MAIN_TAB_IDS.indexOf(id as MainTabId);
  return idx >= 0 ? idx : 0;
}
function mainTabIndexToId(idx: number): MainTabId {
  return MAIN_TAB_IDS[idx] ?? "result";
}
function outfitTabIdToIndex(id?: string): number {
  const idx = OUTFIT_TAB_IDS.indexOf(id as OutfitTabId);
  return idx >= 0 ? idx : 0;
}
function outfitTabIndexToId(idx: number): OutfitTabId {
  return OUTFIT_TAB_IDS[idx] ?? "select";
}

export default function VirtualTryOnPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tab?: string;
    outfitTab?: string;
    productId?: string;
    variantId?: string;
  }>();

  const toast = useToast();
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [outfitTabIndex, setOutfitTabIndex] = useState(0);

  // States
  const [selectedModel, setSelectedModel] = useState<UserTryOnImage | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedGarment, setSelectedGarment] = useState<GarmentImage | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<VTONBackground | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  const [userImages, setUserImages] = useState<UserTryOnImage[]>([]);
  const [garments, setGarments] = useState<GarmentImage[]>([]);
  const [product, setProduct] = useState<Product | null>(mockData.product);
  const [backgrounds, setBackgrounds] = useState<VTONBackground[]>([]);

  const [productGarments, setProductGarments] = useState<ProductVariant[]>([]);
  const [selectedProductGarment, setSelectedProductGarment] = useState<ProductVariant | null>(null);

  // ✅ State สำหรับ VTON Sessions
  const [vtonSessions, setVtonSessions] = useState<VTONSession[]>([]);

  const tabs = ["ผลลัพธ์ AI", "เลือกโมเดล", "เลือกชุด", "พื้นหลัง"];

  const setRouteParams = (next: { tab?: MainTabId; outfitTab?: OutfitTabId }) => {
    (router as any).setParams?.({
      ...params,
      ...next,
    });
  };

  // ✅ sync state <- route params
  useEffect(() => {
    const tabIdx = mainTabIdToIndex(params.tab);
    setCurrentTab(tabIdx);

    const outfitIdx = outfitTabIdToIndex(params.outfitTab);
    setOutfitTabIndex(outfitIdx);
  }, [params.tab, params.outfitTab]);

  // ✅ Load ข้อมูลทั้งหมดตอนเริ่มต้น
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);
      console.log("🔄 Loading initial data...");

      const [
        userImagesData,
        garmentsData,
        backgroundsData,
        productGarmentsData,
        sessionsData,
      ] = await Promise.all([
        closetApi.getUserTryOnImages().catch((err) => {
          console.error("❌ Failed to load user images:", err);
          return [];
        }),
        closetApi.getGarmentImages().catch((err) => {
          console.error("❌ Failed to load garments:", err);
          return [];
        }),
        closetApi.getVTONBackgrounds().catch((err) => {
          console.error("❌ Failed to load backgrounds:", err);
          return [];
        }),
        closetApi.getProductGarments().catch((err) => {
          console.error("❌ Failed to load product garments:", err);
          return [];
        }),
        closetApi.getVTONSessions(50).catch((err) => {
          console.error("❌ Failed to load VTON sessions:", err);
          return [];
        }),
      ]);

      console.log("✅ Data loaded:", {
        userImages: userImagesData.length,
        garments: garmentsData.length,
        backgrounds: backgroundsData.length,
        productGarments: productGarmentsData.length,
        sessions: sessionsData.length,
      });

      setUserImages(userImagesData);
      setGarments(garmentsData);
      setBackgrounds(backgroundsData);
      setProductGarments(productGarmentsData);
      setVtonSessions(sessionsData);
    } catch (error) {
      console.error("❌ Error loading data:", error);
      toast.closeAll();
      toast.show({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลได้",
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const handleBack = () => {
    if (currentTab > 0) {
      const nextIndex = currentTab - 1;
      setCurrentTab(nextIndex);
      setRouteParams({ tab: mainTabIndexToId(nextIndex) });
    } else {
      router.back();
    }
  };

  const handleNext = () => {
    if (currentTab < tabs.length - 1) {
      const nextIndex = currentTab + 1;
      setCurrentTab(nextIndex);
      setRouteParams({ tab: mainTabIndexToId(nextIndex) });
    }
  };

  const handleAddModel = (fileUri: string | File) => {
    setLoading(true);
    (async () => {
      try {
        console.log("📤 Starting model upload...");
        const newImage = await closetApi.uploadUserTryOnImage(fileUri as string);
        setUserImages((prev) => [newImage, ...prev]);

        toast.closeAll();
        toast.show({
          title: "✅ อัปโหลดสำเร็จ",
          placement: "top",
          duration: 2000,
        });
      } catch (error: any) {
        console.error("❌ Upload failed:", error);
        toast.closeAll();
        toast.show({
          title: "❌ อัปโหลดล้มเหลว",
          description: error.message || "เกิดข้อผิดพลาด",
          placement: "top",
          duration: 3000,
        });
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleAddOutfit = async (fileUri: string) => {
    try {
      console.log("📤 Starting garment upload...");
      setLoading(true);
      const garmentName = "เสื้อใหม่_" + Date.now();

      const newGarment = await closetApi.uploadGarmentImage(fileUri, garmentName);
      setGarments((prev) => [newGarment, ...prev]);

      toast.closeAll();
      toast.show({
        title: "✅ เพิ่มเสื้อสำเร็จ",
        placement: "top",
        duration: 2000,
      });
    } catch (error: any) {
      console.error("❌ Exception in handleAddOutfit:", error);
      toast.closeAll();
      toast.show({
        title: "❌ เพิ่มเสื้อล้มเหลว",
        description: error.message,
        placement: "top",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBackground = async (fileUri: string) => {
    try {
      console.log("📤 [BACKGROUND] Starting upload...");
      setLoading(true);
      const bgName = `BG_${Date.now()}`;

      const newBackground = await closetApi.uploadVTONBackground(fileUri, bgName);
      setBackgrounds((prev) => [newBackground, ...prev]);

      toast.closeAll();
      toast.show({
        title: "✅ เพิ่มพื้นหลังสำเร็จ",
        placement: "top",
        duration: 2000,
      });
    } catch (error: any) {
      console.error("❌ [BACKGROUND] Failed:", error);
      toast.closeAll();
      toast.show({
        title: "❌ เพิ่มพื้นหลังล้มเหลว",
        description: error.message,
        placement: "top",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModel = async (imageId: string) => {
    try {
      await closetApi.deleteUserTryOnImage(imageId);
      setUserImages((prev) => prev.filter((img) => img.user_image_id !== imageId));
      if (selectedModel?.user_image_id === imageId) setSelectedModel(null);

      toast.closeAll();
      toast.show({
        title: "ลบสำเร็จ",
        placement: "top",
        duration: 2000,
      });
    } catch (error: any) {
      toast.closeAll();
      toast.show({
        title: "ลบล้มเหลว",
        description: error.message,
        placement: "top",
        duration: 3000,
      });
    }
  };

  const handleDeleteGarment = async (garmentId: string) => {
    try {
      await closetApi.deleteGarmentImage(garmentId);
      setGarments((prev) => prev.filter((g) => g.garment_id !== garmentId));
      if (selectedGarment?.garment_id === garmentId) setSelectedGarment(null);

      toast.closeAll();
      toast.show({
        title: "ลบสำเร็จ",
        placement: "top",
        duration: 2000,
      });
    } catch (error: any) {
      toast.closeAll();
      toast.show({
        title: "ลบล้มเหลว",
        description: error.message,
        placement: "top",
        duration: 3000,
      });
    }
  };

  const handleDeleteVariant = (variantId: string) => {
    Alert.alert("ยืนยันการลบ", "ฟีเจอร์นี้ยังไม่พร้อมใช้งาน", [{ text: "ตกลง" }]);
  };

  const handleDeleteProductGarment = async (variantId: string) => {
    try {
      await closetApi.deleteProductGarment(variantId);
      setProductGarments((prev) => prev.filter((v) => v.variant_id !== variantId));
      if (selectedProductGarment?.variant_id === variantId) setSelectedProductGarment(null);

      toast.closeAll();
      toast.show({
        title: "ลบสำเร็จ",
        placement: "top",
        duration: 2000,
      });
    } catch (error: any) {
      toast.closeAll();
      toast.show({
        title: "ลบล้มเหลว",
        description: error.message,
        placement: "top",
        duration: 3000,
      });
    }
  };

  const handleDeleteBackground = async (backgroundId: string) => {
    try {
      await closetApi.deleteVTONBackground(backgroundId);
      setBackgrounds((prev) => prev.filter((bg) => bg.background_id !== backgroundId));
      if (selectedBackground?.background_id === backgroundId) setSelectedBackground(null);

      toast.closeAll();
      toast.show({
        title: "ลบสำเร็จ",
        placement: "top",
        duration: 2000,
      });
    } catch (error: any) {
      toast.closeAll();
      toast.show({
        title: "ลบล้มเหลว",
        description: error.message,
        placement: "top",
        duration: 3000,
      });
    }
  };

  // ✅ ฟังก์ชันลบ VTON Session
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await closetApi.deleteVTONSession(sessionId);
      setVtonSessions((prev) => prev.filter((s) => s.session_id !== sessionId));

      toast.closeAll();
      toast.show({
        title: "ลบรูปผลลัพธ์สำเร็จ",
        placement: "top",
        duration: 2000,
      });
    } catch (error: any) {
      toast.closeAll();
      toast.show({
        title: "ลบล้มเหลว",
        description: error.message,
        placement: "top",
        duration: 3000,
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedModel) {
      Alert.alert("แจ้งเตือน", "กรุณาเลือกรูปโมเดลก่อน");
      return;
    }
    if (!selectedVariant && !selectedGarment && !selectedProductGarment) {
      Alert.alert("แจ้งเตือน", "กรุณาเลือกเสื้อผ้าก่อน");
      return;
    }

    try {
      setLoading(true);
      const request: CreateVTONSessionRequest = {
        user_image_id: selectedModel.user_image_id,
        background_id: selectedBackground?.background_id,
      };

      if (selectedVariant) {
        request.product_id = product?.product_id;
        request.variant_id = selectedVariant.variant_id;
      } else if (selectedGarment) {
        request.garment_id = selectedGarment.garment_id;
      } else if (selectedProductGarment) {
        request.product_id = selectedProductGarment.product_id;
        request.variant_id = selectedProductGarment.variant_id;
      }

      const session = await closetApi.createVTONSession(request);
      setResultImageUrl(session.result_image_url);

      // ✅ เพิ่ม session ใหม่เข้าไปในรายการ
      setVtonSessions((prev) => [session, ...prev]);

      toast.closeAll();
      toast.show({
        title: "✅ ลองชุดสำเร็จ!",
        description: "ผลลัพธ์พร้อมแล้ว",
        placement: "top",
        duration: 2000,
      });

      // ✅ พาไปหน้าแรก (ผลลัพธ์ AI)
      const nextIndex = 0;
      setCurrentTab(nextIndex);
      setRouteParams({ tab: mainTabIndexToId(nextIndex) });
    } catch (error: any) {
      toast.closeAll();
      toast.show({
        title: "❌ เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถสร้าง VTON session ได้",
        placement: "top",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartTryOn = () => {
    setCurrentTab(1);
    setRouteParams({ tab: "model" });
  };

  if (initialLoading) {
    return (
      <Center flex={1} bg="gray.50">
        <Spinner size="lg" color="violet.600" />
        <Text mt={4} color="gray.600">
          กำลังโหลดข้อมูล...
        </Text>
      </Center>
    );
  }

  return (
    <Box flex={1} bg="gray.50" safeArea>
      <StatusBar style="light" />

      <Box bg="violet.600" px={4} py={3}>
        <HStack alignItems="center" space={3}>
          <Button
            variant="ghost"
            onPress={handleBack}
            leftIcon={<Ionicons name="chevron-back" size={24} color="white" />}
            p={0}
          />
          <Text color="white" fontSize="lg" fontWeight="semibold">
            {tabs[currentTab]}
          </Text>
        </HStack>
      </Box>

      <Box bg="white" borderBottomWidth={1} borderBottomColor="gray.200">
        <HStack>
          {tabs.map((tab, index) => (
            <Pressable
              key={index}
              flex={1}
              py={3}
              onPress={() => {
                setCurrentTab(index);
                setRouteParams({ tab: mainTabIndexToId(index) });
              }}
              borderBottomWidth={index === currentTab ? 2 : 0}
              borderBottomColor="violet.600"
            >
              <Text
                textAlign="center"
                fontSize="sm"
                fontWeight="medium"
                color={index === currentTab ? "violet.600" : "gray.400"}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </HStack>
      </Box>

      <Box flex={1} p={4}>
        {/* ✅ TAB 0: ผลลัพธ์ AI */}
        {currentTab === 0 && (
          <ResultSelector 
            sessions={vtonSessions} 
            onStartTryOn={handleStartTryOn}
            onDeleteSession={handleDeleteSession}
          />
        )}

        {/* TAB 1: เลือกโมเดล */}
        {currentTab === 1 && (
          <Box flex={1}>
            <ModelSelector
              userImages={userImages}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              onAddModel={handleAddModel}
              onDeleteModel={handleDeleteModel}
            />
            {selectedModel && (
              <Button mt={6} bg="violet.600" onPress={handleNext} isLoading={loading}>
                ถัดไป
              </Button>
            )}
          </Box>
        )}

        {/* TAB 2: เลือกชุด */}
        {currentTab === 2 && (
          <Box flex={1}>
            <OutfitSelector
              product={product}
              garments={garments}
              productGarments={productGarments}
              selectedVariant={selectedVariant}
              selectedGarment={selectedGarment}
              selectedProductGarment={selectedProductGarment}
              outfitTabId={outfitTabIndexToId(outfitTabIndex)}
              onChangeOutfitTabId={(id) => {
                const idx = outfitTabIdToIndex(id);
                setOutfitTabIndex(idx);
                setRouteParams({ tab: "outfit", outfitTab: outfitTabIndexToId(idx) });
              }}
              onSelectVariant={(v) => {
                setSelectedVariant(v);
                setSelectedGarment(null);
                setSelectedProductGarment(null);
              }}
              onSelectGarment={(g) => {
                setSelectedGarment(g);
                setSelectedVariant(null);
                setSelectedProductGarment(null);
              }}
              onSelectProductGarment={(v) => {
                setSelectedProductGarment(v);
                setSelectedVariant(null);
                setSelectedGarment(null);
              }}
              onAddOutfit={handleAddOutfit}
              onDeleteVariant={handleDeleteVariant}
              onDeleteGarment={handleDeleteGarment}
              onDeleteProductGarment={(variantId) => handleDeleteProductGarment(variantId)}
            />

            <HStack space={2} mt={4}>
              <Button
                flex={1}
                variant="outline"
                onPress={() => {
                  setCurrentTab(1);
                  setRouteParams({ tab: "model" });
                }}
              >
                ย้อนกลับ
              </Button>
              <Button
                flex={1}
                bg="violet.600"
                onPress={() => {
                  setCurrentTab(3);
                  setRouteParams({ tab: "background" });
                }}
                isDisabled={!selectedVariant && !selectedGarment && !selectedProductGarment}
                isLoading={loading}
              >
                ถัดไป
              </Button>
            </HStack>
          </Box>
        )}

        {/* TAB 3: พื้นหลัง */}
        {currentTab === 3 && (
          <Box flex={1}>
            <BackgroundSelector
              backgrounds={backgrounds}
              selectedBackground={selectedBackground}
              onSelectBackground={setSelectedBackground}
              onAddBackground={handleAddBackground}
              onDeleteBackground={handleDeleteBackground}
            />
            <HStack space={2} mt={6}>
              <Button
                flex={1}
                variant="outline"
                onPress={() => {
                  setCurrentTab(2);
                  setRouteParams({ tab: "outfit" });
                }}
              >
                ย้อนกลับ
              </Button>
              <Button flex={1} bg="violet.600" onPress={handleSubmit} isLoading={loading}>
                ลองชุด
              </Button>
            </HStack>
          </Box>
        )}
      </Box>
    </Box>
  );
}