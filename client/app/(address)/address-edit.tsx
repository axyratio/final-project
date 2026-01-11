// app/address/edit.tsx
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Box, Button, ScrollView, Switch, Text, VStack } from "native-base";
import { useLocalSearchParams, useRouter } from "expo-router";

import { AppBarNoCheck } from "@/components/navbar";
import {
  ShippingAddressPayload,
  updateAddress,
} from "@/api/address";
import { useAddressStore } from "@/components/address/address-store";

const AddressEditScreen: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { addresses, fetchAll } = useAddressStore();

  const [form, setForm] = useState<ShippingAddressPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // โหลด addresses จาก store เผื่อเปิดหน้าตรงนี้โดยตรง
  useEffect(() => {
    fetchAll();
  }, []);

  // map address -> form
  useEffect(() => {
    if (!id) return;

    const addr = addresses.find((a) => a.ship_addr_id === id);
    if (addr) {
      setForm({
        full_name: addr.full_name,
        phone_number: addr.phone_number,
        address_line: addr.address_line,
        sub_district: addr.sub_district ?? "",
        district: addr.district ?? "",
        province: addr.province ?? "",
        postal_code: addr.postal_code ?? "",
        is_default: !!addr.is_default,
      });
      setLoading(false);
    }
  }, [addresses, id]);

  const handleChange = (
    key: keyof ShippingAddressPayload,
    value: string | boolean
  ) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            [key]: value,
          }
        : prev
    );
  };

  const handleSave = async () => {
    if (!form || !id) return;

    if (!form.full_name || !form.phone_number || !form.address_line) {
      alert("กรุณากรอกชื่อ, เบอร์โทร และที่อยู่หลัก");
      return;
    }

    setSaving(true);
    try {
      await updateAddress(id as string, form);
      await fetchAll();
      router.back();
    } catch (e: any) {
      console.log("update address error:", e);
      alert(e?.message || "ไม่สามารถแก้ไขที่อยู่ได้");
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center">
        <Text>ไม่พบรหัสที่อยู่</Text>
      </Box>
    );
  }

  if (loading || !form) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center">
        <ActivityIndicator />
        <Text mt={2}>กำลังโหลดข้อมูลที่อยู่...</Text>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="coolGray.50">
      <AppBarNoCheck title="แก้ไขที่อยู่" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          flex={1}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        >
          <VStack space={4}>
            {/* ชื่อผู้รับ */}
            <Box>
              <Text mb={1} fontSize="xs" color="coolGray.700">
                ชื่อผู้รับ *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="ชื่อ-นามสกุล"
                value={form.full_name}
                onChangeText={(text) => handleChange("full_name", text)}
              />
            </Box>

            {/* เบอร์โทร */}
            <Box>
              <Text mb={1} fontSize="xs" color="coolGray.700">
                เบอร์โทรศัพท์ *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="เช่น 0812345678"
                keyboardType="phone-pad"
                value={form.phone_number}
                onChangeText={(text) => handleChange("phone_number", text)}
              />
            </Box>

            {/* ที่อยู่ */}
            <Box>
              <Text mb={1} fontSize="xs" color="coolGray.700">
                ที่อยู่ *
              </Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                placeholder="บ้านเลขที่, หมู่บ้าน, ถนน ฯลฯ"
                multiline
                value={form.address_line}
                onChangeText={(text) => handleChange("address_line", text)}
              />
            </Box>

            {/* ตำบล */}
            <Box>
              <Text mb={1} fontSize="xs" color="coolGray.700">
                ตำบล / แขวง
              </Text>
              <TextInput
                style={styles.input}
                value={form.sub_district ?? ""}
                onChangeText={(text) => handleChange("sub_district", text)}
              />
            </Box>

            {/* อำเภอ */}
            <Box>
              <Text mb={1} fontSize="xs" color="coolGray.700">
                อำเภอ / เขต
              </Text>
              <TextInput
                style={styles.input}
                value={form.district ?? ""}
                onChangeText={(text) => handleChange("district", text)}
              />
            </Box>

            {/* จังหวัด */}
            <Box>
              <Text mb={1} fontSize="xs" color="coolGray.700">
                จังหวัด
              </Text>
              <TextInput
                style={styles.input}
                value={form.province ?? ""}
                onChangeText={(text) => handleChange("province", text)}
              />
            </Box>

            {/* รหัสไปรษณีย์ */}
            <Box>
              <Text mb={1} fontSize="xs" color="coolGray.700">
                รหัสไปรษณีย์
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={form.postal_code ?? ""}
                onChangeText={(text) => handleChange("postal_code", text)}
              />
            </Box>

            {/* default switch */}
            <Box mt={2}>
              <Text mb={1} fontSize="xs" color="coolGray.700">
                ตั้งเป็นที่อยู่เริ่มต้น
              </Text>
              <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                mt={1}
              >
                <Text fontSize="xs" color="coolGray.700" flex={1} mr={3}>
                  ใช้เป็นที่อยู่ค่าเริ่มต้นสำหรับการสั่งซื้อครั้งต่อไป
                </Text>
                <Switch
                  isChecked={!!form.is_default}
                  onToggle={(val) => handleChange("is_default", val)}
                  offTrackColor="coolGray.300"
                  onTrackColor="violet.500"
                />
              </Box>
            </Box>
          </VStack>
        </ScrollView>

        <Box px={4} pb={6}>
          <Button onPress={handleSave} isLoading={saving} borderRadius="full">
            บันทึกการเปลี่ยนแปลง
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </Box>
  );
};

export default AddressEditScreen;

const styles = StyleSheet.create({
  input: {
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    fontSize: 14,
  },
  multiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },
});
