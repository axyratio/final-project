// components/profile/order-card.tsx
import { Order, OrderItem } from "@/api/order";
import { formatDateTimeTH } from "@/utils/datetime";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Box,
  HStack,
  VStack,
  Text,
  Image,
  Pressable,
  Badge,
  Button,
  AlertDialog,
} from "native-base";
import React, { useRef, useState } from "react";

type OrderCardProps = {
  order: Order;
  onConfirmReceived?: (orderId: string) => void;
  onReorder?: (orderId: string) => void;
  onReview?: (orderId: string, productId: string) => void;
  onReturn?: (orderId: string) => void;
};

function OrderItemRow({ item }: { item: OrderItem }) {
  return (
    <HStack space={3} alignItems="center" mb={2}>
      <Box
        width="60px"
        height="60px"
        bg="coolGray.100"
        borderRadius={8}
        overflow="hidden"
      >
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            alt={item.product_name}
            width="100%"
            height="100%"
            resizeMode="cover"
          />
        ) : (
          <Box
            width="100%"
            height="100%"
            alignItems="center"
            justifyContent="center"
          >
            <Ionicons name="image-outline" size={24} color="#9ca3af" />
          </Box>
        )}
      </Box>

      <VStack flex={1}>
        <Text fontSize="sm" fontWeight="medium" numberOfLines={2}>
          {item.product_name}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {item.variant_name} × {item.quantity}
        </Text>
        <Text fontSize="sm" color="violet.600" fontWeight="bold">
          ฿{item.unit_price.toFixed(0)}
        </Text>
      </VStack>
    </HStack>
  );
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "UNPAID":
      return "error";
    case "PAID":
    case "PREPARING":
      return "warning";
    case "SHIPPED":
      return "info";
    case "DELIVERED":
      return "success";
    case "COMPLETED":
      return "success";
    case "RETURNING":
      return "muted";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "error";
    case "RETURNED":
      return "coolGray";
    case "CANCELLED":
      return "coolGray";
    case "FAILED":
      return "error";
    default:
      return "gray";
  }
}


