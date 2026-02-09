import { FormProfile } from "@/components/form";
import { AppBar } from "@/components/navbar";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import axios from "axios";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";

type Password = {
  password: string;
  new_password: string;
  confirm_password: string;
};

type PasswordError = {
  password?: string;
  new_password?: string;
  confirm_password?: string;
};

export default function PasswordScreen() {
  const [password, setPassword] = useState<Password>({
    password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordError, setPasswordError] = useState<PasswordError>({});

  const handleChange = (key: keyof Password) => (value: string) => {
    setPassword((prev) => ({ ...prev, [key]: value }));
    // เคลียร์ error ของ field ที่แก้ไขแล้ว
    setPasswordError((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (password: Password) => {
    // ตรวจสอบ confirm password ก่อน
    if (password.new_password !== password.confirm_password) {
      setPasswordError((prev) => ({
        ...prev,
        confirm_password: "รหัสผ่านไม่ตรงกัน",
      }));
      return;
    }

    try {
      const token = await getToken();
      const res = await axios.patch(
        `${DOMAIN}/profile/password-change`,
        {
          old_password: password.password,
          new_password: password.new_password,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      console.log("Response:", res.data);

      // ✅ กรณีสำเร็จ
      if (res.data.success) {
        Alert.alert("สำเร็จ", "เปลี่ยนรหัสผ่านสำเร็จ", [
          {
            text: "ตกลง",
            onPress: () => router.back(),
          },
        ]);
      } else {
        // ❌ กรณี error จาก backend
        if (res.data.password) {
          setPasswordError({ password: res.data.password });
        } else {
          Alert.alert("ข้อผิดพลาด", res.data.message || "เกิดข้อผิดพลาด");
        }
      }
    } catch (err: any) {
      console.error("Error:", err);

      // จัดการ error
      if (err.response?.data?.password) {
        setPasswordError({ password: err.response.data.password });
      } else if (err.response?.data?.message) {
        Alert.alert("ข้อผิดพลาด", err.response.data.message);
      } else {
        Alert.alert("ข้อผิดพลาด", "ไม่สามารถเปลี่ยนรหัสผ่านได้");
      }
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppBar
        title="เปลี่ยนรหัสผ่าน"
        onSave={async () => {
          await handleSubmit(password);
        }}
      />

      <View style={{ padding: 16 }}>
        <FormProfile
          value={password.password}
          title="รหัสผ่านเดิม"
          onChange={handleChange("password")}
        />

        <FormProfile
          value={password.new_password}
          title="รหัสผ่านใหม่"
          onChange={handleChange("new_password")}
        />

        <FormProfile
          value={password.confirm_password}
          title="ยืนยันรหัสผ่านใหม่"
          onChange={handleChange("confirm_password")}
        />

        {/* แสดง error */}
        {(passwordError.password ||
          passwordError.new_password ||
          passwordError.confirm_password) && (
          <Text
            style={{
              color: "red",
              fontSize: 12,
              marginTop: 8,
              textAlign: "right",
            }}
          >
            {passwordError.password ||
              passwordError.new_password ||
              passwordError.confirm_password}
          </Text>
        )}
      </View>
    </View>
  );
}
