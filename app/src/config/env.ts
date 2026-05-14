import Constants from "expo-constants";
import { z } from "zod";

const schema = z.object({
  backendUrl: z.string().url(),
  backendTokenStorageKey: z.string().min(1),
});

export type AppEnv = z.infer<typeof schema>;

export function getEnv(raw: unknown = Constants.expoConfig?.extra): AppEnv {
  return schema.parse(raw);
}
