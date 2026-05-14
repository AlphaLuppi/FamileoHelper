import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PropositionsScreen } from "./screens/PropositionsScreen";
import { ManualPickerScreen } from "./screens/ManualPickerScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
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

export function RootNavigator({ needsOnboarding }: { needsOnboarding: boolean }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {needsOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : null}
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="PostFlow" component={PostFlowScreen} options={{ presentation: "modal" }} />
    </Stack.Navigator>
  );
}
