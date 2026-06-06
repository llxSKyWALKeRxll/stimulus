import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Card, Icon, Text } from '@/components/ui';
import { FontSize, Fonts, Spacing } from '@/constants/theme';
import { listWorkoutTitles, updateWorkoutSession } from '@/lib/db/queries';
import { useTheme } from '@/lib/theme';

type Props = {
  sessionId: string;
  initialTitle: string | null;
  dateLabel: string;
};

export function WorkoutNameField({ sessionId, initialTitle, dateLabel }: Props) {
  const { c } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const lastSaved = useRef((initialTitle ?? '').trim());
  const [value, setValue] = useState(initialTitle ?? '');
  const [titles, setTitles] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    listWorkoutTitles().then(setTitles).catch(() => {});
  }, []);

  // Debounced autosave — no save-on-blur, so tapping a suggestion never races.
  useEffect(() => {
    const v = value;
    const handle = setTimeout(() => {
      if (v.trim() === lastSaved.current) return;
      lastSaved.current = v.trim();
      updateWorkoutSession(sessionId, { title: v.trim() || null }).catch(console.warn);
    }, 500);
    return () => clearTimeout(handle);
  }, [value, sessionId]);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return titles.filter((t) => t.toLowerCase().includes(q) && t.toLowerCase() !== q).slice(0, 5);
  }, [titles, value]);

  const choose = (s: string) => {
    setValue(s);
    inputRef.current?.blur();
  };

  return (
    <View>
      <Text variant="label" tone="tertiary">
        WORKOUT
      </Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={setValue}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Name this workout"
        placeholderTextColor={c.textTertiary}
        returnKeyType="done"
        style={{
          color: c.text,
          fontFamily: Fonts.serifBold,
          fontSize: FontSize['3xl'],
          paddingVertical: Spacing.one,
          marginTop: 2,
        }}
      />
      <Text variant="caption" tone="tertiary">
        {dateLabel}
      </Text>

      {focused && suggestions.length > 0 ? (
        <Card style={{ marginTop: Spacing.two, padding: 0, overflow: 'hidden' }}>
          {suggestions.map((s, i) => (
            <Pressable
              key={s}
              onPress={() => choose(s)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                paddingVertical: Spacing.three,
                paddingHorizontal: Spacing.four,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: c.border,
                backgroundColor: pressed ? c.backgroundInteractive : 'transparent',
              })}>
              <Icon name="time-outline" size={16} color={c.textTertiary} />
              <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                {s}
              </Text>
              <Icon name="arrow-up-outline" size={14} color={c.accent} />
            </Pressable>
          ))}
        </Card>
      ) : null}
    </View>
  );
}
