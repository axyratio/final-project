import { AppBar } from "@/components/navbar";
import { useProfileContext } from "@/context/Refresh";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Box } from "native-base";
import { useState } from "react";
import { Text, TextInput, View, Alert } from "react-native";
import { Profile } from "./me";
import { updateStore } from "@/api/store";


export default function EditForm() {
    const { setRefresh } = useProfileContext();
    const router = useRouter();
    const params = useLocalSearchParams<{
        key: keyof Profile | string;
        value: string;
        title?: string;
        returnPath?: string;
        returnParams?: string;
    }>();
    const fieldKey = params.key;
    const initialValue = params.value;
    const titleMap: Record<keyof Profile, string> = {
        username: "ชื่อผู้ใช้",
        first_name: "ชื่อ",
        last_name: "นามสกุล",
        email: "อีเมล",
        phone_number: "โทรศัพท์",
        birth_date: "วันเกิด",
    };

    const title = params.title || (fieldKey ? titleMap[fieldKey as keyof Profile] : "แก้ไขข้อมูล");

    const [value, setValue] = useState(initialValue);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (fieldKey: string, initialValue: string) => {
        // ตรวจสอบว่าเป็นการแก้ไขร้านค้าหรือไม่
        const isStoreEdit = params.returnPath?.includes("store");

        if (isStoreEdit) {
            // แก้ไขข้อมูลร้านค้า
            try {
                setSaving(true);
                const returnParams = params.returnParams ? JSON.parse(params.returnParams) : {};
                
                const response = await updateStore(returnParams.storeId, {
                    [fieldKey]: value,
                });

                if (response.success) {
                    Alert.alert("สำเร็จ", "บันทึกข้อมูลเรียบร้อย", [
                        {
                            text: "ตกลง",
                            onPress: () => {
                                // ✅ แก้ไข: ใช้ router.push แทน router.replace
                                router.push({
                                    pathname: params.returnPath as any,
                                    params: {
                                        ...returnParams,
                                        updatedField: fieldKey,
                                        updatedValue: value,
                                    },
                                });
                            },
                        },
                    ]);
                } else {
                    Alert.alert("ข้อผิดพลาด", response.message || "ไม่สามารถบันทึกได้");
                }
            } catch (error) {
                console.error("Error updating store:", error);
                Alert.alert("ข้อผิดพลาด", "เกิดข้อผิดพลาดในการบันทึก");
            } finally {
                setSaving(false);
            }
            return;
        }

        // แก้ไขโปรไฟล์ (ตามเดิม)
        if (params.returnPath) {
            const returnParams = params.returnParams ? JSON.parse(params.returnParams) : {};
            // ✅ แก้ไข: ใช้ router.push แทน router.replace
            router.push({
                pathname: params.returnPath as any,
                params: {
                    ...returnParams,
                    updatedField: fieldKey,
                    updatedValue: value,
                },
            });
            return;
        }

        try {
            setSaving(true);
            const token = await getToken();
            const res = await axios.patch(`${DOMAIN}/profile/change`, {
                [fieldKey]: value
            } as any, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setRefresh(prev => prev + 1);

            if (!res.data.success) {
                setError(res.data.message || "Something went wrong");
                router.back();
                return;
            }
            console.log("Saved:", res.data);
            router.back();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    // ตรวจสอบว่าเป็นการแก้ไขคำอธิบายหรือที่อยู่หรือไม่ (ควรเป็น multiline)
    const isMultiline = fieldKey === "description" || fieldKey === "address";

    return (
        <View style={{}}>
            <AppBar
                title={title}
                onSave={async () => {
                    if (fieldKey && initialValue) await handleSubmit(fieldKey as string, initialValue);
                }}
            />
            <Box style={{ padding: 16 }}>
                <Text style={{ marginBottom: 8 }}>{title}</Text>
                <TextInput
                    style={{
                        borderWidth: 1,
                        borderColor: "#ccc",
                        padding: 8,
                        borderRadius: 4,
                        marginBottom: 16,
                        minHeight: isMultiline ? 100 : 40,
                        textAlignVertical: isMultiline ? "top" : "center",
                    }}
                    value={value}
                    onChangeText={setValue}
                    multiline={isMultiline}
                    numberOfLines={isMultiline ? 4 : 1}
                    editable={!saving}
                />
                {error ? <Text style={{ color: "red", marginBottom: 8 }}>{error}</Text> : null}
            </Box>
        </View>
    );
}