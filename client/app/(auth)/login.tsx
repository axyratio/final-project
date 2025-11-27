import { getToken, saveRole, saveToken } from "@/utils/secure-store";
import { useRouter } from "expo-router";
import { Box, Button, Text } from "native-base";
import { useEffect, useState } from "react";
import { Text as RNText, TextInput, TouchableOpacity, View } from "react-native";

import { DOMAIN } from "@/้host";

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({ identity: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ identity: "", password: "", message: "" });

  const { identity, password } = formData;
  const setField = (field: string, value: string) => setFormData({ ...formData, [field]: value });

  // -------------------
  // useEffect ตรวจ token
  // -------------------
  useEffect(() => {
    const checkToken = async () => {
      const token = await getToken()
      console.log(token, "Token check and router replace /me")
      if (token) {
        router.replace("/me"); // redirect ถ้ามี token อยู่แล้ว
      }
    };
    checkToken();
  }, []);

  const handleError = () => {
    const newError = { identity: "", password: "", message: "" };
    if (!identity) newError.identity = "กรุณากรอกชื่อผู้ใช้หรืออีเมล";
    if (!password) newError.password = "กรุณากรอกรหัสผ่าน";
    setError(newError);
    return Object.values(newError).some((v) => v !== "");
  };

  const handleLogin = async () => {
    if (handleError()) return;

    try {
      setLoading(true);
      setError({ identity: "", password: "", message: "" });

      const res = await fetch(`${DOMAIN}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError({ identity: "", password: "", message: errData.message || "ผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
        return;
      }

      const data = await res.json();
      await saveToken(data.access_token); // save token
      await saveRole(data.user_role);

      router.replace("/(tabs)"); // redirect หลัง login สำเร็จ
    } catch (err: any) {
    console.log(err, "err")
      let errorData = null;

      // axios error
      if (err.response?.data) {
        errorData = err.response.data;
      }
      // fetch หรืออื่น ๆ (ถ้า err เป็น string json)
      else if (err.message && err.message.startsWith("{")) {
        try {
          errorData = JSON.parse(err.message);
        } catch {
          errorData = null;
        }
      }

      const passwordError = errorData?.detail?.find((e: any) => e.loc.includes("password"))?.msg || "";

      setError(prev => ({
        ...prev,
        password: passwordError,
      }));
      console.log(error, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box flex={1} justifyContent="space-between" flexDirection="column" padding={4} paddingTop={12}>
      <Box style={{ flex: 1, width: "100%", alignItems: "center", gap: 30 }}>
        <RNText style={{ fontSize: 32 }}>ClosetX</RNText>
        <Box style={{ gap: 2 }}>
          <RNText style={{ fontSize: 24 }}>เข้าสู่ระบบ</RNText>
        </Box>

        <Box style={{ gap: 10, width: "100%" }}>
          {error.message !== "" && <Text style={{ color: "red", fontSize: 12, marginBottom: 5 }}>{error.message}</Text>}

          <TextInput
            placeholder="ชื่อผู้ใช้ หรือ อีเมล"
            value={identity}
            onChangeText={(text) => setField("identity", text)}
            style={{ borderWidth: 1,  padding: 10, marginTop: 5, borderRadius: 5 }}
          />
          {error.identity !== "" && <Text style={{ color: "red", fontSize: 10 }}>{error.identity}</Text>}

          <TextInput
            placeholder="รหัสผ่าน"
            secureTextEntry
            value={password}
            onChangeText={(text) => setField("password", text)}
            style={{ borderWidth: 1, padding: 10, marginTop: 5, borderRadius: 5 }}
          />
          {error.password !== "" && <Text style={{ color: "red", fontSize: 10 }}>{error.password}</Text>}
        </Box>
      </Box>

      <View style={{ width: "100%" }}>
        <Box display="flex" justifyContent="flex-end" alignItems="flex-end">
          <TouchableOpacity onPress={() => router.replace("/(auth)/register")}>
            <Text color="blue.500">หากไม่มีบัญชี</Text>
          </TouchableOpacity>
        </Box>
        <Button py={3} onPress={handleLogin} color="#8b0ff8" isLoading={loading}>
          <Text fontSize={16} color="white">
            เข้าสู่ระบบ
          </Text>
        </Button>
      </View>
    </Box>
  );
}
