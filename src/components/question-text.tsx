import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

// Image that sizes itself to its natural aspect ratio once loaded (exam figures vary a lot).
export function AutoImage({ uri, maxHeight = 360 }: { uri: string; maxHeight?: number }) {
  const [ratio, setRatio] = useState(4 / 3);
  return (
    <Image
      source={{ uri }}
      contentFit="contain"
      onLoad={(e) => e.source.width && e.source.height && setRatio(e.source.width / e.source.height)}
      style={{ width: '100%', aspectRatio: ratio, maxHeight, backgroundColor: '#FFFFFF', borderRadius: 8 }}
      accessibilityLabel="Figura da questão"
    />
  );
}

const IMAGE = /!\[[^\]]*\]\(([^)]+)\)/g;

// Inline **bold** and _italic_; the API's Markdown uses little else.
function Inline({ text, style }: { text: string; style?: object }) {
  // `\b_` / `_\b` keep snake_case words and URLs from turning italic.
  const parts = text.split(/(\*\*[^*]+\*\*|\b_[^_\n]+_\b)/g).filter(Boolean);
  return (
    <Text style={[styles.text, style]}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} style={styles.bold}>
            {p.slice(2, -2)}
          </Text>
        ) : p.startsWith('_') && p.endsWith('_') && p.length > 2 ? (
          <Text key={i} style={styles.italic}>
            {p.slice(1, -1)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

// Renders an ENEM question's Markdown: paragraphs, emphasis and figures.
export function QuestionText({ md, style }: { md: string; style?: object }) {
  const blocks = md
    .replace(/\\\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block, i) => {
        const images = [...block.matchAll(IMAGE)].map((m) => m[1]);
        const text = block.replace(IMAGE, '').replace(/ {2,}\n/g, '\n').trim();
        return (
          <View key={i} style={{ gap: 8 }}>
            {text ? <Inline text={text} style={style} /> : null}
            {images.map((uri) => (
              <AutoImage key={uri} uri={uri} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  bold: { fontFamily: fonts.bold },
  italic: { fontStyle: 'italic' },
});
