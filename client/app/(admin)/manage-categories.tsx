// File: app/(admin)/manage-categories.tsx

import {
  Category,
  createCategory,
  deleteCategory,
  fetchAdminCategories,
  updateCategory,
} from "@/api/category";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ModalMode = "create" | "edit" | null;

export default function ManageCategories() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminCategories(false);
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถโหลดหมวดหมู่ได้");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setFormName("");
    setFormSlug("");
    setSelectedCategory(null);
    setModalVisible(true);
  };

  const openEditModal = (cat: Category) => {
    setModalMode("edit");
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setSelectedCategory(cat);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalMode(null);
    setSelectedCategory(null);
    setFormName("");
    setFormSlug("");
  };

  const handleSubmit = async () => {
    if (!formName.trim() || !formSlug.trim()) {
      Alert.alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    try {
      setSubmitting(true);
      if (modalMode === "create") {
        await createCategory({ name: formName, slug: formSlug });
        Alert.alert("สำเร็จ", "สร้างหมวดหมู่เรียบร้อย");
      } else if (modalMode === "edit" && selectedCategory) {
        await updateCategory(selectedCategory.category_id, {
          name: formName,
          slug: formSlug,
        });
        Alert.alert("สำเร็จ", "อัพเดทหมวดหมู่เรียบร้อย");
      }
      closeModal();
      loadCategories();
    } catch (error: any) {
      Alert.alert("ข้อผิดพลาด", error.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      await updateCategory(cat.category_id, { is_active: !cat.is_active });
      loadCategories();
    } catch (error: any) {
      Alert.alert("ข้อผิดพลาด", error.message || "ไม่สามารถเปลี่ยนสถานะได้");
    }
  };

  const handleDelete = async (cat: Category) => {
    Alert.alert("ยืนยันการลบ", `คุณต้องการลบหมวดหมู่ "${cat.name}" หรือไม่?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCategory(cat.category_id, true);
            Alert.alert("สำเร็จ", "ปิดการใช้งานหมวดหมู่แล้ว");
            loadCategories();
          } catch (error: any) {
            Alert.alert("ข้อผิดพลาด", error.message || "ไม่สามารถลบได้");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>จัดการหมวดหมู่</Text>
        <TouchableOpacity onPress={openCreateModal} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color="#8b5cf6" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {categories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>ไม่มีหมวดหมู่</Text>
            </View>
          ) : (
            categories.map((cat) => (
              <View key={cat.category_id} style={styles.categoryCard}>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <Text style={styles.categorySlug}>Slug: {cat.slug}</Text>
                  <View style={styles.categoryMeta}>
                    <Text
                      style={[
                        styles.statusBadge,
                        cat.is_active
                          ? styles.statusActive
                          : styles.statusInactive,
                      ]}
                    >
                      {cat.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                    </Text>
                    {cat.product_count !== undefined && (
                      <Text style={styles.productCount}>
                        {cat.product_count} สินค้า
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    onPress={() => handleToggleActive(cat)}
                    style={styles.iconButton}
                  >
                    <Ionicons
                      name={cat.is_active ? "eye-off" : "eye"}
                      size={20}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => openEditModal(cat)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="create" size={20} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(cat)}
                    style={styles.iconButton}
                  >
                    <Ionicons name="trash" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalMode === "create" ? "สร้างหมวดหมู่ใหม่" : "แก้ไขหมวดหมู่"}
            </Text>

            <Text style={styles.label}>ชื่อหมวดหมู่</Text>
            <TextInput
              style={styles.input}
              value={formName}
              onChangeText={setFormName}
              placeholder="เช่น เสื้อยืด"
            />

            <Text style={styles.label}>Slug (ภาษาอังกฤษ, lowercase)</Text>
            <TextInput
              style={styles.input}
              value={formSlug}
              onChangeText={setFormSlug}
              placeholder="เช่น tshirt"
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={closeModal}
                style={[styles.modalButton, styles.cancelButton]}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                style={[styles.modalButton, styles.submitButton]}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {modalMode === "create" ? "สร้าง" : "บันทึก"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  addButton: {
    padding: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 16,
  },
  categoryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  categorySlug: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  categoryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: "#dcfce7",
    color: "#16a34a",
  },
  statusInactive: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
  },
  productCount: {
    fontSize: 11,
    color: "#6b7280",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#111827",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: "#8b5cf6",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
