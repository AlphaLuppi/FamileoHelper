import { View, Text, ScrollView } from "react-native";
import { PhotoTile } from "./PhotoTile";
import { PrimaryButton } from "./PrimaryButton";
import type { PostProposal } from "../../domain/types";

export function ProposalCard({
  proposal,
  onReject,
  onContinue,
}: {
  proposal: PostProposal;
  onReject: () => void;
  onContinue: () => void;
}) {
  return (
    <View className="rounded-3xl bg-white p-4 gap-3 shadow">
      <Text className="text-lg font-semibold">
        {proposal.weekday} {proposal.date}
        {proposal.city ? ` · ${proposal.city}` : ""}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
        {proposal.photos.map((p) => (
          <View key={p.id} className="mr-2">
            <PhotoTile uri={p.uri} size={120} />
          </View>
        ))}
      </ScrollView>
      <Text className="text-base text-neutral-700">{proposal.draftText ?? "Génération du texte…"}</Text>
      <View className="flex-row gap-3 mt-2">
        <View className="flex-1">
          <PrimaryButton label="Pas cette fois" onPress={onReject} />
        </View>
        <View className="flex-1">
          <PrimaryButton label="Continuer" onPress={onContinue} />
        </View>
      </View>
    </View>
  );
}
