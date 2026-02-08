// app/(profile)/me.tsx - Updated with Profile Picture
import { Avartar } from "@/components/avartar";
import { AppBar } from "@/components/navbar";
import { EditPressable } from "@/components/pressable";
import { useProfileContext } from "@/context/Refresh";
import { deleteToken, getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import axios from "axios";
import { useRouter } from "expo-router";
import { Center, Divider, HStack, Spinner, VStack } from "native-base";
import { useEffect, useState } from "react";
import { Text, View, TouchableOpacity, Image, StyleSheet } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export type Profile = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  birth_date: Date;
  profile_picture?: string; // ✅ เพิ่ม profile_picture
};

export default function ProfileScreen() {
  const { refresh } = useProfileContext();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);

        const token = await getToken();

        const res = await axios.get(`${DOMAIN}/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setProfile(res.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          await deleteToken();
          router.replace("/login");
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

  if (loading) {
    return (
      <Center flex={1}>
        <Spinner size="lg" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center flex={1}>
        <Text style={{ color: "red" }}>{error}</Text>
      </Center>
    );
  }

  if (!profile) {
    return (
      <Center flex={1}>
        <Text>ไม่พบข้อมูลโปรไฟล์</Text>
      </Center>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AppBar title="โปรไฟล์" />

      <VStack space={2} p={4} bg="white" flex={1}>
        {/* ✅ รูปโปรไฟล์ */}
        <TouchableOpacity
          style={styles.profilePictureContainer}
          onPress={() => router.push("/(profile)/profile-picture" as any)}
        >
          {profile.profile_picture ? (
            <Image
              source={{ uri: profile.profile_picture }}
              style={styles.profilePicture}
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <MaterialCommunityIcons
                name="account-circle"
                size={100}
                color="#d1d5db"
              />
            </View>
          )}
          
          {/* Edit icon overlay */}
          <View style={styles.editIconContainer}>
            <MaterialCommunityIcons name="camera" size={24} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={styles.editHint}>แตะเพื่อเปลี่ยนรูปโปรไฟล์</Text>

        <Divider my={2} />

        {/* Username */}
        <EditPressable
          title="ชื่อผู้ใช้"
          value={profile.username}
          onPress={() =>
            router.push({
              pathname: "/(profile)/edit",
              params: {
                key: "username",
                value: profile.username,
                title: "ชื่อผู้ใช้",
              },
            })
          }
        />

        {/* First Name */}
        <EditPressable
          title="ชื่อ"
          value={profile.first_name}
          onPress={() =>
            router.push({
              pathname: "/(profile)/edit",
              params: {
                key: "first_name",
                value: profile.first_name,
                title: "ชื่อ",
              },
            })
          }
        />

        {/* Last Name */}
        <EditPressable
          title="นามสกุล"
          value={profile.last_name}
          onPress={() =>
            router.push({
              pathname: "/(profile)/edit",
              params: {
                key: "last_name",
                value: profile.last_name,
                title: "นามสกุล",
              },
            })
          }
        />

        {/* ✅ Email - เปิดหน้าเปลี่ยนอีเมล */}
        <EditPressable
          title="อีเมล"
          value={profile.email}
          onPress={() => router.push("/(profile)/change-email" as any)}
        />

        {/* Phone Number */}
        <EditPressable
          title="โทรศัพท์"
          value={profile.phone_number}
          onPress={() =>
            router.push({
              pathname: "/(profile)/edit",
              params: {
                key: "phone_number",
                value: profile.phone_number,
                title: "โทรศัพท์",
              },
            })
          }
        />

        {/* Birth Date */}
        <EditPressable
          title="วันเกิด"
          value={profile.birth_date ? new Date(profile.birth_date).toLocaleDateString("th-TH") : "ไม่ระบุ"}
          onPress={() =>
            router.push({
              pathname: "/(profile)/edit",
              params: {
                key: "birth_date",
                value: profile.birth_date?.toString() || "",
                title: "วันเกิด",
              },
            })
          }
        />

        <Divider my={2} />

        {/* ✅ เปลี่ยนรหัสผ่าน */}
        <TouchableOpacity
          style={styles.changePasswordButton}
          onPress={() => router.push("/(profile)/password" as any)}
        >
          <HStack alignItems="center" justifyContent="space-between" w="100%">
            <HStack alignItems="center" space={3}>
              <MaterialCommunityIcons name="lock" size={24} color="#7c3aed" />
              <Text style={styles.changePasswordText}>เปลี่ยนรหัสผ่าน</Text>
            </HStack>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
          </HStack>
        </TouchableOpacity>
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  profilePictureContainer: {
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 8,
    position: "relative",
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#e5e7eb",
  },
  placeholderContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  editIconContainer: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#7c3aed",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  editHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  changePasswordButton: {
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginTop: 8,
  },
  changePasswordText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
});