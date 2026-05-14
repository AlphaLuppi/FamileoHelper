import { useEffect, useState } from "react";
import { View, Text, TextInput, Alert, ScrollView, Pressable } from "react-native";
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
import { photoToPhotoRef } from "../../services/photos/photoRef";
import { formatDateFr, capitalize } from "../theme/format";
import type { PostProposal, Pad } from "../../domain/types";

const MAX_CHARS = 500;

export function PostFlowScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const proposal: PostProposal = route.params!.proposal;
  const { bearer, backendUrl } = useAppStore();
  const [text, setText] = useState(proposal.draftText ?? "");
  const [pads, setPads] = useState<Pad[]>([]);
  const [padId, setPadId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dictating, setDictating] = useState(false);

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
    setDictating(true);
    try {
      const t = await transcribeOnce();
      if (!t) return;
      if (!bearer || !backendUrl) return;
      const backend = new BackendClient({ baseUrl: backendUrl, bearer });
      const polished = await backend.reformulate(t).catch(() => t);
      setText(polished);
    } catch (e) {
      Alert.alert("Dictée", (e as Error).message);
    } finally {
      setDictating(false);
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
        photos: proposal.photos.map((p, i) => photoToPhotoRef(p, i)),
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

  const canSend = !busy && !!padId && text.trim().length > 0;
  const charCount = text.length;
  const over = charCount > MAX_CHARS;

  return (
    <View className="flex-1 bg-canvas">
      <View className="px-5 pt-4 pb-3 border-b border-stone-200 bg-white flex-row items-center justify-between">
        <Pressable
          onPress={() => nav.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          className="px-2 py-1 -ml-2 active:opacity-60"
        >
          <Text className="text-base text-stone-600">Annuler</Text>
        </Pressable>
        <Text className="text-base font-semibold text-stone-900">Nouveau post</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="p-5 gap-5 pb-32"
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-1">
            Moment
          </Text>
          <Text className="text-lg font-semibold text-stone-900">
            {capitalize(proposal.weekday)} {formatDateFr(proposal.date)}
          </Text>
          {proposal.city ? (
            <Text className="text-sm text-stone-500 mt-0.5">{proposal.city}</Text>
          ) : null}
        </View>

        <View className="flex-row flex-wrap gap-2">
          {proposal.photos.map((p) => (
            <PhotoTile key={p.id} uri={p.uri} size={88} />
          ))}
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs uppercase tracking-wide text-stone-500 font-medium">Texte</Text>
            <Text className={`text-xs ${over ? "text-red-600" : "text-stone-400"}`}>
              {charCount} / {MAX_CHARS}
            </Text>
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            className={`bg-white border rounded-2xl p-4 min-h-32 text-base text-stone-900 ${
              over ? "border-red-400" : "border-stone-200"
            }`}
            placeholder="Raconte ce moment en quelques mots…"
            placeholderTextColor="#a8a29e"
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <PrimaryButton
                label={dictating ? "Écoute…" : "Dicter"}
                onPress={onDictate}
                loading={dictating}
                variant="secondary"
              />
            </View>
            {text.length > 0 ? (
              <View className="flex-1">
                <PrimaryButton label="Effacer" onPress={() => setText("")} variant="ghost" />
              </View>
            ) : null}
          </View>
        </View>

        <View className="gap-2">
          <Text className="text-xs uppercase tracking-wide text-stone-500 font-medium">
            Destinataire
          </Text>
          <PadPicker pads={pads} selectedId={padId} onSelect={setPadId} />
        </View>
      </ScrollView>

      <View className="absolute left-0 right-0 bottom-0 bg-white/95 border-t border-stone-200 px-4 pt-3 pb-6">
        <PrimaryButton
          label={busy ? "Envoi en cours…" : "Envoyer"}
          onPress={onSend}
          disabled={!canSend || over}
          loading={busy}
        />
      </View>
    </View>
  );
}
