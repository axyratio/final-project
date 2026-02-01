// // app/(admin)/store-detail-enhanced.tsx
// /**
//  * หน้ารายละเอียดร้านค้าสำหรับ Admin (เวอร์ชันปรับปรุง)
//  * รองรับ:
//  * - ดูข้อมูลร้านค้า
//  * - เปิด/ปิดร้านค้า
//  * - แก้ไขข้อมูลร้าน (ใช้ UI เดิม)
//  * - ดูและจัดการสินค้า
//  */

// import React, { useState, useEffect, useCallback } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Alert,
//   ActivityIndicator,
//   RefreshControl,
//   Image,
// } from "react-native";
// import { useLocalSearchParams, useRouter } from "expo-router";
// import { Ionicons } from "@expo/vector-icons";
// import {
//   getStoreDetailAdmin,
//   toggleStoreStatus,
//   getStoreProductsAdmin,
//   toggleProductStatus,
//   navigateToEditStoreAsAdmin,
//   navigateToEditProductAsAdmin,
//   formatStoreStatus,
//   getStatusColor,
//   getStatusBgColor,
//   type StoreDetail,
//   type ProductInStore,
// } from "@/api/admin";

// export default function StoreDetailEnhanced() {
//   const { storeId } = useLocalSearchParams<{ storeId: string }>();
//   const router = useRouter();

//   const [store, setStore] = useState<StoreDetail | null>(null);
//   const [products, setProducts] = useState<ProductInStore[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [activeTab, setActiveTab] = useState<"info" | "products">("info");
//   const [productFilter, setProductFilter] = useState<
//     "all" | "active" | "inactive" | "draft"
//   >("all");

//   // ดึงข้อมูลร้านค้า
//   const fetchStoreDetail = useCallback(async () => {
//     try {
//       const response = await getStoreDetailAdmin(storeId);
//       if (response.success) {
//         setStore(response.data);
//       } else {
//         Alert.alert("เกิดข้อผิดพลาด", response.message);
//       }
//     } catch (error) {
//       console.error("Error fetching store detail:", error);
//       Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถดึงข้อมูลร้านค้าได้");
//     }
//   }, [storeId]);

//   // ดึงรายการสินค้า
//   const fetchProducts = useCallback(async () => {
//     try {
//       const statusFilter =
//         productFilter === "all" ? undefined : productFilter;
//       const response = await getStoreProductsAdmin(storeId, {
//         status: statusFilter as any,
//         limit: 50,
//       });
//       if (response.success) {
//         setProducts(response.data.products);
//       }
//     } catch (error) {
//       console.error("Error fetching products:", error);
//     }
//   }, [storeId, productFilter]);

//   // โหลดข้อมูลเริ่มต้น
//   useEffect(() => {
//     const loadData = async () => {
//       setLoading(true);
//       await fetchStoreDetail();
//       await fetchProducts();
//       setLoading(false);
//     };
//     loadData();
//   }, [fetchStoreDetail, fetchProducts]);

//   // Refresh
//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await fetchStoreDetail();
//     await fetchProducts();
//     setRefreshing(false);
//   }, [fetchStoreDetail, fetchProducts]);

//   // เปิด/ปิดร้านค้า
//   const handleToggleStore = async () => {
//     if (!store) return;

//     const newStatus = !store.is_active;
//     const actionText = newStatus ? "เปิด" : "ปิด";

//     Alert.alert(
//       "ยืนยันการเปลี่ยนสถานะ",
//       `คุณต้องการ${actionText}ร้านค้า "${store.name}" หรือไม่?`,
//       [
//         { text: "ยกเลิก", style: "cancel" },
//         {
//           text: "ยืนยัน",
//           style: newStatus ? "default" : "destructive",
//           onPress: async () => {
//             try {
//               const response = await toggleStoreStatus(storeId, newStatus);
//               if (response.success) {
//                 Alert.alert("สำเร็จ", response.message);
//                 await fetchStoreDetail();
//               } else {
//                 Alert.alert("เกิดข้อผิดพลาด", response.message);
//               }
//             } catch (error) {
//               Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเปลี่ยนสถานะได้");
//             }
//           },
//         },
//       ]
//     );
//   };

//   // แก้ไขร้านค้า
//   const handleEditStore = () => {
//     if (!store) return;
//     navigateToEditStoreAsAdmin(router, store);
//   };

//   // เปิด/ปิดสินค้า
//   const handleToggleProduct = async (product: ProductInStore) => {
//     const newStatus = !product.is_active;
//     const actionText = newStatus ? "เปิดขาย" : "ปิดขาย";

