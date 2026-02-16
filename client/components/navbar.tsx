// components/navbar.tsx
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Box,
  HStack,
  Icon,
  IconButton,
  Text,
  useToast,
  View,
} from "native-base";
import React, { useEffect } from "react";

type AppBarProps = {
  onSave?: () => void;
  title: string;
};

export const AppBar = ({ onSave, title }: AppBarProps) => {
  const toast = useToast();
  const router = useRouter();

  return (
    <Box>
      <StatusBar backgroundColor="#3700B3" />
      <Box safeAreaTop bg="violet.600" />
      <HStack
        bg="violet.800"
        px="1"
        py="3"
        justifyContent="space-between"
        alignItems="center"
        w="100%"
      >
        <HStack alignItems="center">
          <IconButton
            icon={
              <Icon
                size="lg"
                as={MaterialIcons}
                name="arrow-back"
                color="white"
              />
            }
            accessibilityLabel="ย้อนกลับ"
            onPress={() => router.back()}
          />
          <Text color="white" fontSize="20" fontWeight="thin">
            {title}
          </Text>
        </HStack>
        <HStack alignItems="center">
          <IconButton
            icon={
              <Icon size="lg" as={MaterialIcons} name="check" color="white" />
            }
            accessibilityLabel="บันทึก"
            onPress={() => {
              onSave?.();
            }}
          />
        </HStack>
      </HStack>
    </Box>
  );
};

// components/navbar.tsx (เฉพาะ AppBarNoCheck)
export const AppBarNoCheck = ({
  title,
  onBackPress,
  backgroundColor = "violet.800",
}: {
  title: string;
  onBackPress?: () => void;
  backgroundColor?: string;
}) => {
  const router = useRouter();
  const handleBack = onBackPress ?? (() => router.back());

  return (
    <Box>
      <StatusBar backgroundColor={backgroundColor} />
      <Box safeAreaTop bg={backgroundColor} />
      <HStack
        bg={backgroundColor}
        px="1"
        py="3"
        justifyContent="flex-start"
        alignItems="center"
        w="100%"
      >
        <HStack alignItems="center">
          <IconButton
            icon={
              <Icon
                size="lg"
                as={MaterialIcons}
                name="arrow-back"
                color="white"
              />
            }
            accessibilityLabel="ย้อนกลับ"
            onPress={handleBack}
          />
          <Text color="white" fontSize="20" fontWeight="thin">
            {title}
          </Text>
        </HStack>
      </HStack>
    </Box>
  );
};

type AppBarMoreProps = {
  onClick?: () => void;
  title: string;
};

export const AppBarMore = ({ onClick, title }: AppBarMoreProps) => {
  const toast = useToast();
  const router = useRouter();

  return (
    <Box>
      <StatusBar backgroundColor="#3700B3" />
      <Box safeAreaTop bg="violet.600" />
      <HStack
        bg="violet.800"
        px="1"
        py="3"
        justifyContent="space-between"
        alignItems="center"
        w="100%"
      >
        <HStack alignItems="center">
          <IconButton
            icon={
              <Icon
                size="lg"
                as={MaterialIcons}
                name="arrow-back"
                color="white"
              />
            }
            accessibilityLabel="ย้อนกลับ"
            onPress={() => router.back()}
          />
          <Text color="white" fontSize="20" fontWeight="thin">
            {title}
          </Text>
        </HStack>
        <View alignItems="center">
          {/* <MoreVertMenu /> */}
        </View>
      </HStack>
    </Box>
  );
};

// components/home/HomeNavbar.tsx
import { Ionicons } from "@expo/vector-icons";
import { Input } from "native-base";
import { useCartStore } from "./cart/cart-memo";
import { IconWithBadge } from "./icon";
import { TextInput, TouchableOpacity, StyleSheet } from "react-native";

type HomeNavbarProps = {
  searchValue: string;
  onChangeSearch: (text: string) => void;
  onSubmitSearch?: () => void;
};

export const HomeNavbar: React.FC<HomeNavbarProps> = ({
  searchValue,
  onChangeSearch,
  onSubmitSearch,
}) => {
  const router = useRouter();
  const cartQuantity = useCartStore((state) => state.getTotalQuantity());
  const backgroundSync = useCartStore((state) => state.backgroundSync);

  useEffect(() => {
    backgroundSync();
  }, []);

  const handlePressCart = () => router.push("/(cart)/cart" as any);
  const handlePressFilter = () => router.push("/(customer)/search-filter" as any);
  
  // ฟังก์ชันสำหรับกดค้นหา
  const handleSearchSubmit = () => {
    if (onSubmitSearch) {
      onSubmitSearch();
    }
  };

  return (
    <Box bg="#7c3aed" pb={4} px={4} pt={10}>
      {/* ส่วนบน: ตะกร้าสินค้า */}
      <HStack justifyContent="flex-end" alignItems="center" mb={2}>
        <IconWithBadge
          count={cartQuantity}
          icon={<Ionicons name="cart-outline" size={25} color="#fff" />}
          onPress={handlePressCart}
          containerStyle={{ backgroundColor: "transparent", width: 40, height: 35 }}
        />
      </HStack>

      {/* ส่วนค้นหา */}
      <HStack space={2} alignItems="center">
        <View style={styles.searchSection}>
          {/* ทำให้ไอคอนค้นหากดได้ */}
          <TouchableOpacity 
            onPress={handleSearchSubmit}
            style={styles.searchIconButton}
            activeOpacity={0.6}
          >
            <Ionicons name="search-outline" size={20} color="#999" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="ค้นหาเสื้อผ้า"
            placeholderTextColor="#999"
            value={searchValue}
            onChangeText={onChangeSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            underlineColorAndroid="transparent"
          />
        </View>

        {/* ปุ่ม Filter */}
        <TouchableOpacity 
          onPress={handlePressFilter} 
          style={styles.filterButton}
        >
          <Ionicons name="options-outline" size={24} color="#7c3aed" />
        </TouchableOpacity>
      </HStack>
    </Box>
  );
};

// Stylesheet
const styles = StyleSheet.create({
  searchSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 99,
    height: 45,
    paddingHorizontal: 10,
  },
  searchIconButton: {
    padding: 5,
    marginRight: 3,
    marginLeft: 0,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#000',
    fontSize: 16,
    paddingVertical: 0,
  },
  filterButton: {
    backgroundColor: '#fff',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
  }
});