// app/(admin)/manage-stores.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";

interface Store {
  store_id: string;
  name: string;
  description?: string;
  logo_path?: string;
  address?: string;
  is_active: boolean;
  rating: number;
  owner_name: string;
  owner_email: string;
  product_count: number;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    stores: Store[];
    total: number;
    skip: number;
    limit: number;
  };
}

export default function ManageStores() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    fetchStores();
  }, [statusFilter]);

  useEffect(() => {
    const filtered = stores.filter((store) =>
      store.name.toLowerCase().includes(search.toLowerCase()) ||
      store.owner_name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredStores(filtered);
  }, [search, stores]);

  const fetchStores = async () => {
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const url = `${DOMAIN}/admin/stores?${params.toString()}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result: ApiResponse = await response.json();
      
      if (result.success && result.data) {
        setStores(result.data.stores);
        setFilteredStores(result.data.stores);
      } else {
        console.error("Failed to fetch stores:", result.message);
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStores();
  }, [statusFilter]);

  const renderStoreCard = ({ item }: { item: Store }) => (
    <TouchableOpacity
      style={styles.storeCard}
      onPress={() =>
        router.push({
          pathname: "/(admin)/store-detail",
          params: { storeId: item.store_id },
        })
      }
    >
      {item.logo_path && (
        <Image source={{ uri: item.logo_path }} style={styles.storeLogo} />
      )}
      
      <View style={styles.storeInfo}>
        <Text style={styles.storeName}>{item.name}</Text>
        <View style={styles.storeMetaRow}>
          <Ionicons name="person" size={14} color="#6b7280" />
          <Text style={styles.storeOwner}>{item.owner_name}</Text>
        </View>
        <View style={styles.storeMetaRow}>
          <Ionicons name="cube" size={14} color="#6b7280" />
          <Text style={styles.productCount}>{item.product_count} สินค้า</Text>
        </View>
        {item.rating > 0 && (
          <View style={styles.storeMetaRow}>
            <Ionicons name="star" size={14} color="#fbbf24" />
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <View style={styles.storeActions}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: item.is_active ? "#dcfce7" : "#fee2e2",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: item.is_active ? "#16a34a" : "#dc2626" },
            ]}
          >
            {item.is_active ? "เปิด" : "ปิด"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>กำลังโหลดร้านค้า...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ค้นหาร้านค้า หรือ เจ้าของ..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        {[
          { key: "all", label: "ทั้งหมด" },
          { key: "active", label: "เปิดอยู่" },
          { key: "inactive", label: "ปิดอยู่" },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              statusFilter === filter.key && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter(filter.key as any)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === filter.key && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Store List */}
      <FlatList
        data={filteredStores}
        renderItem={renderStoreCard}
        keyExtractor={(item) => item.store_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="storefront-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>ไม่พบร้านค้า</Text>
            <Text style={styles.emptySubtext}>
              {search ? "ลองค้นหาด้วยคำอื่น" : "ยังไม่มีร้านค้าในระบบ"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
  },
  filterChipActive: {
    backgroundColor: "#3b82f6",
  },
  filterChipText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  storeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  storeLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: "#f3f4f6",
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  storeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  storeOwner: {
    fontSize: 13,
    color: "#6b7280",
  },
  productCount: {
    fontSize: 13,
    color: "#6b7280",
  },
  rating: {
    fontSize: 13,
    color: "#6b7280",
  },
  storeActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: "#9ca3af",
  },
});