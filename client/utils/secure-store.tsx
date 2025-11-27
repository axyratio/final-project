import * as SecureStore from 'expo-secure-store';

export async function saveToken(token: string) {
  await SecureStore.setItemAsync('access-token', token);

}

export async function getToken() {
  
  const token = await SecureStore.getItemAsync('access-token');
  // console.log(token)
  return token;
}

export async function deleteToken() {
  await SecureStore.deleteItemAsync('access-token');
  console.log("token deleted");
}

// =============

export async function saveRole(role: string) {
  await SecureStore.setItemAsync("user-role", role);
  console.log("Role saved:", role);
}

export async function getRole() {
  const role = await SecureStore.getItemAsync("user-role");
  // console.log("Current role:", role);
  return role;
}

export async function deleteRole() {
  await SecureStore.deleteItemAsync("user-role");
  console.log("Role deleted");
}