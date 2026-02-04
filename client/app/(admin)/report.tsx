// client/app/(admin)/reports.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getAllReports, formatReportReason, formatReportStatus } from "@/api/report";

export default function AdminReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const response = await getAllReports({ skip: 0, limit: 50 });
      if (response.success) {
        setReports(response.data.reports);
      }
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถโหลดรายงานได้");
    } finally {
      setLoading(false);
    }
  };

  const handleReportPress = (report: any) => {
    // ไปหน้า user-detail ตาม reported_id
    if (report.report_type === "user") {
      router.push(`/(admin)/user-detail?userId=${report.reported_id}` as any);
    } else {
      // ถ้าเป็น store ไปหน้า store-detail
      router.push(`/(admin)/store-detail?storeId=${report.reported_id}` as any);
    }
  };

  const renderReportItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => handleReportPress(item)}
    >
      <View style={styles.reportHeader}>
        <Ionicons 
          name={item.report_type === "user" ? "person" : "storefront"} 
          size={20} 
          color="#ef4444" 
        />
        <Text style={styles.reportType}>
          {item.report_type === "user" ? "รายงานผู้ใช้" : "รายงานร้านค้า"}
        </Text>
        <View style={[styles.statusBadge, getStatusColor(item.status)]}>
          <Text style={styles.statusText}>{formatReportStatus(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.reportedName}>ผู้ถูกรายงาน: {item.reported_name}</Text>
      <Text style={styles.reason}>เหตุผล: {formatReportReason(item.reason)}</Text>
      <Text style={styles.reporter}>โดย: {item.reporter_username}</Text>

      {item.image_count > 0 && (
        <View style={styles.imageInfo}>
          <Ionicons name="image" size={16} color="#6b7280" />
          <Text style={styles.imageCount}>{item.image_count} รูป</Text>
        </View>
      )}

      <View style={styles.viewButton}>
        <Text style={styles.viewButtonText}>ดูรายละเอียด</Text>
        <Ionicons name="chevron-forward" size={18} color="#3b82f6" />
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: { backgroundColor: "#fef3c7" },
      reviewing: { backgroundColor: "#dbeafe" },
      resolved: { backgroundColor: "#dcfce7" },
      rejected: { backgroundColor: "#fee2e2" },
    };
    return colors[status] || { backgroundColor: "#f3f4f6" };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รายงานทั้งหมด</Text>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item: any) => item.report_id}
        renderItem={renderReportItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },
  listContent: { padding: 16, gap: 12 },
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  reportType: { fontSize: 14, fontWeight: "600", color: "#ef4444", flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  reportedName: { fontSize: 16, fontWeight: "bold", color: "#1f2937" },
  reason: { fontSize: 14, color: "#6b7280" },
  reporter: { fontSize: 13, color: "#9ca3af" },
  imageInfo: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  imageCount: { fontSize: 13, color: "#6b7280" },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 4,
  },
  viewButtonText: { fontSize: 15, fontWeight: "600", color: "#3b82f6" },
});