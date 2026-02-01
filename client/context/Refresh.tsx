import { deleteToken, getRole, getToken } from "@/utils/secure-store";
import { useRouter } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ProfileContextType = {
  refresh: number;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  isAuth: boolean;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [refresh, setRefresh] = useState(0);
  const [isAuth, setIsAuth] = useState(false);
  const router = useRouter();

  const checkToken = async () => {
    try {
      const token = await getToken();

      if (!token) {
        setIsAuth(false);
        return;
      }

      const decoded = jwtDecode<{ exp: number; user_role: string }>(token);

      if (Date.now() >= decoded.exp * 1000) {
        await deleteToken();
        setIsAuth(false);
        router.replace("/(auth)/login");
        return;
      }

      setIsAuth(true);
      console.log("user role:", await getRole());
    } catch (err) {
      console.log("Token check error:", err);
      setIsAuth(false);
    }
  };

  // ❗ checkToken เฉพาะ refresh เท่านั้น (ไม่ผูก pathname)
  useEffect(() => {
    checkToken();
  }, [refresh]);

  // ❗ value ต้อง wrap ด้วย useMemo เพื่อไม่สร้าง object ใหม่ทุก render
  const value = useMemo(() => {
    return {
      refresh,
      setRefresh,
      isAuth,
    };
  }, [refresh, isAuth]);

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
};

export const useProfileContext = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfileContext must be used inside ProfileProvider");
  }
  return ctx;
};

// import { deleteToken, getRole, getToken } from "@/utils/secure-store";
// import { usePathname, useRouter } from "expo-router";
// import { jwtDecode } from "jwt-decode";
// import { createContext, useContext, useEffect, useState } from "react";

// type ProfileContextType = {
//   refresh: number;
//   setRefresh: React.Dispatch<React.SetStateAction<number>>;
//   isAuth: boolean;
// };

// const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// export const ProfileProvider = ({ children }: { children: React.ReactNode }) => {
//   const [refresh, setRefresh] = useState(0);
//   const [isAuth, setIsAuth] = useState(false);
//   const router = useRouter();
//   const pathname = usePathname();

//   const checkToken = async () => {
//     try {
//       const token = await getToken();

//       // ✅ ถ้าไม่มี token — แค่ set isAuth=false, ไม่ redirect ถ้าอยู่ในหน้า auth
//       if (!token) {
//         setIsAuth(false);
//         return;
//       }

//       // ✅ decode token
//       const { exp, user_role } = jwtDecode<{ exp: number; user_role: string }>(token);
//       // ✅ ถ้า token หมดอายุ
//       if (Date.now() >= exp * 1000) {
//         await deleteToken();
//         setIsAuth(false);

//         // ❗ redirect กลับ login เฉพาะถ้าไม่อยู่ในหน้า login/register
//         if (
//           !pathname.startsWith("/(auth)/login") &&
//           !pathname.startsWith("/(auth)/register")
//         ) {
//           router.replace("/(auth)/login");
//         }

//         return;
//       }

//       // ✅ token ยังไม่หมดอายุ
//       setIsAuth(true);

//       console.log("user role:", await getRole());
//     } catch (error) {
//       console.error("Token check error:", error);
//       setIsAuth(false);
//     }
//   };

//   useEffect(() => {
//     checkToken();
//   }, [refresh, pathname]);

//   return (
//     <ProfileContext.Provider value={{ refresh, setRefresh, isAuth }}>
//       {children}
//     </ProfileContext.Provider>
//   );
// };

// export const useProfileContext = () => {
//   const context = useContext(ProfileContext);
//   if (!context)
//     throw new Error("useProfileContext must be used inside ProfileProvider");
//   return context;
// };
