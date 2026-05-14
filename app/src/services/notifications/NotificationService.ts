import * as Notifications from "expo-notifications";

export async function ensureNotificationPermissions(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function scheduleGazetteReminder(closesAtIso: string): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const fireAt = new Date(new Date(closesAtIso).getTime() - 3 * 24 * 60 * 60 * 1000);
  if (fireAt.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Gazette Famileo",
      body: "La gazette ferme dans 3 jours — pense à poster.",
    },
    trigger: { type: "date", date: fireAt } as Notifications.DateTriggerInput,
  });
}