//     Alert.alert(
//       "ยืนยันการเปลี่ยนสถานะ",
//       `คุณต้องการ${actionText}สินค้า "${product.product_name}" หรือไม่?`,
//       [
//         { text: "ยกเลิก", style: "cancel" },
//         {
//           text: "ยืนยัน",
//           onPress: async () => {
//             try {
//               const response = await toggleProductStatus(
//                 storeId,
//                 product.product_id,
//                 newStatus
//               );
//               if (response.success) {
//                 Alert.alert("สำเร็จ", response.message);
//                 await fetchProducts();
//               } else {
//                 Alert.alert("เกิดข้อผิดพลาด", response.message);
//               }
//             } catch (error) {
//               Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเปลี่ยนสถานะได้");
//             }
//           },
//         },
//       ]
//     );
//   };

//   // แก้ไขสินค้า
//   const handleEditProduct = (productId: string) => {
//     navigateToEditProductAsAdmin(router, productId, storeId);
//   };

//   if (loading) {
//     return (
//       <View style={styles.centerContainer}>
//         <ActivityIndicator size="large" color="#3b82f6" />
//       </View>
//     );
//   }

//   if (!store) {
//     return (
//       <View style={styles.centerContainer}>
//         <Ionicons name="alert-circle" size={64} color="#ef4444" />
//         <Text style={styles.errorText}>ไม่พบข้อมูลร้านค้า</Text>
//         <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
//           <Text style={styles.backButtonText}>กลับ</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <View style={styles.headerTop}>
//           <TouchableOpacity onPress={() => router.back()}>
//             <Ionicons name="arrow-back" size={24} color="#111827" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>รายละเอียดร้านค้า</Text>
//           <TouchableOpacity onPress={handleEditStore}>
//             <Ionicons name="create-outline" size={24} color="#3b82f6" />
//           </TouchableOpacity>
//         </View>
//       </View>

//       {/* Tabs */}
//       <View style={styles.tabs}>
//         <TouchableOpacity
//           style={[styles.tab, activeTab === "info" && styles.tabActive]}
//           onPress={() => setActiveTab("info")}
//         >
//           <Text
//             style={[
//               styles.tabText,
//               activeTab === "info" && styles.tabTextActive,
//             ]}
//           >
//             ข้อมูลร้าน
//           </Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.tab, activeTab === "products" && styles.tabActive]}
//           onPress={() => setActiveTab("products")}
//         >
//           <Text
//             style={[
//               styles.tabText,
//               activeTab === "products" && styles.tabTextActive,
//             ]}
//           >
//             สินค้า ({store.statistics.total_products})
//           </Text>
//         </TouchableOpacity>
//       </View>

//       <ScrollView
//         style={styles.content}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//       >
//         {activeTab === "info" ? (
//           // ข้อมูลร้าน
//           <>
//             {/* Store Info Card */}
//             <View style={styles.card}>
//               <View style={styles.storeHeader}>
//                 {store.logo_path && (
//                   <Image
//                     source={{ uri: store.logo_path }}
//                     style={styles.storeLogo}
//                   />
//                 )}
//                 <View style={styles.storeInfo}>
//                   <Text style={styles.storeName}>{store.name}</Text>
//                   <View
//                     style={[
//                       styles.statusBadge,
//                       {
//                         backgroundColor: getStatusBgColor(store.is_active),
//                       },
//                     ]}
//                   >
//                     <Text
//                       style={[
//                         styles.statusText,
//                         { color: getStatusColor(store.is_active) },
//                       ]}
//                     >
//                       {formatStoreStatus(store.is_active)}
//                     </Text>
//                   </View>
//                 </View>
//               </View>

//               <Text style={styles.description}>{store.description}</Text>

//               {store.address && (
//                 <View style={styles.infoRow}>
//                   <Ionicons name="location" size={20} color="#6b7280" />
//                   <Text style={styles.infoText}>{store.address}</Text>
//                 </View>
//               )}

//               <View style={styles.infoRow}>
//                 <Ionicons name="star" size={20} color="#fbbf24" />
//                 <Text style={styles.infoText}>
//                   คะแนน: {store.rating.toFixed(1)} ⭐
//                 </Text>
//               </View>
//             </View>

//             {/* Owner Info Card */}
//             <View style={styles.card}>
//               <Text style={styles.cardTitle}>ข้อมูลเจ้าของ</Text>
//               <View style={styles.infoRow}>
//                 <Ionicons name="person" size={20} color="#6b7280" />
//                 <Text style={styles.infoText}>{store.owner.username}</Text>
//               </View>
//               <View style={styles.infoRow}>
//                 <Ionicons name="mail" size={20} color="#6b7280" />
//                 <Text style={styles.infoText}>{store.owner.email}</Text>
//               </View>
//               <View style={styles.infoRow}>
//                 <Ionicons name="shield" size={20} color="#6b7280" />
//                 <Text style={styles.infoText}>
//                   สิทธิ์: {store.owner.role}
//                 </Text>
//               </View>
//             </View>

