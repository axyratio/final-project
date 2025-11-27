import { AppBar } from "@/components/navbar";
import { useProfileContext } from "@/context/Refresh";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import axios from "axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Box } from "native-base";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Profile } from "./me";


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




    const handleSubmit = async (fieldKey: string, initialValue: string) => {
        // ถ้ามี returnPath, ให้กลับไปที่ path นั้นพร้อมข้อมูลที่อัปเดต
        if (params.returnPath) {
            const returnParams = params.returnParams ? JSON.parse(params.returnParams) : {};
            router.replace({
                pathname: params.returnPath as any,
                params: {
                    ...returnParams,
                    updatedField: fieldKey,
                    updatedValue: value,
                },
            });
            return;
        }
        console.log(fieldKey, initialValue, "fieldKey")

        try {

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
        }
    };

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
                    style={{ borderWidth: 1, borderColor: "#ccc", padding: 8, borderRadius: 4, marginBottom: 16 }}
                    value={value}
                    onChangeText={setValue}
                />
                {error ? <Text style={{ color: "red", marginBottom: 8 }}>{error}</Text> : null}
            </Box>
        </View>
    );
}
