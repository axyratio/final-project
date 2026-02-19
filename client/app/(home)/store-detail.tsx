// app/(home)/store-detail.tsx
import { HomeProduct } from "@/api/home";
import { createReport } from "@/api/report";
import { HomeProductGrid } from "@/components/product/grid"; // ✅ Reuse
import ReportModal from "@/components/report/report-modal";
import { DOMAIN } from "@/้host";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

// Types
type Store = {
  store_id: string;
  name: string;
  description?: string;
  address?: string;
  logo?: string;
  rating: number;
  total_reviews: number;
  total_products: number;
};

type Product = {
  product_id: string;
  name: string;
  price: number;
  image?: string;
  rating: number;
  review_count: number;
  category_id?: string;
  category_name?: string;
};

type Category = {
  category_id: string;
  category_name: string;
  category_slug: string;
  product_count: number;
};

type Tab = "รายการสินค้า" | "หมวดหมู่";

export default function StoreDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ storeId: string }>();
  const storeId = params.storeId;

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTab, setSelectedTab] = useState<Tab>("รายการสินค้า");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  useEffect(() => {
    if (storeId) {
      loadStoreData();
      loadCategories(); // ✅ โหลดหมวดหมู่เลย
    }
  }, [storeId]);

  useEffect(() => {
    if (selectedTab === "รายการสินค้า" && storeId) {
      loadProducts();
    }
  }, [selectedTab, selectedCategory]);

  const loadStoreData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${DOMAIN}/public/stores/${storeId}`);
      const data = await response.json();

      if (data.success) {
        setStore(data.data);
      }
    } catch (error) {
      console.error("Error loading store:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setProductsLoading(true);
      const url = selectedCategory
        ? `${DOMAIN}/public/stores/${storeId}/products?category_id=${selectedCategory}`
        : `${DOMAIN}/public/stores/${storeId}/products`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setProducts(data.data.products);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setProductsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      setProductsLoading(true);
      const response = await fetch(
        `${DOMAIN}/public/stores/${storeId}/categories`,
      );
      const data = await response.json();

      if (data.success) {
        setCategories(data.data.categories);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleChatPress = async () => {
    try {
      setChatLoading(true);
      router.push({
        pathname: "/(chat)/chat",
        params: {
          storeId: store!.store_id,
          storeName: store!.name,
        },
      });
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถเปิดแชทได้");
    } finally {
      setTimeout(() => setChatLoading(false), 1000);
    }
  };

  const handleReportSubmit = async (data: any) => {
    try {
      const response = await createReport({
        report_type: "store",
        reported_id: storeId!,
        reason: data.reason,
        description: data.description,
        image_urls: data.imageUrls,
      });

      if (response.success) {
        Alert.alert(
          "สำเร็จ",
          "ส่งรายงานเรียบร้อยแล้ว ทีมงานจะตรวจสอบโดยเร็วที่สุด",
        );
        setReportModalVisible(false);
      } else {
        Alert.alert("ข้อผิดพลาด", response.message || "ไม่สามารถส่งรายงานได้");
      }
    } catch (error) {
      console.error("Error reporting store:", error);
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถส่งรายงานได้");
    }
  };

  // ✅ Convert Product[] to HomeProduct[] for HomeProductGrid
  const convertToHomeProducts = (): HomeProduct[] => {
    return products.map((p) => ({
      id: p.product_id,
      title: p.name,
      price: p.price,
      rating: p.rating,
      imageUrl: p.image,
      imageId: undefined,
    }));
  };

  // ✅ Render Categories (Reuse style from HomeCategoryList)
  const renderCategories = () => {
    if (categories.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="albums-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyText}>ยังไม่มีหมวดหมู่</Text>
        </View>
      );
    }

    return (
      <View style={styles.categoriesContainer}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.category_id}
            style={styles.categoryCard}
            onPress={() => {
              setSelectedCategory(cat.category_id);
              setSelectedTab("รายการสินค้า");
            }}
          >
            <View style={styles.categoryIconWrapper}>
              <View style={styles.categoryIcon}>
                <Ionicons name="pricetag" size={24} color="#8b5cf6" />
              </View>
            </View>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>{cat.category_name}</Text>
              <Text style={styles.categoryCount}>
                {cat.product_count} สินค้า
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderStoreInfo = () => (
    <View style={styles.infoContainer}>
      {store?.description && (
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>คำอธิบาย</Text>
          <Text style={styles.infoValue}>{store.description}</Text>
        </View>
      )}

      {store?.address && (
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>ที่อยู่</Text>
          <Text style={styles.infoValue}>{store.address}</Text>
        </View>
      )}

      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>สถิติร้านค้า</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={24} color="#fbbf24" />
            <Text style={styles.statValue}>
              {store?.rating.toFixed(1) || "0.0"}
            </Text>
            <Text style={styles.statLabel}>คะแนน</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble" size={24} color="#8b5cf6" />
            <Text style={styles.statValue}>{store?.total_reviews || 0}</Text>
            <Text style={styles.statLabel}>รีวิว</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="cube" size={24} color="#3b82f6" />
            <Text style={styles.statValue}>{store?.total_products || 0}</Text>
            <Text style={styles.statLabel}>สินค้า</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </View>
    );
  }

  if (!store) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>ไม่พบร้านค้า</Text>
        </View>
      </View>
    );
  }

  const logoUrl = store.logo?.startsWith("http")
    ? store.logo
    : `${DOMAIN}${store.logo}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ร้านค้า</Text>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setReportModalVisible(true)}
        >
          <Ionicons name="flag-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Store Header */}
        <View style={styles.storeHeader}>
          <View style={styles.avatarWrapper}>
            {store.logo ? (
              <Image
                source={{ uri: logoUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="storefront" size={32} color="#9ca3af" />
              </View>
            )}
            <TouchableOpacity
              style={styles.chatBadge}
              onPress={handleChatPress}
              disabled={chatLoading}
            >
              {chatLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="chatbubble" size={16} color="white" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>{store.name}</Text>
            <View style={styles.storeRating}>
              <Ionicons name="star" size={16} color="#fbbf24" />
              <Text style={styles.ratingValue}>{store.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {(["รายการสินค้า", "หมวดหมู่"] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.activeTab]}
              onPress={() => {
                setSelectedTab(tab);
                if (tab !== "รายการสินค้า") {
                  setSelectedCategory(null);
                }
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Filter Badge */}
        {selectedTab === "รายการสินค้า" && selectedCategory && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterText}>
              กรองตามหมวดหมู่:{" "}
              {
                categories.find((c) => c.category_id === selectedCategory)
                  ?.category_name
              }
            </Text>
            <TouchableOpacity onPress={() => setSelectedCategory(null)}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {productsLoading ? (
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        ) : selectedTab === "รายการสินค้า" ? (
          // ✅ Reuse HomeProductGrid (no FlatList)
          <HomeProductGrid products={convertToHomeProducts()} />
        ) : selectedTab === "หมวดหมู่" ? (
          // ✅ Use View instead of FlatList
          renderCategories()
        ) : (
          renderStoreInfo()
        )}
      </ScrollView>

      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        reportType="store"
        reportedId={storeId!}
        reportedName={store.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  moreButton: {
    padding: 4,
  },

  // Store Header
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    gap: 12,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  chatBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4,
  },
  storeRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#8b5cf6",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  activeTabText: {
    color: "#8b5cf6",
    fontWeight: "600",
  },

  // Filter Badge
  filterBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ede9fe",
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterText: {
    fontSize: 13,
    color: "#7c3aed",
    fontWeight: "500",
  },

  // Content
  loadingContent: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
  },

  // Categories (Reuse HomeCategoryList style)
  categoriesContainer: {
    padding: 16,
    gap: 12,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIconWrapper: {
    marginRight: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  categoryCount: {
    fontSize: 12,
    color: "#6b7280",
  },

  // Store Info
  infoContainer: {
    padding: 16,
    gap: 16,
  },
  infoSection: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 14,
    color: "#1f2937",
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
});