//             {/* Statistics Card */}
//             <View style={styles.card}>
//               <Text style={styles.cardTitle}>สถิติสินค้า</Text>
//               <View style={styles.statsGrid}>
//                 <View style={styles.statItem}>
//                   <Text style={styles.statValue}>
//                     {store.statistics.total_products}
//                   </Text>
//                   <Text style={styles.statLabel}>สินค้าทั้งหมด</Text>
//                 </View>
//                 <View style={styles.statItem}>
//                   <Text style={[styles.statValue, { color: "#16a34a" }]}>
//                     {store.statistics.active_products}
//                   </Text>
//                   <Text style={styles.statLabel}>เปิดขาย</Text>
//                 </View>
//                 <View style={styles.statItem}>
//                   <Text style={[styles.statValue, { color: "#f59e0b" }]}>
//                     {store.statistics.draft_products}
//                   </Text>
//                   <Text style={styles.statLabel}>แบบร่าง</Text>
//                 </View>
//               </View>
//             </View>

//             {/* Actions */}
//             <View style={styles.actionContainer}>
//               <TouchableOpacity
//                 style={[
//                   styles.actionButton,
//                   {
//                     backgroundColor: store.is_active ? "#dc2626" : "#16a34a",
//                   },
//                 ]}
//                 onPress={handleToggleStore}
//               >
//                 <Ionicons
//                   name={
//                     store.is_active ? "close-circle" : "checkmark-circle"
//                   }
//                   size={20}
//                   color="#fff"
//                 />
//                 <Text style={styles.actionButtonText}>
//                   {store.is_active ? "ปิดร้านค้า" : "เปิดร้านค้า"}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </>
//         ) : (
//           // รายการสินค้า
//           <>
//             {/* Product Filters */}
//             <View style={styles.filterContainer}>
//               <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//                 {[
//                   { key: "all", label: "ทั้งหมด" },
//                   { key: "active", label: "เปิดขาย" },
//                   { key: "inactive", label: "ปิดขาย" },
//                   { key: "draft", label: "แบบร่าง" },
//                 ].map((filter) => (
//                   <TouchableOpacity
//                     key={filter.key}
//                     style={[
//                       styles.filterChip,
//                       productFilter === filter.key && styles.filterChipActive,
//                     ]}
//                     onPress={() => setProductFilter(filter.key as any)}
//                   >
//                     <Text
//                       style={[
//                         styles.filterChipText,
//                         productFilter === filter.key &&
//                           styles.filterChipTextActive,
//                       ]}
//                     >
//                       {filter.label}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             </View>

