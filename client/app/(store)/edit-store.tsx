// app/(store)/edit-store.tsx
import { updateStore } from "@/api/store";
import { Avartar } from "@/components/avartar";
import { AppBar } from "@/components/navbar";
import { EditPressable } from "@/components/pressable";
import { DOMAIN } from "@/้host";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Center, HStack, Spinner, VStack } from "native-base";
import React, { useEffect, useState } from "react";
import { Alert, BackHandler } from "react-native";

type StoreData = {
  id: string;
  name: string;
  logoUrl?: string;
};

export default function EditStoreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    storeId: string;
    storeName: string;
    logoUrl?: string;
    // params ที่อาจถูกส่งกลับมาจากการแก้ไขในหน้า 'edit'
    updatedField?: string;
    updatedValue?: string;
  }>();

  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    if (params.storeId && params.storeName) {
      let finalLogoUrl = params.logoUrl;
      if (finalLogoUrl && !finalLogoUrl.startsWith('http')) {
        finalLogoUrl = `${DOMAIN}${finalLogoUrl}`;
      }
      setStore({
        id: params.storeId,
        name: params.storeName,
        logoUrl: finalLogoUrl,
      });
    }
    setLoading(false);
  }, [params.storeId]);

  // เมื่อกลับมาจากการแก้ไขที่หน้า generic edit
  useEffect(() => {
    if (params.updatedField === "name" && params.updatedValue) {
      setStore((prev) => (prev ? { ...prev, name: params.updatedValue! } : null));
    }
  }, [params.updatedField, params.updatedValue]);

  // Handle back press to always go to mystore
  useEffect(() => {
    const backAction = () => {
      router.back();
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [router]);


  const handleSave = async () => {
    if (!store) return;
    console.log(store.name, "store name")
    try {
      setLoading(true);
      const response = await updateStore(store.id, { name: store.name });

      if (response.success) {
        Alert.alert("สำเร็จ", "อัปเดตข้อมูลร้านค้าเรียบร้อย", [
          { text: "ตกลง", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("เกิดข้อผิดพลาด", response.message || "ไม่สามารถอัปเดตข้อมูลได้");
      }
    } catch (error: any) {
      Alert.alert("เกิดข้อผิดพลาด", error.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !store) {
    return (
      <Center flex={1}>
        <Spinner size="lg" />
      </Center>
    );
  }

  return (
    <VStack flex={1} bg="#f0f0f0" style={{ gap: 8 }}>
      <AppBar
        title="แก้ไขข้อมูลร้านค้า"
        onSave={handleSave}
        // onBackPress={() => router.replace("/(store)/mystore")}
      />

      <HStack justifyContent={"center"}>
        <Avartar name={store.name} imageUrl={store.logoUrl} size={200} />
      </HStack>

      <VStack>
        <EditPressable
          title="ชื่อร้านค้า"
          value={store.name}
          onPress={() =>
            router.push({
              pathname: "/(profile)/edit", // ไปยังหน้าแก้ไข generic
              params: {
                key: "name",
                value: store.name,
                title: "แก้ไขชื่อร้านค้า",
                // ระบุหน้าที่จะให้กลับมา พร้อม params ที่จำเป็น
                returnPath: "/(store)/edit-store",
                returnParams: JSON.stringify({
                  storeId: store.id,
                  storeName: store.name, // ส่งชื่อเดิมไปก่อน
                  logoUrl: store.logoUrl,
                }),
              },
            })
          }
        />
      </VStack>
    </VStack>
  );
}
