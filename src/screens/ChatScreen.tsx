import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { TabScreenProps } from '../navigation';
import { chat, getApiKey } from '../ai/client';
import { getModel, getBudget, getGoals, GOAL_OPTIONS } from '../db/settings';
import { detectFamilies } from '../ai/conflicts';
import { getSkinLogs } from '../db/skinLogs';
import { getProducts } from '../db/products';
import { getHabitLogs } from '../db/habits';
import { colors, spacing, typography } from '../theme';
import { Button, Chip } from '../components/ui';
import type { HabitLog, SkinLog } from '../types';

type Props = TabScreenProps<'ChatTab'>;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: number;
}

const WELCOME: Message = {
  role: 'assistant',
  content:
    "Hi! I'm your skincare education assistant. Ask me about ingredients, routines, or what your own data might suggest. I don't diagnose — anything that seems like a medical concern should go to a dermatologist.",
  id: 0,
};

export default function ChatScreen({ navigation }: Props) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const [sending, setSending] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const idRef = useRef(1);

  useFocusEffect(
    useCallback(() => {
      getApiKey().then((key) => setApiKeyMissing(!key));
    }, [])
  );

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const userMsg: Message = { role: 'user', content: text, id: idRef.current++ };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        setApiKeyMissing(true);
        throw new Error('no-key');
      }
      const model = await getModel();
      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));

      const [recentLogs, products, habitLogs, budget, goals] = await Promise.all([
        getSkinLogs(),
        getProducts(),
        getHabitLogs(),
        getBudget(),
        getGoals(),
      ]);
      const recentHabits: HabitLog[] = habitLogs.slice(0, 7);
      const spent = products.reduce((sum, p) => sum + (p.price ?? 0), 0);
      const answer = await chat({
        apiKey,
        model,
        messages: [...history, { role: 'user', content: text }],
        includeContext,
        context: {
          recentLogs: recentLogs.slice(-3),
          goals: goals.map((g) => GOAL_OPTIONS.find((o) => o.id === g)?.label ?? g),
          budget,
          spent,
          shelf: products.map((p) => ({
            name: p.name ?? 'Unnamed product',
            price: p.price,
            actives: detectFamilies(p.ingredients).map((f) => f.family),
          })),
          recentHabits: recentHabits.map((h) => ({
            date: h.date,
            water_ml: h.water_ml,
            dairy: h.dairy,
            sugar: h.sugar,
          })),
        },
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: answer, id: idRef.current++ }]);
    } catch (e: any) {
      if (e?.message !== 'no-key') {
        const msg =
          e?.message ?? 'Something went wrong. Please try again.';
        setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${msg}`, id: idRef.current++ }]);
      }
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowBot]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Skin Q&A</Text>
          <Text style={styles.sub}>General skincare education · not medical advice</Text>
        </View>
      </View>

      {apiKeyMissing ? (
        <View style={styles.keyBanner}>
          <Ionicons name="key-outline" size={16} color={colors.warn} />
          <Text style={styles.keyBannerText}>Add your AI API key to start chatting.</Text>
          <Button
            title="Settings"
            variant="soft"
            small
            onPress={() => navigation.navigate('SettingsTab')}
          />
        </View>
      ) : null}

      <View style={styles.contextRow}>
        <Chip
          label={includeContext ? 'Using your data' : 'No personal data'}
          active={includeContext}
          onPress={() => setIncludeContext((v) => !v)}
          icon={<Ionicons name="leaf-outline" size={14} color={includeContext ? colors.white : colors.textMuted} />}
        />
        <Text style={styles.contextHint}>Chat can reference your last checks, shelf & habits</Text>
      </View>

      <FlatList
        data={[...messages].reverse()}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.inputWrap}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about ingredients, routines…"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          multiline
          maxLength={1000}
          onSubmitEditing={send}
        />
        <View style={styles.sendBtn} onTouchEnd={send}>
          {sending ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Ionicons name="arrow-up" size={20} color={colors.white} />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  title: { ...typography.h1, color: colors.text },
  sub: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  keyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warnSoft,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
  },
  keyBannerText: { flex: 1, fontSize: 13, color: colors.warn, fontWeight: '500' },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  contextHint: { flex: 1, fontSize: 11, color: colors.textFaint },
  list: { flex: 1 },
  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowBot: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleBot: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  bubbleText: { ...typography.body, color: colors.text, lineHeight: 21 },
  bubbleTextUser: { color: colors.white },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 110,
    fontSize: 15,
    color: colors.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
