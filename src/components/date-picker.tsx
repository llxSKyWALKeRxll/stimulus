import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isFuture,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useMemo, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Icon, Text } from '@/components/ui';
import { FontWeight, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/lib/theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CELL = (Dimensions.get('window').width - Spacing.four * 2) / 7;

/** Format a Date as a local `yyyy-MM-dd` key (matches body_weights.recorded_on). */
export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const parseDayKey = (key: string) => new Date(`${key}T00:00:00`);

type Props = {
  visible: boolean;
  /** Currently selected day as `yyyy-MM-dd`. */
  value: string;
  /** Days (yyyy-MM-dd) that already have an entry — shown with a dot. */
  marked?: Set<string>;
  onClose: () => void;
  onSelect: (dayKey: string) => void;
};

export function DatePicker({ visible, value, marked, onClose, onSelect }: Props) {
  const { c } = useTheme();
  const selected = useMemo(() => parseDayKey(value), [value]);
  const [month, setMonth] = useState(() => startOfMonth(selected));
  const today = new Date();

  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const nextDisabled = isSameMonth(month, today) || isFuture(startOfMonth(addMonths(month, 1)));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.background }}>
          <View style={{ flex: 1, paddingHorizontal: Spacing.four }}>
            <View style={styles.head}>
              <Text variant="heading">Pick a date</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text variant="bodySmall" tone="secondary" weight="semibold">
                  Cancel
                </Text>
              </Pressable>
            </View>

            <View style={[styles.monthBar, { marginTop: Spacing.five }]}>
              <Text variant="subheading">{format(month, 'MMMM yyyy')}</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.one }}>
                <NavBtn icon="chevron-back" onPress={() => setMonth((m) => addMonths(m, -1))} />
                <NavBtn icon="chevron-forward" disabled={nextDisabled} onPress={() => setMonth((m) => addMonths(m, 1))} />
              </View>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((d, i) => (
                <View key={i} style={{ width: CELL, alignItems: 'center' }}>
                  <Text variant="caption" tone="tertiary">
                    {d}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.gridRow}>
              {grid.map((day) => {
                const inMonth = isSameMonth(day, month);
                const isSel = isSameDay(day, selected);
                const isToday = isSameDay(day, today);
                const future = isFuture(day) && !isToday;
                const has = marked?.has(toDayKey(day));
                return (
                  <Pressable
                    key={day.toISOString()}
                    disabled={future}
                    onPress={() => {
                      onSelect(toDayKey(day));
                      onClose();
                    }}
                    style={{ width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' }}>
                    <View
                      style={[
                        styles.dayCell,
                        isSel && { backgroundColor: c.accent },
                        !isSel && isToday && { borderWidth: 1, borderColor: c.borderStrong },
                      ]}>
                      <Text
                        style={{
                          color: isSel ? c.accentForeground : future || !inMonth ? c.textTertiary : c.text,
                          fontSize: 15,
                          fontWeight: isToday ? FontWeight.bold : FontWeight.medium,
                          opacity: inMonth ? 1 : 0.4,
                        }}>
                        {day.getDate()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.dot,
                        has ? { backgroundColor: isSel ? c.accentForeground : c.accent } : null,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function NavBtn({ icon, onPress, disabled }: { icon: 'chevron-back' | 'chevron-forward'; onPress: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={[styles.navBtn, { backgroundColor: c.backgroundInteractive, opacity: disabled ? 0.35 : 1 }]}>
      <Icon name={icon} size={18} color={c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.two },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 34, height: 34, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', marginTop: Spacing.four, marginBottom: Spacing.one },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 3, backgroundColor: 'transparent' },
});
