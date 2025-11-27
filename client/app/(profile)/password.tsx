import { FormProfile } from "@/components/form";
import { AppBar } from "@/components/navbar";
import { getToken } from "@/utils/secure-store";
import { ADDRESS_IP, DOMAIN, PORT } from "@/้host";
import axios from "axios";
import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

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
  const [passwordOld, setPasswordOld] = useState<string>("");

  const handleChange = (key: keyof Password) => (value: string) => {
    setPassword((prev) => ({ ...prev, [key]: value }));
    // เคลียร์ error ของ field ที่แก้ไขแล้ว
    setPasswordError((prev) => ({ ...prev, [key]: undefined }));
  };

  // จัดการ error จาก FastAPI dynamic
  const handleServerErrors = (errors: any[]) => {
    const newErrors: PasswordError = {};
    errors.forEach((item) => {
      const field = item.loc?.[1]; // ดึงชื่อ field
      if (field) {
        newErrors[field as keyof PasswordError] = item.msg;
      }
    });
    setPasswordError(newErrors);
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
        }
      );

      console.log("Saved:", res.data);

      // สมมติ server ส่ง success = true
      if (res.data.success) {
        console.log("แก้ไขรหัสผ่านสําเร็จ");
        router.replace("/me");
      } else {
        // กรณี server ส่ง validation errors
        console.log("hello")
        setPasswordOld(res.data.password);
        console.log(passwordOld, "passwordOld")
      }
    } catch (err: any) {
      if (err.response?.data?.detail) {
        // จัดการ 422 validation errors ของ FastAPI
        handleServerErrors(err.response.data.detail);
      } else {
        console.log("Error:", err.message);
      }
    }
  };

  return (
    <>
      <AppBar
        title="แก้ไขรหัสผ่าน"
        onSave={async () => {
          await handleSubmit(password);
        }}
      />
      <FormProfile
        value={password.password}
        title="รหัสผ่าน"
        onChange={handleChange("password")}
      />

      <FormProfile
        value={password.new_password}
        title="รหัสผ่านใหม่"
        onChange={handleChange("new_password")}
      />

      <FormProfile
        value={password.confirm_password}
        title="ยืนยันรหัสผ่าน"
        onChange={handleChange("confirm_password")}
      />
      <Text style={{ color: "red", fontSize: 12, marginHorizontal: 15, textAlign: "right" }}>{passwordError.password || passwordError.new_password || passwordError.confirm_password || passwordOld}</Text>
    </>
  );
}
