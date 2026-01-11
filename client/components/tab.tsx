// components/tab/index.tsx
import { Box, Pressable, Text } from "native-base";
import React, { useState } from "react";

type MyTabsProps = {
  productContent: React.ReactNode;   // เนื้อหาของแท็บ "รายการสินค้า"
  categoryContent: React.ReactNode;  // เนื้อหาของแท็บ "หมวดหมู่"
  initialTab?: "products" | "categories";
};

export default function MyTabs({
  productContent,
  categoryContent,
  initialTab = "products",
}: MyTabsProps) {
  const [tab, setTab] = useState<"products" | "categories">(initialTab);

  return (
    <Box flex={1}>
      {/* Tabs bar */}
      <Box flexDirection="row" bg="white" shadow={2}>
        <Pressable
          flex={1}
          p={3}
          onPress={() => setTab("products")}
          style={{ alignItems: "center" }}
        >
          <Text
            color={tab === "products" ? "violet.600" : "gray.500"}
            fontWeight={tab === "products" ? "bold" : "normal"}
          >
            รายการสินค้า
          </Text>
          {tab === "products" && (
            <Box height="2px" bg="violet.600" width="50%" mt={2} />
          )}
        </Pressable>

        <Pressable
          flex={1}
          p={3}
          onPress={() => setTab("categories")}
          style={{ alignItems: "center" }}
        >
          <Text
            color={tab === "categories" ? "violet.600" : "gray.500"}
            fontWeight={tab === "categories" ? "bold" : "normal"}
          >
            หมวดหมู่
          </Text>
          {tab === "categories" && (
            <Box height="2px" bg="violet.600" width="50%" mt={2} />
          )}
        </Pressable>
      </Box>

      {/* Content */}
      <Box flex={1} p={4}>
        {tab === "products" ? productContent : categoryContent}
      </Box>
    </Box>
  );
}
