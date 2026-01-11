// app/address/new.tsx
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Box, Button, Switch, Text } from "native-base";
import { useRouter } from "expo-router";

import { AppBarNoCheck } from "@/components/navbar";
import { createAddress, ShippingAddressPayload } from "@/api/address";
import { useAddressStore } from "@/components/address/address-store";

const AddressNewScreen: React.FC = () => {
  const router = useRouter();
  const { fetchAll } = useAddressStore();

  const [form, setForm] = useState<ShippingAddressPayload>({
    full_name: "",
    phone_number: "",
    address_line: "",
    sub_district: "",
    district: "",
    province: "",
    postal_code: "",
    is_default: false,
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (
    key: keyof ShippingAddressPayload,
    value: string | boolean
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    if (!form.full_name || !form.phone_number || !form.address_line) {
      alert("กรุณากรอกชื่อ, เบอร์โทร และที่อยู่หลัก");
      return;
    }

    setSaving(true);
    try {
      await createAddress(form);
      await fetchAll();
      router.back();
    } catch (e: any) {
      console.log("create address error:", e);
      alert(e?.message || "ไม่สามารถสร้างที่อยู่ได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box flex={1} bg="coolGray.50">
      <AppBarNoCheck title="เพิ่มที่อยู่ใหม่" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0} // ปรับ offset ตามความสูง AppBar
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ชื่อผู้รับ */}
          <View style={{ marginBottom: 16 }}>
            <Text fontSize="xs" color="coolGray.700" marginBottom={4}>
              ชื่อผู้รับ
            </Text>
            <TextInput
              value={form.full_name}
              onChangeText={(text) => handleChange("full_name", text)}
              placeholder="ชื่อ-นามสกุล"
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: "white",
              }}
            />
          </View>

          {/* เบอร์โทร */}
          <View style={{ marginBottom: 16 }}>
            <Text fontSize="xs" color="coolGray.700" marginBottom={4}>
              เบอร์โทรศัพท์
            </Text>
            <TextInput
              value={form.phone_number}
              onChangeText={(text) => handleChange("phone_number", text)}
              placeholder="เช่น 0812345678"
              keyboardType="phone-pad"
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: "white",
              }}
            />
          </View>

          {/* ที่อยู่หลัก */}
          <View style={{ marginBottom: 16 }}>
            <Text fontSize="xs" color="coolGray.700" marginBottom={4}>
              ที่อยู่
            </Text>
            <TextInput
              value={form.address_line}
              onChangeText={(text) => handleChange("address_line", text)}
              placeholder="บ้านเลขที่, หมู่บ้าน, ถนน ฯลฯ"
              multiline
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: "white",
                textAlignVertical: "top",
                minHeight: 80,
              }}
            />
          </View>

          {/* ตำบล / แขวง */}
          <View style={{ marginBottom: 16 }}>
            <Text fontSize="xs" color="coolGray.700" marginBottom={4}>
              ตำบล / แขวง
            </Text>
            <TextInput
              value={form.sub_district ?? ""}
              onChangeText={(text) => handleChange("sub_district", text)}
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: "white",
              }}
            />
          </View>

          {/* อำเภอ / เขต */}
          <View style={{ marginBottom: 16 }}>
            <Text fontSize="xs" color="coolGray.700" marginBottom={4}>
              อำเภอ / เขต
            </Text>
            <TextInput
              value={form.district ?? ""}
              onChangeText={(text) => handleChange("district", text)}
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: "white",
              }}
            />
          </View>

          {/* จังหวัด */}
          <View style={{ marginBottom: 16 }}>
            <Text fontSize="xs" color="coolGray.700" marginBottom={4}>
              จังหวัด
            </Text>
            <TextInput
              value={form.province ?? ""}
              onChangeText={(text) => handleChange("province", text)}
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: "white",
              }}
            />
          </View>

          {/* รหัสไปรษณีย์ */}
          <View style={{ marginBottom: 16 }}>
            <Text fontSize="xs" color="coolGray.700" marginBottom={4}>
              รหัสไปรษณีย์
            </Text>
            <TextInput
              value={form.postal_code ?? ""}
              onChangeText={(text) => handleChange("postal_code", text)}
              keyboardType="number-pad"
              style={{
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: "white",
              }}
            />
          </View>

          {/* default address toggle */}
          <View
            style={{
              marginTop: 8,
              marginBottom: 32,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text fontSize="xs" color="coolGray.700" style={{ flex: 1, marginRight: 8 }}>
              ใช้เป็นที่อยู่ค่าเริ่มต้นสำหรับการสั่งซื้อครั้งต่อไป
            </Text>
            <Switch
              isChecked={!!form.is_default}
              onToggle={(val) => handleChange("is_default", val)}
              offTrackColor="coolGray.300"
              onTrackColor="violet.500"
            />
          </View>
        </ScrollView>

        {/* ปุ่มล่างให้ลอยเหนือคีย์บอร์ดได้ด้วย keyboardVerticalOffset + paddingBottom ด้านบน */}
        <Box px={4} pb={6}>
          <Button
            onPress={handleSave}
            isLoading={saving}
            borderRadius="full"
          >
            บันทึกที่อยู่
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </Box>
  );
};

export default AddressNewScreen;
