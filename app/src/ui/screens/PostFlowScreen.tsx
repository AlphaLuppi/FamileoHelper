import { useEffect, useState } from "react";
import { View, Text, TextInput, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { PrimaryButton } from "../components/PrimaryButton";
import { PhotoTile } from "../components/PhotoTile";
import { PadPicker } from "../components/PadPicker";
import { useAppStore } from "../../state/store";
import { BackendClient } from "../../services/backend/BackendClient";
import { setDecision } from "../../state/momentDecisionsRepo";
import { upsertPads, listCachedPads, markPadUsed, getDefaultPadId } from "../../state/padsCacheRepo";
import { setLastPostAt } from "../../state/appStateRepo";
import { transcribeOnce } from "../../services/speech/SpeechService";
import type { PostProposal, Pad } from "../../domain/types";

export function PostFlowScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const proposal: PostProposal = route.params!.proposal;
  const { bearer, backendUrl } = useAppStore();
  const [text, setText] = useState(proposal.draftText ?? "");
  const [pads, setPads] = useState<Pad[]>([]);
  const [padId, setPadId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!bearer || !backendUrl) return;
      const backend = new BackendClient({ baseUrl: backendUrl, bearer });
      const remote = await backend.listPads().catch(() => null);
      if (remote) {
        await upsertPads(remote);
      }
      const cached = await listCachedPads();
      setPads(cached);
      setPadId((await getDefaultPadId()) ?? cached[0]?.id ?? null);
    })();
  }, [bearer, backendUrl]);

  const onDictate = async () => {
    try {
      const t = await transcribeOnce();
      if (!t) return;
      if (!bearer || !backendUrl) return;
      const backend = new BackendClient({ baseUrl: backendUrl, bearer });
      const polished = await backend.reformulate(t).catch(() => t);
      setText(polished);
    } catch (e) {
      Alert.alert("Dictée", (e as Error).message);
    }
  };

  const onSend = async () => {
    if (!bearer || !backendUrl || !padId) return;
    setBusy(true);
    try {
      const backend = new BackendClient({ baseUrl: backendUrl, bearer });
      await backend.createPost({
        padId,
        text,
        photos: proposal.photos.map((p, i) => ({
          uri: p.uri,
          filename: `photo_${i}.jpg`,
          mimeType: "image/jpeg",
        })),
      });
      await setDecision(proposal.momentHash, "posted");
      await markPadUsed(padId);
      const latest = proposal.photos
        .map((p) => p.createdAt)
        .sort()
        .at(-1)!;
      await setLastPostAt(latest);
      nav.goBack();
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="p-4 gap-4">
      <Text className="text-lg font-semibold">
        {proposal.weekday} {proposal.date}
        {proposal.city ? ` · ${proposal.city}` : ""}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {proposal.photos.map((p) => (
          <PhotoTile key={p.id} uri={p.uri} size={90} />
        ))}
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        className="border border-neutral-300 rounded-xl p-3 min-h-32 text-base"
        placeholder="Texte du post"
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <PrimaryButton label="🎤 Dicter" onPress={onDictate} />
        </View>
      </View>
      <Text className="text-base font-semibold mt-2">Destinataire</Text>
      <PadPicker pads={pads} selectedId={padId} onSelect={setPadId} />
      <View className="mt-4">
        {busy ? <ActivityIndicator /> : null}
        <PrimaryButton label="Envoyer" onPress={onSend} disabled={busy || !padId || text.trim().length === 0} />
      </View>
    </ScrollView>
  );
}
