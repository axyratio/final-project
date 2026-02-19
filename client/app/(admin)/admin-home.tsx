// ============= app/(admin)/admin-home.tsx =============
import { deleteRole, deleteToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Box } from "native-base";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
      title: "จัดการผู้ใช้",
      icon: "people",
      route: "/(admin)/manage-user",
      color: "#f59e0b",
      description: "จัดการบัญชีผู้ใช้และสิทธิ์",
    },
    {
      id: 2,
      title: "จัดการร้านค้า",
      icon: "storefront",
      route: "/(admin)/manage-stores",
      color: "#3b82f6",
      description: "อนุมัติและจัดการร้านค้า",
    },
    {
      id: 3,
      title: "จัดการหมวดหมู่",
      icon: "grid",
      route: "/(admin)/manage-categories",
      color: "#8b5cf6",
      description: "จัดการหมวดหมู่สินค้า",
    },
    {
      id: 4,
      title: "จัดการรายงาน",
      icon: "flag",
      route: "/(admin)/report",
      color: "#ef4444",
      description: "ตรวจสอบและจัดการรายงาน",
    },
    {
      id: 5,
      title: "Dashboard",
      icon: "analytics",
      route: "/(admin)/dashboard",
      color: "#10b981",
      description: "สถิติและรายงาน",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Box safeAreaTop bg="#fff" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSubtitle}>ระบบจัดการแอดมิน</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Menu Grid */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuCard, { borderLeftColor: item.color }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: item.color + "20" },
                ]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={32}
                  color={item.color}
                />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>ภาพรวมระบบ</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={24} color="#f59e0b" />
              <Text style={styles.statLabel}>ผู้ใช้</Text>
              <Text style={styles.statValue}>-</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="storefront-outline" size={24} color="#3b82f6" />
              <Text style={styles.statLabel}>ร้านค้า</Text>
              <Text style={styles.statValue}>-</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cube-outline" size={24} color="#8b5cf6" />
              <Text style={styles.statLabel}>สินค้า</Text>
              <Text style={styles.statValue}>-</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cart-outline" size={24} color="#10b981" />
              <Text style={styles.statLabel}>คำสั่งซื้อ</Text>
              <Text style={styles.statValue}>-</Text>
            </View>
          </View>
          <Text style={styles.statsNote}>
            * กดเมนู Dashboard เพื่อดูข้อมูลแบบละเอียด
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  scrollView: {
    flex: 1,
  },
  menuContainer: {
    padding: 16,
    gap: 12,
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
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
  statsSection: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  statsNote: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
});
