import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAppStore } from "../../state/store";
import { ensurePermissions, listPhotosSince } from "../../services/photos/MediaLibraryService";
import { reverseGeocode } from "../../services/geo/GeocodingService";
import { buildProposals } from "../../domain/proposal";
import { getLastPostAt } from "../../state/appStateRepo";
import { getDecision } from "../../state/momentDecisionsRepo";
import { BackendClient } from "../../services/backend/BackendClient";
import { ProposalCard } from "../components/ProposalCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import type { PostProposal } from "../../domain/types";

const DEFAULT_LOOKBACK_DAYS = 30;

export function PropositionsScreen() {
  const { bearer, backendUrl, proposals, setProposals } = useAppStore();
  const [loading, setLoading] = useState(false);
  const nav = useNavigation<any>();

  const refresh = useCallback(async () => {
    if (!bearer || !backendUrl) return;
    setLoading(true);
    try {
      const ok = await ensurePermissions();
      if (!ok) {
        Alert.alert("Permissions", "Accès aux photos refusé.");
        return;
      }
      const fallback = new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 3600 * 1000).toISOString();
      const since = await getLastPostAt(fallback);
      const photos = await listPhotosSince(since);
      const drafts = buildProposals(photos);

      const fresh: PostProposal[] = [];
      for (const d of drafts) {
        if (await getDecision(d.momentHash)) continue;
        const first = d.photos[0];
        if (first?.location) {
          d.city = await reverseGeocode(first.location);
        }
        fresh.push(d);
      }

      const backend = new BackendClient({ baseUrl: backendUrl, bearer });
      await Promise.all(
        fresh.slice(0, 8).map(async (p) => {
          try {
            p.draftText = await backend.generateCaption({
              date: p.date,
              city: p.city,
              photoCount: p.photos.length,
              weekday: p.weekday,
            });
          } catch {
            p.draftText = `Petit moment partagé ${p.weekday}${p.city ? ` à ${p.city}` : ""}.`;
          }
        }),
      );

      setProposals(fresh);
    } finally {
      setLoading(false);
    }
  }, [bearer, backendUrl, setProposals]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading && proposals.length === 0) {
    return (
      <View className="flex-1 bg-canvas">
        <ScreenHeader title="Suggestions" subtitle="On analyse tes dernières photos…" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#cf4321" />
          <Text className="text-sm text-stone-500 mt-3">Lecture de ta photothèque</Text>
        </View>
      </View>
    );
  }

  if (proposals.length === 0) {
    return (
      <View className="flex-1 bg-canvas">
        <ScreenHeader title="Suggestions" />
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <View className="w-16 h-16 rounded-full bg-brand-50 items-center justify-center">
            <Text className="text-3xl">✨</Text>
          </View>
          <Text className="text-base text-stone-700 text-center font-medium">
            Tout est à jour
          </Text>
          <Text className="text-sm text-stone-500 text-center">
            Rien de neuf depuis ton dernier post. Reviens après une sortie ou un moment en famille.
          </Text>
          <View className="mt-2">
            <PrimaryButton label="Actualiser" onPress={refresh} variant="secondary" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader
        title="Suggestions"
        subtitle={`${proposals.length} moment${proposals.length > 1 ? "s" : ""} à partager`}
      />
      <ScrollView
        contentContainerClassName="px-4 pb-8 gap-4"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#cf4321" />}
      >
        {proposals.map((p) => (
          <ProposalCard
            key={p.momentHash}
            proposal={p}
            onReject={async () => {
              const { setDecision } = await import("../../state/momentDecisionsRepo");
              await setDecision(p.momentHash, "rejected");
              setProposals(proposals.filter((x) => x.momentHash !== p.momentHash));
            }}
            onContinue={() => nav.navigate("PostFlow", { proposal: p })}
          />
        ))}
      </ScrollView>
    </View>
  );
}
