import { useRef, useState } from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { PhotoTile } from "../components/PhotoTile";
import { PrimaryButton } from "../components/PrimaryButton";
import { pickPhotosFromFiles } from "../../services/photos/MediaLibraryService.web";
import { registerPhotoFile } from "../../services/photos/photoRef.web";
import { momentHash } from "../../domain/momentHash";
import type { Photo, PostProposal } from "../../domain/types";

const WEEKDAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function ManualPickerScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nav = useNavigation<any>();

  const onPick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const picked = await pickPhotosFromFiles(files);
    for (const item of picked) {
      registerPhotoFile(item.photo.id, item.file);
    }
    setPhotos(picked.map((p) => p.photo));
    setSelected(new Set());
  };

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
      {/* Hidden file input piloté par le bouton ci-dessous */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => onPick(e.currentTarget.files)}
      />
      <View className="p-4">
        <PrimaryButton
          label={photos.length === 0 ? "Choisir des photos" : "Choisir d'autres photos"}
          onPress={() => inputRef.current?.click()}
        />
      </View>
      {photos.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-base text-neutral-700 text-center">
            Sélectionne des photos depuis ta photothèque (iCloud inclus sur iPhone/Mac).
          </Text>
        </View>
      ) : (
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
      )}
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
