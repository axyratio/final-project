import { Avartar } from "@/components/avartar";
import { AppBar } from "@/components/navbar";
import { EditPressable } from "@/components/pressable";
import { useProfileContext } from "@/context/Refresh";
import { deleteToken, getToken } from "@/utils/secure-store";
import { ADDRESS_IP, DOMAIN, PORT } from "@/้host";
import axios from "axios";
import { useRouter } from "expo-router";
import { Center, Divider, HStack, Spinner, VStack } from "native-base";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

export type Profile = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  birth_date: Date; // API ส่งเป็น string
};


import { StyleSheet } from "react-native";

export default function ProfileScreen() {
  const { refresh } = useProfileContext();
  const router = useRouter()
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");




  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);

        // ดึง token จาก SecureStore
        const token = await getToken();
        // if (!token) {
        //   setError("No token found, please login");
        //   router.replace("/login")
        //   setLoading(false);
        //   return;
        // }

        const res = await axios.get(`${DOMAIN}/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`, // ส่ง token ไป backend
          },
        });

        setProfile(res.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          // token หมดอายุหรือไม่ถูกต้อง
          await deleteToken();
          router.replace("/login"); // พาไปหน้า login
          return;
        }

        console.log(err);
        setError(err.response?.data?.detail || err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [refresh]);


  const handleChange = (key: keyof Profile) => (value: string) => {
    setProfile(prev => {
      if (!prev) return prev; // หรือ return default object
      return { ...prev, [key]: value } as Profile; // type assertion
    });
  };

  const handleSubmit = async (profile: Profile) => {
    try {
      const token = await getToken();
      const res = await axios.patch(`${DOMAIN}/profile/change`, profile, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(res.data, "res change")
      if (!res.data.success) {
        setError(res.data.message || "Something went wrong");
        router.replace("/profile");

        return;
      }
      console.log("Saved:", res.data);
      router.replace("/profile");
    } catch (err) {
      console.error(err);
    }
  };


  console.log(profile?.username)
  const handleDelete = async () => {
    try {
      const token = await getToken();

      const res = await axios.patch(
        `${DOMAIN}/profile/delete`,
        { password }, // body ว่างเพราะไม่ได้ส่ง data ไป
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // ✅ ถ้าลบสำเร็จ
      if (res.data.success) {
        console.log("ลบโปรไฟล์และ token สำเร็จ");
        await deleteToken();
        setIsOpen(false);
        router.replace("/login");
        console.log("ลบโปรไฟล์และ token สำเร็จ");
      } else {
        console.log(res.data, "====")
        setError(res.data.password || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  if (loading) {
    return (
      <Center flex={1}>
        <Spinner size="lg" />
      </Center>
    );
  }


  return (
    <VStack
    
      justifyContent={"center"}
      style={{ gap: 8, backgroundColor: "#f0f0f0" }}
    >

      <AppBar
        title="แก้ไขโปรไฟล์"
        onSave={async () => {
          if (profile) await handleSubmit(profile);
        }}
      />
      <HStack justifyContent={"center"}>
        <Avartar name={profile?.username} size={200} />
      </HStack>
      <VStack >
          {profile && (
          <EditPressable
            title="ชื่อผู้ใช้"
            value={profile.username}
            onPress={() => router.push({
              pathname: "/edit",
              params: { key: "username", value: profile.username, title: "ชื่อผู้ใช้" },
            })}
          />
        )}


      
      {profile && (
        <EditPressable
          title="ชื่อ"
          value={profile?.first_name}
          onPress={() => router.push({
              pathname: "/edit",
              params: { key: "first_name", value: profile.first_name, title: "ชื่อ" },
   
            })}
        />
      )}
      
      {profile && (
        <EditPressable
          title="นามสกุล"
          value={profile.last_name}
            onPress={() => router.push({
              pathname: "/edit",
              params: { key: "last_name", value: profile.last_name, title: "นามสกุล" },
            })}
        />
      )}
      
      {profile && (
        <EditPressable
          title="โทรศัพท์"
          value={profile.phone_number}
          onPress={() => router.push({
              pathname: "/edit",
              params: { key: "phone_number", value: profile.phone_number, title: "โทรศัพท์" },
            })}
        />
      )}

      </VStack>
      <VStack >
        <Pressable
          onPress={() => router.push("/password")}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#ddd" : "#fff",
            padding: 16,
          })}
        >
          <Text style={{ color: "#000" }}>เปลี่ยนรหัสผ่าน</Text>
        </Pressable>
        <Divider orientation="horizontal" />
        <Pressable
          onPress={() => setIsOpen(!isOpen)}
          style={({ pressed }) => ({
            backgroundColor: pressed ? "#f0f0f0" : "#ffffff", // เปลี่ยนสีตอนกด
            padding: 15,
          })}
        >
          <Text style={{ color: 'red' }}>ลบบัญชี</Text>
        </Pressable>

        <Modal
          animationType="fade" // "slide", "fade", "none"
          transparent={true}   // ทำให้ background โปร่งใส
          visible={isOpen}
          onRequestClose={() => setIsOpen(false)} // Android back button
        >
          <View style={styles.overlay}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี?</Text>
              <TextInput
                secureTextEntry
                style={styles.input}
                placeholder="กรอกรหัสเพื่อยืนยันการลบบัญชี"
                value={password}
                onChangeText={setPassword}
              />
              <View
                style={{
                  width: "100%",
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >{error && <Text style={styles.error}>{error}</Text>}</View>

              <View style={styles.row}>
                <Pressable style={[styles.button, styles.buttonCancel]} onPress={() => setIsOpen(false)}>
                  <Text style={styles.textCancel}>ยกเลิก</Text>
                </Pressable>

                <Pressable style={[styles.button, styles.buttonDelete]} onPress={() => {
                  handleDelete();

                }}>
                  <Text style={styles.textDelete}>ลบ</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

      </VStack>
    </VStack>


  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 280,
    maxWidth: 350,
    width: "100%"
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 5,
    width: "100%",
  },
  error: {
    color: "red",
    fontSize: 12,
    textAlign: "right",
    width: "100%",

  },
  modalText: {
    marginBottom: 16,
    fontSize: 18,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginHorizontal: 8,
    minWidth: 80,
    alignItems: "center",
    marginTop: 16,
  },
  buttonCancel: {
    backgroundColor: "#e0e0e0",
  },
  buttonDelete: {
    backgroundColor: "#ff5252",
  },
  textCancel: {
    color: "#333",
    fontWeight: "bold",
  },
  textDelete: {
    color: "#fff",
    fontWeight: "bold",
  },
});


