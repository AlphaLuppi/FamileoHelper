import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { PhotoTile } from "../components/PhotoTile";
import { PrimaryButton } from "../components/PrimaryButton";
import { ensurePermissions, listPhotosSince } from "../../services/photos/MediaLibraryService";
import { momentHash } from "../../domain/momentHash";
import type { Photo, PostProposal } from "../../domain/types";

const WEEKDAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function ManualPickerScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const nav = useNavigation<any>();

  useEffect(() => {
    (async () => {
      if (!(await ensurePermissions())) return;
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      setPhotos(await listPhotosSince(since));
    })();
  }, []);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else {
      if (next.size >= 4) {
        Alert.alert("Max 4 photos");
        return;
      }
      next.add(id);
    }
    setSelected(next);
  };

  const onContinue = () => {
    const chosen = photos.filter((p) => selected.has(p.id));
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
    <View className="flex-1 bg-white">
      <FlatList
        data={photos}
        keyExtractor={(p) => p.id}
        numColumns={3}
        contentContainerClassName="p-1"
        renderItem={({ item }) => {
          const isSel = selected.has(item.id);
          return (
            <Pressable onPress={() => toggle(item.id)} className="p-1">
              <View className={isSel ? "border-2 border-blue-600 rounded-xl" : ""}>
                <PhotoTile uri={item.uri} size={110} />
              </View>
            </Pressable>
          );
        }}
      />
      <View className="p-4">
        <PrimaryButton
          label={`Continuer (${selected.size})`}
          onPress={onContinue}
          disabled={selected.size === 0}
        />
      </View>
    </View>
  );
}