//             {/* Product List */}
//             {products.length === 0 ? (
//               <View style={styles.emptyContainer}>
//                 <Ionicons name="cube-outline" size={64} color="#d1d5db" />
//                 <Text style={styles.emptyText}>ไม่พบสินค้า</Text>
//               </View>
//             ) : (
//               products.map((product) => (
//                 <View key={product.product_id} style={styles.productCard}>
//                   {product.image_url && (
//                     <Image
//                       source={{ uri: product.image_url }}
//                       style={styles.productImage}
//                     />
//                   )}
//                   <View style={styles.productInfo}>
//                     <Text style={styles.productName}>
//                       {product.product_name}
//                     </Text>
//                     <Text style={styles.productPrice}>
//                       ฿{product.base_price.toFixed(2)}
//                     </Text>
//                     <Text style={styles.productStock}>
//                       คลัง: {product.stock_quantity}
//                     </Text>
//                     <View
//                       style={[
//                         styles.productStatus,
//                         {
//                           backgroundColor: getStatusBgColor(
//                             product.is_active
//                           ),
//                         },
//                       ]}
//                     >
//                       <Text
//                         style={[
//                           styles.productStatusText,
//                           {
//                             color: getStatusColor(product.is_active),
//                           },
//                         ]}
//                       >
//                         {product.is_draft
//                           ? "แบบร่าง"
//                           : formatStoreStatus(product.is_active)}
//                       </Text>
//                     </View>
//                   </View>
//                   <View style={styles.productActions}>
//                     <TouchableOpacity
//                       onPress={() => handleEditProduct(product.product_id)}
//                     >
//                       <Ionicons name="create" size={20} color="#3b82f6" />
//                     </TouchableOpacity>
//                     {!product.is_draft && (
//                       <TouchableOpacity
//                         onPress={() => handleToggleProduct(product)}
//                       >
//                         <Ionicons
//                           name={
//                             product.is_active
//                               ? "eye-off"
//                               : "eye"
//                           }
//                           size={20}
//                           color={
//                             product.is_active ? "#dc2626" : "#16a34a"
//                           }
//                         />
//                       </TouchableOpacity>
//                     )}
//                   </View>
//                 </View>
//               ))
//             )}
//           </>
//         )}
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f9fafb",
//   },
//   centerContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 20,
//   },
//   header: {
//     backgroundColor: "#fff",
//     borderBottomWidth: 1,
//     borderBottomColor: "#e5e7eb",
//   },
//   headerTop: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     padding: 16,
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#111827",
//   },
//   tabs: {
//     flexDirection: "row",
//     backgroundColor: "#fff",
//     borderBottomWidth: 1,
//     borderBottomColor: "#e5e7eb",
//   },
//   tab: {
//     flex: 1,
//     paddingVertical: 12,
//     alignItems: "center",
//   },
//   tabActive: {
//     borderBottomWidth: 2,
//     borderBottomColor: "#3b82f6",
//   },
//   tabText: {
//     fontSize: 14,
//     color: "#6b7280",
//   },
//   tabTextActive: {
//     color: "#3b82f6",
//     fontWeight: "600",
//   },
//   content: {
//     flex: 1,
//   },
//   card: {
//     backgroundColor: "#fff",
//     marginTop: 12,
//     padding: 16,
//     borderRadius: 12,
//     marginHorizontal: 16,
//   },
//   cardTitle: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#111827",
//     marginBottom: 12,
//   },
//   storeHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 12,
//   },
//   storeLogo: {
//     width: 64,
//     height: 64,
//     borderRadius: 32,
//     marginRight: 12,
//   },
//   storeInfo: {
//     flex: 1,
//   },
//   storeName: {
//     fontSize: 20,
//     fontWeight: "bold",
//     color: "#111827",
//     marginBottom: 4,
//   },
//   statusBadge: {
//     alignSelf: "flex-start",
//     paddingHorizontal: 12,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   statusText: {
//     fontSize: 12,
//     fontWeight: "600",
//   },
//   description: {
//     fontSize: 14,
//     color: "#6b7280",
//     marginBottom: 12,
//     lineHeight: 20,
//   },
//   infoRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 8,
//     gap: 8,
//   },
//   infoText: {
//     fontSize: 14,
//     color: "#374151",
//   },
//   statsGrid: {
//     flexDirection: "row",
//     justifyContent: "space-around",
//   },
//   statItem: {
//     alignItems: "center",
//   },
//   statValue: {
//     fontSize: 24,
//     fontWeight: "bold",
//     color: "#111827",
//   },
//   statLabel: {
//     fontSize: 12,
//     color: "#6b7280",
//     marginTop: 4,
//   },
//   actionContainer: {
//     padding: 16,
//     gap: 12,
//   },
//   actionButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     padding: 16,
//     borderRadius: 12,
//     gap: 8,
//   },
//   actionButtonText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
//   filterContainer: {
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     backgroundColor: "#fff",
//   },
//   filterChip: {
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 20,
//     backgroundColor: "#f3f4f6",
//     marginRight: 8,
//   },
//   filterChipActive: {
//     backgroundColor: "#3b82f6",
//   },
//   filterChipText: {
//     fontSize: 14,
//     color: "#6b7280",
//   },
//   filterChipTextActive: {
//     color: "#fff",
//     fontWeight: "600",
//   },
//   productCard: {
//     flexDirection: "row",
//     backgroundColor: "#fff",
//     padding: 12,
//     marginHorizontal: 16,
//     marginBottom: 8,
//     borderRadius: 12,
//     alignItems: "center",
//   },
//   productImage: {
//     width: 60,
//     height: 60,
//     borderRadius: 8,
//     marginRight: 12,
//   },
//   productInfo: {
//     flex: 1,
//   },
//   productName: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#111827",
//     marginBottom: 4,
//   },
//   productPrice: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#3b82f6",
//     marginBottom: 2,
//   },
//   productStock: {
//     fontSize: 12,
//     color: "#6b7280",
//     marginBottom: 4,
//   },
//   productStatus: {
//     alignSelf: "flex-start",
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 8,
//   },
//   productStatusText: {
//     fontSize: 10,
//     fontWeight: "600",
//   },
//   productActions: {
//     flexDirection: "row",
//     gap: 12,
//   },
//   emptyContainer: {
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 60,
//   },
//   emptyText: {
//     marginTop: 12,
//     fontSize: 16,
//     color: "#9ca3af",
//   },
//   errorText: {
//     marginTop: 12,
//     fontSize: 16,
//     color: "#ef4444",
//   },
//   backButton: {
//     marginTop: 16,
//     paddingHorizontal: 24,
//     paddingVertical: 12,
//     backgroundColor: "#3b82f6",
//     borderRadius: 8,
//   },
//   backButtonText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
// });
