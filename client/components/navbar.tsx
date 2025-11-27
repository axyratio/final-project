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
import React from "react";

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
import { IconWithBadge } from "./icon";

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

  const handlePressCart = () => {
    // ไปหน้า cart
    router.push("/(customer)/cart" as any);
  };

  const handlePressFilter = () => {
    // ไปหน้า filter / search advance ก็ได้
    router.push("/(customer)/search-filter" as any);
  };

  return (
    <Box bg="#7c3aed" pb={4} px={4} pt={8}>
      <HStack justifyContent="space-between" alignItems="center" my={1} mt={2}>
        <Box flex={1} />
        <IconWithBadge
  count={5}
  icon={<Ionicons name="cart-outline" size={25} color="#fff" />}
  onPress={handlePressCart}
  containerStyle={{ backgroundColor: "transparent", width: 40, height: 35 }}
/>

      </HStack>

      <HStack space={2} alignItems="center">
        <Input
          flex={1}
          bg="white"
          borderRadius={999}
          placeholder="ค้นหาเสื้อผ้า"
          value={searchValue}
          onChangeText={onChangeSearch}
          onSubmitEditing={onSubmitSearch}
          InputLeftElement={
            <Icon
              as={Ionicons}
              name="search-outline"
              size="sm"
              ml={3}
              color="gray.400"
            />
          }
          _focus={{ bg: "white" }}
        />

        <IconButton
          bg="white"
          borderRadius={999}
          onPress={handlePressFilter}
          icon={
            <Icon
              as={Ionicons}
              name="options-outline"
              size="md"
              color="#7c3aed"
            />
          }
        />
      </HStack>
    </Box>
  );
};
