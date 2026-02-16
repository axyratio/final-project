import { appliedStore } from "@/api/store";
import { StoreForm } from "@/components/form";
import { AppBarNoCheck } from "@/components/navbar";
import { saveRole } from "@/utils/secure-store";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Box, Button, KeyboardAvoidingView, ScrollView, VStack, Text } from "native-base";
import React, { useState, useEffect } from "react";
import { Platform } from "react-native";

export default function CreateStoreForm() {
  const router = useRouter();

  const [store, setStore] = useState({ name: "", address: "", description: "" });
  const [error, setError] = useState({ name: "", address: "", description: "", message: "" });
  const [loading, setLoading] = useState(false);

  // ✅ เพิ่ม: ฟัง deep link จาก Stripe
  useEffect(() => {
    // สำหรับ Expo Go หรือ Development
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // เช็คว่ามี URL ตอนเปิด app หรือไม่
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = ({ url }: { url: string }) => {
    console.log('📱 Deep link received:', url);
    
    // ตรวจสอบว่าเป็น URL จาก Stripe onboarding หรือไม่
    if (url.includes('/store/connect/success') || 
        url.includes('/store/connect/success')) {
      console.log('✅ Stripe onboarding completed, navigating to success page');
      router.replace("/(store)/onboarding-success");
    }
  };

  const handleChange = (field: string, value: string) => {
    setStore(prev => ({ ...prev, [field]: value }));
    setError(prev => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = () => {
    let hasError = false;
    const newError = { name: "", address: "", description: "", message: "" };

    if (!store.name.trim()) {
      newError.name = "กรุณากรอกชื่อร้าน";
      hasError = true;
    }
    if (!store.address.trim()) {
      newError.address = "กรุณากรอกที่อยู่ร้าน";
      hasError = true;
    }

    setError(newError);

    if (!hasError) {
      console.log("บันทึกสำเร็จ:", store);
      handleAppliedStore();
    }
  };

  const handleAppliedStore = async () => {
    try {
      setLoading(true);
      
      const storeResponse = await appliedStore(store);
      console.log("📦 Store response:", storeResponse);

      if (storeResponse.data.success === false) {
        setError((prev) => ({
          ...prev,
          message: storeResponse.data.message || "เกิดข้อผิดพลาด",
        }));
        return;
      }

      // บันทึก role ใหม่ก่อน
      await saveRole(storeResponse.data.user_role);

      // ✅ วิธีที่ 1: ใช้ Deep Link
      // Backend ต้องตั้งค่า return_url เป็น:
      // exp://localhost:8081/--/store/onboarding-success (Expo Go)
      // หรือ myapp://store/onboarding-success (Standalone app)
      
      if (storeResponse.data.onboarding_link) {
        console.log("🔗 Opening Stripe onboarding with deep link support...");
        
        // เปิด browser
        await WebBrowser.openBrowserAsync(
          storeResponse.data.onboarding_link,
          {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
            toolbarColor: "#8b0ff8",
            controlsColor: "#ffffff",
          }
        );

        // ⚠️ โค้ดด้านล่างนี้จะทำงานทันทีหลัง browser เปิด
        // ไม่ใช่หลัง user ทำ onboarding เสร็จ
        // การ navigate ที่แท้จริงจะเกิดใน handleDeepLink() ด้านบน
        
        console.log("📱 Browser opened, waiting for deep link callback...");
        
      } else {
        console.log("⚠️ No onboarding link");
        router.replace("/(store)/onboarding-success");
      }
      
    } catch (err: any) {
      console.error("❌ Unexpected error:", err);
      setError((prev) => ({
        ...prev,
        message: err.message || "ไม่สามารถสมัครร้านค้าได้",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Box flex={1} bg="white">
          <AppBarNoCheck title="สมัครเป็นร้านค้า" />
          
          <VStack p={4} justifyContent="space-between" flex={1} space={4}>
            <VStack space={4}>
              {error.message !== "" && (
                <Box bg="red.100" p={3} borderRadius={8}>
                  <Text color="red.600" fontSize={14}>
                    {error.message}
                  </Text>
                </Box>
              )}

              <StoreForm
                title="ชื่อร้าน"
                value={store.name}
                mark
                error={error.name}
                onChange={(text) => handleChange("name", text)}
              />

              <StoreForm
                title="ที่อยู่ร้าน"
                value={store.address}
                mark
                error={error.address}
                onChange={(text) => handleChange("address", text)}
              />

              <StoreForm
                title="คำอธิบายร้าน"
                value={store.description}
                error={error.description}
                onChange={(text) => handleChange("description", text)}
              />

              <Box bg="purple.50" p={3} borderRadius={8} borderWidth={1} borderColor="purple.200">
                <Text fontSize={12} color="purple.700" fontWeight="medium" mb={1}>
                  ℹ️ ข้อมูลสำคัญ
                </Text>
                <Text fontSize={11} color="purple.600">
                  • หลังจากกดบันทึก คุณจะถูกนำไปยังหน้า Stripe เพื่อลงทะเบียนบัญชี{"\n"}
                  • กรุณาเตรียมข้อมูลธนาคารและเอกสารประจำตัวให้พร้อม{"\n"}
                  • การสมัครร้านค้าไม่มีค่าใช้จ่าย{"\n"}
                  • หลังทำเสร็จให้กดปุ่ม "Done" ใน Stripe แล้วระบบจะพาคุณกลับมา
                </Text>
              </Box>
            </VStack>

            <Button
              py={3}
              bg="#8b0ff8"
              _pressed={{ bg: "#7209d4" }}
              _disabled={{ bg: "gray.400" }}
              isLoading={loading}
              isDisabled={loading}
              onPress={handleSubmit}
            >
              <Text fontSize={16} color="white" fontWeight="medium">
                {loading ? "กำลังดำเนินการ..." : "บันทึก"}
              </Text>
            </Button>
          </VStack>
        </Box>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}