const _OrderCard: React.FC<OrderCardProps> = ({
  order,
  onConfirmReceived,
  onReorder,
  onReview,
  onReturn,
}) => {
  const router = useRouter();
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const cancelRef = useRef(null);

  const handlePressOrder = () => {
    router.push(`/(profile)/order-detail?orderId=${order.order_id}` as any);
  };

  const handleConfirmReceived = () => {
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmReceivedConfirm = () => {
    setIsConfirmDialogOpen(false);
    onConfirmReceived?.(order.order_id);
  };

  return (
    <Box bg="white" borderRadius={12} p={4} mb={3} shadow={1}>
      {/* Header: Store Name + Status */}
      <HStack justifyContent="space-between" alignItems="center" mb={3}>
        <HStack alignItems="center" space={2} flex={1}>
          <Ionicons name="storefront-outline" size={16} color="#7c3aed" />
          <Text
            fontSize="sm"
            fontWeight="bold"
            color="gray.700"
            numberOfLines={1}
          >
            {order.store_name || "ร้านค้า"}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
        </HStack>
        <Badge
          colorScheme={getStatusBadgeColor(order.order_status)}
          variant="subtle"
          rounded="md"
        >
          {order.order_text_status}
        </Badge>
      </HStack>

      {/* Order Items */}
      <Pressable onPress={handlePressOrder}>
        <VStack space={2} mb={3}>
          {order.order_items.map((item) => (
            <OrderItemRow key={item.order_item_id} item={item} />
          ))}
        </VStack>
      </Pressable>

      {/* Tracking Info */}
      {order.tracking_number && (
        <HStack
          space={2}
          alignItems="center"
          bg="coolGray.50"
          p={2}
          borderRadius={8}
          mb={3}
        >
          <Ionicons name="cube-outline" size={16} color="#6b7280" />
          <Text fontSize="xs" color="gray.600" flex={1} numberOfLines={1}>
            เลขพัสดุ: {order.tracking_number}
          </Text>
          {order.courier_name && (
            <Text fontSize="xs" color="gray.500">
              ({order.courier_name})
            </Text>
          )}
        </HStack>
      )}

      <Box bg="coolGray.50" p={3} borderRadius={8} mb={3}>
  <VStack space={1}>
    <HStack justifyContent="space-between">
      <Text fontSize="xs" color="gray.600">ชำระเงิน</Text>
      <Text fontSize="xs" fontWeight="medium" color="gray.800">
        {formatDateTimeTH(order.paid_at)}
      </Text>
    </HStack>

    <HStack justifyContent="space-between">
      <Text fontSize="xs" color="gray.600">จัดส่งสำเร็จ</Text>
      <Text fontSize="xs" fontWeight="medium" color="gray.800">
        {formatDateTimeTH(order.delivered_at)}
      </Text>
    </HStack>

    <HStack justifyContent="space-between">
      <Text fontSize="xs" color="gray.600">ยืนยันรับสินค้า</Text>
      <Text fontSize="xs" fontWeight="medium" color="gray.800">
        {formatDateTimeTH(order.completed_at)}
      </Text>
    </HStack>
  </VStack>
</Box>

      {/* Total Price */}
      <HStack
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        pb={3}
        borderBottomWidth={1}
        borderBottomColor="coolGray.100"
      >
        <Text fontSize="sm" color="gray.600">
          ยอดรวมทั้งหมด
        </Text>
        <Text fontSize="lg" fontWeight="bold" color="violet.600">
          ฿{order.total_price.toFixed(0)}
        </Text>
      </HStack>


      {/* Action Buttons */}
      <HStack space={2} justifyContent="flex-end" flexWrap="wrap">
        {/* ✅ ปุ่มซื้ออีกครั้ง: แสดงเฉพาะหลังได้รับสินค้าแล้ว */}
        {order.order_status === "COMPLETED" && (
          <Button
            size="sm"
            variant="outline"
            colorScheme="violet"
            onPress={() => onReorder?.(order.order_id)}
            _text={{ fontSize: "xs" }}
          >
            ซื้ออีกครั้ง
          </Button>
        )}

        {/* ✅ ปุ่มคืนสินค้า: เฉพาะตอน DELIVERED (ก่อนยืนยันรับสินค้า) */}
        {order.order_status === "DELIVERED" && order.can_return && (
          <Button
            size="sm"
            variant="outline"
            colorScheme="orange"
            onPress={() => onReturn?.(order.order_id)}
            _text={{ fontSize: "xs" }}
          >
            คืนสินค้า
          </Button>
        )}

        {/* ✅ ปุ่มได้รับสินค้าแล้ว: เฉพาะตอน DELIVERED */}
        {order.order_status === "DELIVERED" && order.can_confirm_received && (
          <Button
            size="sm"
            colorScheme="violet"
            onPress={handleConfirmReceived}
            _text={{ fontSize: "xs" }}
          >
            ได้รับสินค้าแล้ว
          </Button>
        )}

        {/* ✅ ปุ่มให้คะแนน: แสดงเฉพาะหลังได้รับสินค้าแล้ว */}
        {order.order_status === "COMPLETED" && order.can_review && (
          <Button
            size="sm"
            colorScheme="violet"
            onPress={() => {
              const firstProduct = order.order_items[0];
              if (firstProduct) {
                onReview?.(order.order_id, firstProduct.product_id);
              }
            }}
            _text={{ fontSize: "xs" }}
          >
            ให้คะแนน
          </Button>
        )}
      </HStack>

      {/* Confirm Dialog */}
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isConfirmDialogOpen}
        onClose={() => setIsConfirmDialogOpen(false)}
      >
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>ยืนยันการรับสินค้า</AlertDialog.Header>
          <AlertDialog.Body>
            คุณแน่ใจหรือไม่ว่าได้รับสินค้าแล้ว?{"\n"}
            หลังจากยืนยันแล้วจะไม่สามารถคืนสินค้าได้
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button.Group space={2}>
              <Button
                variant="unstyled"
                colorScheme="coolGray"
                onPress={() => setIsConfirmDialogOpen(false)}
                ref={cancelRef}
              >
                ยกเลิก
              </Button>
              <Button
                colorScheme="violet"
                onPress={handleConfirmReceivedConfirm}
              >
                ยืนยัน
              </Button>
            </Button.Group>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </Box>
  );
};

export const OrderCard = React.memo(_OrderCard);
