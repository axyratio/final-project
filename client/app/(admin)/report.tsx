// client/app/(admin)/report.tsx - Enhanced with Status Filter & Action Buttons
import {
  formatReportReason,
  formatReportStatus,
  getAllReports,
  getReportDetail,
  updateReportStatus,
} from "@/api/report";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// สถานะที่มี
const STATUS_OPTIONS = [
  { value: null, label: "ทั้งหมด" },
  { value: "pending", label: "รอตรวจสอบ" },
  { value: "reviewing", label: "กำลังตรวจสอบ" },
  { value: "resolved", label: "ตรวจสอบแล้ว" },
  { value: "rejected", label: "ปฏิเสธ" },
];

export default function AdminReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 🆕 Image viewer states
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [selectedStatus]);

  const loadReports = async () => {
    try {
      const params: any = { skip: 0, limit: 100 };
      if (selectedStatus) {
        params.status = selectedStatus;
      }

      const response = await getAllReports(params);
      if (response.success) {
        setReports(response.data.reports);
      }
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถโหลดรายงานได้");
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  // 🆕 เปิดดูรูปภาพ + เปลี่ยนสถานะเป็น reviewing อัตโนมัติ
  const handleImagePress = async (
    images: string[],
    index: number,
    reportId: string,
  ) => {
    setSelectedImages(images);
    setCurrentImageIndex(index);
    setCurrentReportId(reportId);
    setImageViewerVisible(true);

    // ✅ เปลี่ยนสถานะเป็น reviewing อัตโนมัติเมื่อดูรูป
    try {
      await getReportDetail(reportId, true); // auto_mark_reviewing=true
      console.log("✅ Auto-changed status to reviewing");
      // Reload reports to update UI
      loadReports();
    } catch (error) {
      console.error("❌ Failed to auto-update status:", error);
    }
  };

  // 🆕 เปลี่ยนสถานะรายงาน
  const handleChangeStatus = async (reportId: string, newStatus: string) => {
    try {
      const statusLabels: any = {
        resolved: "ตรวจสอบแล้ว",
        rejected: "ปฏิเสธ",
      };

      Alert.alert(
        "ยืนยันการเปลี่ยนสถานะ",
        `คุณต้องการเปลี่ยนสถานะเป็น "${statusLabels[newStatus]}" ใช่หรือไม่?`,
        [
          { text: "ยกเลิก", style: "cancel" },
          {
            text: "ยืนยัน",
            onPress: async () => {
              const response = await updateReportStatus(reportId, newStatus);
              if (response.success) {
                Alert.alert("สำเร็จ", "เปลี่ยนสถานะเรียบร้อยแล้ว");
                loadReports(); // Reload รายการ
              } else {
                Alert.alert(
                  "ข้อผิดพลาด",
                  response.message || "ไม่สามารถเปลี่ยนสถานะได้",
                );
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
    }
  };

  // 🆕 รูปถัดไป
  const handleNextImage = () => {
    if (currentImageIndex < selectedImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  // 🆕 รูปก่อนหน้า
  const handlePreviousImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const renderReportItem = ({ item }: any) => {
    // แปลง image_urls จาก string เป็น array (ถ้าเป็น JSON string)
    let imageUrls: string[] = [];
    try {
      if (typeof item.image_urls === "string") {
        imageUrls = JSON.parse(item.image_urls);
      } else if (Array.isArray(item.image_urls)) {
        imageUrls = item.image_urls;
      }
    } catch (e) {
      console.log("Parse image_urls error:", e);
    }

    return (
      <View style={styles.reportCard}>
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
            <Text style={styles.statusText}>
              {formatReportStatus(item.status)}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => handleReportPress(item)}>
          <Text style={styles.reportedName}>
            ผู้ถูกรายงาน: {item.reported_name}
          </Text>
          <Text style={styles.reason}>
            เหตุผล: {formatReportReason(item.reason)}
          </Text>

          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <Text style={styles.reporter}>โดย: {item.reporter_username}</Text>
        </TouchableOpacity>

        {/* 🆕 แสดงรูปภาพ Thumbnails */}
        {imageUrls.length > 0 && (
          <View style={styles.imagesContainer}>
            <View style={styles.imageHeader}>
              <Ionicons name="images" size={16} color="#6b7280" />
              <Text style={styles.imageHeaderText}>
                รูปภาพหลักฐาน ({imageUrls.length})
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.imagesGrid}>
                {imageUrls.map((url, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.thumbnailWrapper}
                    onPress={() =>
                      handleImagePress(imageUrls, index, item.report_id)
                    }
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                    <View style={styles.thumbnailOverlay}>
                      <Ionicons name="eye" size={20} color="#fff" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ✅ ปุ่มเปลี่ยนสถานะ */}
        {(item.status === "pending" || item.status === "reviewing") && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.resolvedButton]}
              onPress={() => handleChangeStatus(item.report_id, "resolved")}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>ตรวจสอบแล้ว</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rejectedButton]}
              onPress={() => handleChangeStatus(item.report_id, "rejected")}
            >
              <Ionicons name="close-circle" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>ปฏิเสธ</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => handleReportPress(item)}
        >
          <Text style={styles.viewButtonText}>ดูรายละเอียด</Text>
          <Ionicons name="chevron-forward" size={18} color="#3b82f6" />
        </TouchableOpacity>
      </View>
    );
  };

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

      {/* ✅ Status Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterButtons}>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value || "all"}
                style={[
                  styles.filterButton,
                  selectedStatus === option.value && styles.filterButtonActive,
                ]}
                onPress={() => {
                  setSelectedStatus(option.value);
                  setRefreshing(true);
                }}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedStatus === option.value &&
                      styles.filterButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item: any) => item.report_id}
        renderItem={renderReportItem}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadReports();
        }}
      />

      {/* 🆕 Image Viewer Modal with Zoom */}
      <Modal
        visible={imageViewerVisible}
        transparent
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.imageViewerContainer}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setImageViewerVisible(false)}
          >
            <Ionicons name="close-circle" size={40} color="#fff" />
          </TouchableOpacity>

          {/* Image Counter */}
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentImageIndex + 1} / {selectedImages.length}
            </Text>
          </View>

          {/* Main Image with Zoom */}
          {selectedImages.length > 0 && (
            <ScrollView
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.zoomScrollContent}
            >
              <Image
                source={{ uri: selectedImages[currentImageIndex] }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </ScrollView>
          )}

          {/* Navigation Buttons */}
          {selectedImages.length > 1 && (
            <>
              {/* Previous Button */}
              {currentImageIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.prevButton]}
                  onPress={handlePreviousImage}
                >
                  <Ionicons name="chevron-back" size={30} color="#fff" />
                </TouchableOpacity>
              )}

              {/* Next Button */}
              {currentImageIndex < selectedImages.length - 1 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.nextButton]}
                  onPress={handleNextImage}
                >
                  <Ionicons name="chevron-forward" size={30} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Thumbnail Strip */}
          {selectedImages.length > 1 && (
            <View style={styles.thumbnailStrip}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {selectedImages.map((url, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setCurrentImageIndex(index)}
                    style={[
                      styles.thumbnailStripItem,
                      currentImageIndex === index &&
                        styles.thumbnailStripItemActive,
                    ]}
                  >
                    <Image
                      source={{ uri: url }}
                      style={styles.thumbnailStripImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
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

  // ✅ Filter Styles
  filterContainer: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterButtonActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterButtonTextActive: {
    color: "#fff",
  },

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
  description: { fontSize: 14, color: "#6b7280", fontStyle: "italic" },
  reporter: { fontSize: 13, color: "#9ca3af" },

  // Images Container
  imagesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  imageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  imageHeaderText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  imagesGrid: {
    flexDirection: "row",
    gap: 8,
  },
  thumbnailWrapper: {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f3f4f6",
  },
  thumbnailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ✅ Action Buttons Styles
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  resolvedButton: {
    backgroundColor: "#10b981",
  },
  rejectedButton: {
    backgroundColor: "#ef4444",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },

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

  // Image Viewer Modal
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  imageCounter: {
    position: "absolute",
    top: 55,
    left: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  imageCounterText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  zoomScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },

  // Navigation Buttons
  navButton: {
    position: "absolute",
    top: "50%",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },

  // Thumbnail Strip
  thumbnailStrip: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  thumbnailStripItem: {
    width: 60,
    height: 60,
    marginRight: 8,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbnailStripItemActive: {
    borderColor: "#3b82f6",
  },
  thumbnailStripImage: {
    width: "100%",
    height: "100%",
  },
});
