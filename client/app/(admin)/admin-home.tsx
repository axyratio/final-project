// ============= app/(admin)/admin-home.tsx =============
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { deleteToken, deleteRole } from "@/utils/secure-store";

export default function AdminHome() {
  const router = useRouter();

  const handleLogout = async () => {
    await deleteToken();
    await deleteRole();
    router.replace("/(auth)/login");
  };

  const menuItems = [
    {
      id: 1,
      title: "จัดการร้านค้า",
      icon: "storefront",
      route: "/(admin)/manage-stores",
      color: "#3b82f6"
    },
    {
      id: 2,
      title: "จัดการหมวดหมู่",
      icon: "grid",
      route: "/(admin)/manage-categories",
      color: "#8b5cf6"
    },
    {
      id: 3,
      title: "Dashboard",
      icon: "analytics",
      route: "/(admin)/dashboard",
      color: "#10b981"
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuCard, { borderLeftColor: item.color }]}
            onPress={() => router.push(item.route as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color + "20" }]}>
              <Ionicons name={item.icon as any} size={32} color={item.color} />
            </View>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827"
  },
  logoutButton: {
    padding: 8
  },
  menuContainer: {
    padding: 16,
    gap: 12
  },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16
  },
  menuTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#374151"
  }
});