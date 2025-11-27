// import { useRouter } from "expo-router";
// import { JSX, useEffect, useState } from "react";
// import { ActivityIndicator, View } from "react-native";
// import { useAuth } from "../context/AuthContext";

// export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
//   const { isLoggedIn, checkAuth } = useAuth();
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();

//   useEffect(() => {
//     const verify = async () => {
//       await checkAuth();
//       setLoading(false);
//     };
//     verify();
//   }, []);

//   if (loading) {
//     return (
//       <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   if (!isLoggedIn) {
//     router.replace("/"); // redirect ไปหน้า register/login
//     return null;
//   }

//   return children;
// };
