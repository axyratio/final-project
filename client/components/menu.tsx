// import React, { useState } from "react";
// import { View } from "react-native";
// import { IconButton, Menu } from "react-native-paper";

// export default function MoreVertMenu() {
//   const [visible, setVisible] = useState(false);
//   console.log(visible)

//   return (
//     <View style={{ position: "absolute", right: 0 }}>
//       <Menu
//         visible={visible}
//         onDismiss={() => setVisible(false)}
//         anchor={
//           <IconButton
//             icon="dots-vertical"
//             size={24}
//             onPress={() => setVisible(true)}
//           />
//         }
//       >
//         <Menu.Item title="Arial" onPress={() => setVisible(false)} />
//         <Menu.Item title="Nunito Sans" onPress={() => setVisible(false)} />
//         <Menu.Item title="Roboto" onPress={() => setVisible(false)} />
//       </Menu>
//     </View>
//   );
// }
