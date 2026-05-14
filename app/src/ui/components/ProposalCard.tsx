import { View, Text, ScrollView } from "react-native";
import { PhotoTile } from "./PhotoTile";
import { PrimaryButton } from "./PrimaryButton";
import { formatDateFr, capitalize } from "../theme/format";
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
  const photoCount = proposal.photos.length;
  return (
    <View
      className="rounded-3xl bg-white p-5 gap-4 border border-stone-200"
      style={{
        shadowColor: "#1c1917",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-stone-900">
            {capitalize(proposal.weekday)} {formatDateFr(proposal.date)}
          </Text>
          {proposal.city ? (
            <Text className="text-sm text-stone-500 mt-0.5">{proposal.city}</Text>
          ) : null}
        </View>
        <View className="rounded-full bg-stone-100 px-3 py-1">
          <Text className="text-xs font-medium text-stone-600">
            {photoCount} {photoCount > 1 ? "photos" : "photo"}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {proposal.photos.map((p) => (
            <PhotoTile key={p.id} uri={p.uri} size={120} />
          ))}
        </View>
      </ScrollView>

      {proposal.draftText ? (
        <Text className="text-base text-stone-700 leading-6">{proposal.draftText}</Text>
      ) : (
        <View className="gap-2">
          <View className="h-3 rounded-full bg-stone-100" />
          <View className="h-3 rounded-full bg-stone-100 w-4/5" />
        </View>
      )}

      <View className="flex-row gap-3 mt-1">
        <View className="flex-1">
          <PrimaryButton label="Pas cette fois" onPress={onReject} variant="ghost" />
        </View>
        <View className="flex-1">
          <PrimaryButton label="Continuer" onPress={onContinue} />
        </View>
      </View>
    </View>
  );
}
