import { DOMAIN } from "@/้host";
import { useRouter } from "expo-router";
import { Box, Button, HStack, Text } from "native-base";
import { useState } from "react";
import {
  Text as RNText,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    first_name: "",
    last_name: "",
    phone_number: "",
  });

  const { username, password, email, first_name, last_name, phone_number } =
    formData;

  const setField = (field: string, value: string) => {
    console.log(`[Register] Setting field: ${field} = ${value}`);
    setFormData({ ...formData, [field]: value });
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({
    username: "",
    password: "",
    email: "",
    first_name: "",
    last_name: "",
    phone_number: "",
  });

  // ✅ ตรวจสอบ error ทีเดียว
  const handleError = () => {
    let newError = {
      username: "",
      password: "",
      email: "",
      first_name: "",
      last_name: "",
      phone_number: "",
    };

    if (email === "") newError.email = "กรุณากรอกอีเมล";
    if (password === "") newError.password = "กรุณากรอกรหัสผ่าน";
    if (first_name === "") newError.first_name = "กรุณากรอกชื่อ";
    if (last_name === "") newError.last_name = "กรุณากรอกนามสกุล";
    if (phone_number === "") newError.phone_number = "กรุณากรอกเบอร์โทรศัพท์";
    if (username === "") newError.username = "กรุณากรอกชื่อผู้ใช้";

    console.log("[Register] Validation Errors:", newError);

    setError(newError);

    // ถ้าเจอ error return true
    return Object.values(newError).some((v) => v !== "");
  };

  const handleRegister = async () => {
    console.log("[Register] handleRegister called.");
    const hasError = handleError();
    if (hasError) return; // ✅ หยุดตรงนี้เลย

    try {
      setLoading(true);
      console.log("[Register] Sending data to backend:", formData);

      const res = await fetch(`${DOMAIN}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        console.log(`[Register] API Error: Status ${res.status}`);
        const errorMessage = await res.text();
        const errorData = JSON.parse(errorMessage);
        console.log("[Register] Parsed error data:", errorData);

        // ตรวจสอบว่า error มาในรูปแบบ {"errors": {...}} หรือไม่
        // ถ้าใช่ ให้ใช้ object ที่ซ้อนอยู่ข้างใน, ถ้าไม่ใช่ ให้ใช้ object หลัก
        const fieldErrors = errorData.errors || errorData;

        setError({
          username: fieldErrors.username || "",
          password: fieldErrors.password || "",
          email: fieldErrors.email || "",
          first_name: fieldErrors.first_name || "",
          last_name: fieldErrors.last_name || "",
          phone_number: fieldErrors.phone_number || "",
        });

        // ไม่ throw error แต่ return เพื่อหยุดการทำงาน
        return;
      }

      const data = await res.json();
      console.log("[Register] Registration successful:", data);

      // ✅ ล้าง error หลัง success
      setError({
        username: "",
        password: "",
        email: "",
        first_name: "",
        last_name: "",
        phone_number: "",
      });
      console.log("[Register] Navigating to /login");
      router.push("/login");
    } catch (err: any) {
      console.error("[Register] Catch block error:", err);
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

      const passwordError =
        errorData?.detail?.find((e: any) => e.loc.includes("password"))?.msg ||
        "";
      const emailError =
        errorData?.detail?.find((e: any) => e.loc.includes("email"))?.msg || "";

      setError((prev) => ({
        ...prev,
        password: passwordError,
        email: emailError,
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      flex={1}
      justifyContent="space-between"
      flexDirection={"column"}
      padding={4}
      paddingTop={12}
    >
      <Box style={{ flex: 1, width: "100%", alignItems: "center", gap: 30 }}>
        <RNText style={{ fontSize: 32 }}>ClosetX</RNText>
        <Box style={{ gap: 2 }}>
          <Text style={{ fontSize: 24 }}>สมัครเข้าใช้งาน</Text>
        </Box>
        <Box style={{ gap: 10 }} width={"100%"}>
          <Box>
            <RNText style={{ marginBottom: 10 }}>ข้อมูลการสมัคร</RNText>

            <TextInput
              placeholder="Username"
              value={formData.username}
              onChangeText={(text) => setField("username", text)}
              style={{
                borderWidth: 1,
                padding: 10,
                marginTop: 5,
                borderRadius: 5,
              }}
            />
            {error.username !== "" && (
              <Text style={{ color: "red", fontSize: 10 }}>
                {error.username}
              </Text>
            )}

            <TextInput
              placeholder="Email"
              value={formData.email}
              onChangeText={(text) => setField("email", text)}
              style={{
                borderWidth: 1,
                padding: 10,
                marginTop: 5,
                borderRadius: 5,
              }}
            />
            {error.email !== "" && (
              <Text style={{ color: "red", fontSize: 10 }}>{error.email}</Text>
            )}

            <TextInput
              placeholder="Password"
              secureTextEntry
              value={formData.password}
              onChangeText={(text) => setField("password", text)}
              style={{
                borderWidth: 1,
                padding: 10,
                marginTop: 5,
                borderRadius: 5,
              }}
            />
            {error.password !== "" && (
              <Text style={{ color: "red", fontSize: 10 }}>
                {error.password}
              </Text>
            )}
          </Box>

          <Box>
            <RNText style={{ marginTop: 10 }}>ข้อมูลส่วนตัว</RNText>
            <HStack width={"100%"} style={{ gap: 5 }}>
              <TextInput
                placeholder="Firstname"
                value={formData.first_name}
                onChangeText={(text) => setField("first_name", text)}
                style={{
                  borderWidth: 1,
                  padding: 10,
                  marginTop: 5,
                  borderRadius: 5,
                  flex: 1,
                }}
              />
              <TextInput
                placeholder="Lastname"
                value={formData.last_name}
                onChangeText={(text) => setField("last_name", text)}
                style={{
                  borderWidth: 1,
                  padding: 10,
                  marginTop: 5,
                  borderRadius: 5,
                  flex: 1,
                }}
              />
            </HStack>
            {error.first_name !== "" && (
              <Text style={{ color: "red", fontSize: 10 }}>
                {error.first_name}
              </Text>
            )}
            {error.last_name !== "" && (
              <Text style={{ color: "red", fontSize: 10 }}>
                {error.last_name}
              </Text>
            )}

            <TextInput
              placeholder="Phone"
              value={formData.phone_number}
              onChangeText={(text) => setField("phone_number", text)}
              style={{
                borderWidth: 1,
                padding: 10,
                marginTop: 5,
                borderRadius: 5,
              }}
            />
            {error.phone_number !== "" && (
              <Text style={{ color: "red", fontSize: 10 }}>
                {error.phone_number}
              </Text>
            )}
          </Box>
        </Box>
      </Box>

      <View style={{ width: "100%" }}>
        <Box display="flex" justifyContent="flex-end" alignItems="flex-end">
          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text color="blue.500">มีบัญชีแล้ว</Text>
          </TouchableOpacity>
        </Box>
        <Button
          py={3}
          onPress={handleRegister}
          color={"#8b0ff8"}
          isLoading={loading}
        >
          <Text fontSize={16} color={"white"}>
            สมัครสมาชิก
          </Text>
        </Button>
      </View>
    </Box>
  );
}
