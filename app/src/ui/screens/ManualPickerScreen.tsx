import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { PhotoTile } from "../components/PhotoTile";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { ensurePermissions, listPhotosSince } from "../../services/photos/MediaLibraryService";
import { momentHash } from "../../domain/momentHash";
import type { Photo, PostProposal } from "../../domain/types";

const WEEKDAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function ManualPickerScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const nav = useNavigation<any>();

  useEffect(() => {
    (async () => {
      if (!(await ensurePermissions())) return;
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      setPhotos(await listPhotosSince(since));
    })();
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) {
        Alert.alert("Maximum atteint", "Tu peux sélectionner jusqu'à 4 photos par post.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const onContinue = () => {
    const chosen = selected
      .map((id) => photos.find((p) => p.id === id))
      .filter((p): p is Photo => !!p);
    if (chosen.length === 0) return;
    const date = new Date(chosen[0]!.createdAt);
    const proposal: PostProposal = {
      momentHash: momentHash(chosen.map((p) => p.id)),
      photos: chosen,
      date: date.toISOString().slice(0, 10),
      weekday: WEEKDAYS_FR[date.getUTCDay()]!,
    };
    nav.navigate("PostFlow", { proposal });
  };

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader title="Choisir des photos" subtitle="Jusqu'à 4 photos par moment" />
      {photos.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-sm text-stone-500 text-center">
            Aucune photo récente trouvée dans ta photothèque.
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(p) => p.id}
          numColumns={3}
          contentContainerClassName="p-2 pb-32"
          renderItem={({ item }) => {
            const selIndex = selected.indexOf(item.id);
            const isSel = selIndex >= 0;
            return (
              <Pressable
                onPress={() => toggle(item.id)}
                className="p-1"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSel }}
              >
                <PhotoTile uri={item.uri} size={110} selected={isSel} index={isSel ? selIndex : undefined} />
              </Pressable>
            );
          }}
        />
      )}
      <View
        className="absolute left-0 right-0 bottom-0 bg-white/95 border-t border-stone-200 px-4 pt-3 pb-6"
      >
        <PrimaryButton
          label={
            selected.length === 0
              ? "Sélectionne au moins une photo"
              : `Continuer · ${selected.length} photo${selected.length > 1 ? "s" : ""}`
          }
          onPress={onContinue}
          disabled={selected.length === 0}
        />
      </View>
    </View>
  );
}
