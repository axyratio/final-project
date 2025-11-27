import { appliedStore } from "@/api/store";
import { StoreForm } from "@/components/form";
import { AppBarNoCheck } from "@/components/navbar";
import { saveRole } from "@/utils/secure-store";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Box, Button, KeyboardAvoidingView, ScrollView, VStack } from "native-base";
import React, { useState } from "react";
import { Platform } from "react-native";

export default function CreateStoreForm() {
  const router = useRouter()

  const [store, setStore] = useState({ name: "", address: "" , description:"" });
  const [error, setError] = useState({ name: "", address: "" , description:"", message: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setStore(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    let hasError = false;
    const newError = { name: "", address: "" , description:"", message: "" };

    if (!store.name.trim()) {
      newError.name = "กรุณากรอกชื่อร้าน";
      hasError = true;
    }
    if (!store.address.trim()) {
      newError.address = "กรุณากรอกที่อยู่ร้าน";
      hasError = true;
    }

    setError(newError);

    if (!hasError){
       console.log("บันทึกสำเร็จ:", store);
       handleAppliedStore()
      //  router.replace("/(tabs)/profile") // นำออกไปก่อน ให้ handleAppliedStore จัดการ
    }
  };

const handleAppliedStore = async () => {
  try {
    const storeResponse = await appliedStore(store); // ✅ ต้อง await
    console.log("📦 Store response:", storeResponse);
    
    
    if (storeResponse.data.success === false) {
      // ✅ แสดง message จาก backend แบบไม่ throw
      setError((prev) => ({
        ...prev,
        description: storeResponse.data.message || "เกิดข้อผิดพลาด",
      }));
      return;
    }

    // เปิด onboarding link ของ Stripe
    if (storeResponse.data.onboarding_link) {
      await WebBrowser.openBrowserAsync(storeResponse.data.onboarding_link);
    }

    // บันทึก role ใหม่
    await saveRole(storeResponse.data.user_role);

    // หลังจากเปิด browser แล้ว ให้พากลับไปหน้าร้านค้า
    router.replace("/(store)/mystore");
  } catch (err: any) {
    console.error("❌ Unexpected error:", err);
    setError((prev) => ({
      ...prev,
      description: err.message || "ไม่สามารถสมัครร้านค้าได้",
    }));
  }
};


  return (
    <KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  style={{ flex: 1 }}
>
  <ScrollView
    contentContainerStyle={{ flexGrow: 1 }}
  >
    <Box flex={1}>
      <AppBarNoCheck title="สมัครเป็นร้านค้า" />
      <VStack
        p={4}
        justifyContent="space-between"
        flex={1}
        height="100%"
      >
        <VStack>
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
        </VStack>

        <Button onPress={handleSubmit}>บันทึก</Button>
      </VStack>
    </Box>
  </ScrollView>
</KeyboardAvoidingView>

  );
};
