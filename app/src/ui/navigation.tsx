import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PropositionsScreen } from "./screens/PropositionsScreen";
import { ManualPickerScreen } from "./screens/ManualPickerScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { AuthFlowScreen } from "./screens/AuthFlowScreen";
import { ConnectFamileoScreen } from "./screens/ConnectFamileoScreen";
import { PostFlowScreen } from "./screens/PostFlowScreen";

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tabs.Navigator>
      <Tabs.Screen name="Propositions" component={PropositionsScreen} />
      <Tabs.Screen name="Manuel" component={ManualPickerScreen} />
      <Tabs.Screen name="Réglages" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

export type RootStage = "auth" | "connectFamileo" | "main";

export function RootNavigator({ stage }: { stage: RootStage }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {stage === "auth" ? (
        <Stack.Screen name="Auth" component={AuthFlowScreen} />
      ) : stage === "connectFamileo" ? (
        <Stack.Screen name="ConnectFamileo" component={ConnectFamileoScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="PostFlow"
            component={PostFlowScreen}
            options={{ presentation: "modal" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
