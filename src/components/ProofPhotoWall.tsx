import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, type AppTheme, useTheme } from '@/theme';
import type { CompletionProof } from '@/types';
import { getProofImageUri } from '@/utils/reviewStats';

type ProofPhotoWallProps = {
  proofs: CompletionProof[];
  maxPhotos?: number;
};

export function ProofPhotoWall({ proofs, maxPhotos }: ProofPhotoWallProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const visibleProofs = typeof maxPhotos === 'number' ? proofs.slice(0, maxPhotos) : proofs;

  if (visibleProofs.length === 0) {
    return <Text style={styles.emptyText}>今天还没有还愿照片。</Text>;
  }

  return (
    <View style={styles.wall}>
      {visibleProofs.map((proof, index) => {
        const uri = getProofImageUri(proof);

        return uri ? (
          <View key={proof.id} style={[styles.frame, index === 0 ? styles.featuredFrame : undefined]}>
            <Image source={{ uri }} style={styles.image} />
          </View>
        ) : null;
      })}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wall: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    frame: {
      overflow: 'hidden',
      borderColor: theme.border,
      borderRadius: radius.medium,
      borderWidth: 1,
      backgroundColor: theme.surfaceAlt,
    },
    featuredFrame: {
      borderColor: theme.accent,
      borderWidth: 2,
    },
    image: {
      width: 78,
      height: 78,
      backgroundColor: theme.surfaceAlt,
    },
    emptyText: {
      ...typography.body,
      color: theme.textMuted,
      lineHeight: 22,
    },
  });
}
