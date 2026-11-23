import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, useRoute, useFocusEffect, type NavigationProp, RouteProp, StackActions } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import HomeScreen from '../screens/HomeScreen';
import ExpenseHistoryScreen from '../screens/ExpenseHistoryScreen';
import DailyRevenueHistory from '../screens/DailyRevenueHistory';
import ReconHistoryScreen from '../screens/ReconHistoryScreen';
import ProfileScreen, { type ProfileAccountAction } from '../screens/ProfileScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import UserDetailScreen from '../screens/UserDetailScreen';
import InvoiceScreen from '../screens/InvoiceScreen';
import ProcurementDetailScreen from '../screens/ProcurementDetailScreen';
import ExpenseDetailScreen from '../screens/ExpenseDetailScreen';
import PdfPreviewPage from '../screens/PdfPreviewPage';
import { api } from '../api/client';
import AppSearchModal, { type AppSearchTarget } from '../components/AppSearchModal';
import { t, useLang } from '../i18n';
import { useTheme } from '../theme';
import { useDraggableButton } from '../hooks/useDraggableButton';

export type RootStackParamList = {
  Main: { editBatch?: any; searchTab?: 'supply' | 'partner'; searchProduct?: string } | undefined;
  ExpenseHistory: undefined;
  DailyHistory: { date?: string } | undefined;
  ReconHistory: { date?: string } | undefined;
  Profile: { accountAction?: ProfileAccountAction } | undefined;
  UserManagement: undefined;
  UserDetail: { user: any };
  Invoice: { filterBatchId?: number | null; recordId?: number } | undefined;
  ProcurementDetail: { batch: any };
  ExpenseDetail: { expense: any };
  PdfPreview: { id: number; number: number; supplier?: string; fileUrl?: string; title?: string; fileNamePrefix?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ── Session context: onLogout lives in App.tsx, stack screens consume it ──
export const SessionContext = createContext<{ onLogout: () => void }>({ onLogout: () => {} });

import { onAvatarChanged, emitAvatarChanged } from '../events/avatarEvents';
export { onAvatarChanged, emitAvatarChanged };

// ── Focus-refresh: key increments on each RE-focus (skip first mount) ──
function useFocusRefreshKey() {
  const [key, setKey] = useState(0);
  const first = useRef(true);
  useFocusEffect(useCallback(() => {
    if (first.current) { first.current = false; return; }
    setKey(k => k + 1);
  }, []));
  return key;
}

// ── Route wrappers ──

function ExpenseHistoryRoute() {
  const navigation = useNavigation<any>();
  const refreshKey = useFocusRefreshKey();
  return (
    <ExpenseHistoryScreen
      onBack={() => navigation.goBack()}
      refreshKey={refreshKey}
      onExpDetail={(e: any) => navigation.navigate('ExpenseDetail', { expense: e })}
      onInvoice={(batchId: number) => navigation.navigate('Invoice', { filterBatchId: batchId })}
    />
  );
}

function DailyHistoryRoute() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'DailyHistory'>>();
  return <DailyRevenueHistory initialDate={params?.date} onBack={() => navigation.goBack()} />;
}

function ReconHistoryRoute() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ReconHistory'>>();
  return <ReconHistoryScreen initialDate={params?.date} onBack={() => navigation.goBack()} />;
}

function ProfileRoute() {
  const navigation = useNavigation<any>();
  const { onLogout } = useContext(SessionContext);
  const { params } = useRoute<RouteProp<RootStackParamList, 'Profile'>>();
  const refreshKey = useFocusRefreshKey();
  return (
    <ProfileScreen
      onBack={() => navigation.goBack()}
      onLogout={onLogout}
      onAvatarChange={emitAvatarChanged}
      onManageUsers={() => navigation.navigate('UserManagement')}
      accountAction={params?.accountAction}
      refreshKey={refreshKey}
    />
  );
}

function UserManagementRoute() {
  const navigation = useNavigation<any>();
  const [reviewedUserId, setReviewedUserId] = useState<number | null>(null);
  return (
    <UserManagementScreen
      onBack={() => navigation.goBack()}
      reviewedUserId={reviewedUserId}
      onSelectUser={async (u) => {
        if (!u.reviewed) {
          try { await api.admin.markReviewed(u.id); } catch {}
          setReviewedUserId(u.id);
        }
        navigation.navigate('UserDetail', { user: u });
      }}
    />
  );
}

function UserDetailRoute() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = route.params;
  return (
    <UserDetailScreen
      user={user}
      onBack={() => navigation.goBack()}
      onChanged={() => { /* UserManagement remounts on focus */ }}
    />
  );
}

function InvoiceRoute() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  return (
    <InvoiceScreen
      onBack={() => navigation.goBack()}
      filterBatchId={route.params?.filterBatchId ?? null}
      initialRecordId={route.params?.recordId}
      onPdfPreview={(url: string, title: string) =>
        navigation.navigate('PdfPreview', { id: 0, number: 0, fileUrl: url, title })
      }
    />
  );
}

function ProcurementDetailRoute() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { batch } = route.params;
  return (
    <ProcurementDetailScreen
      batch={batch}
      onBack={() => navigation.goBack()}
      onEdit={() => navigation.popTo('Main', { editBatch: batch })}
      onPreview={(id: number, num: number, supplier?: string) =>
        navigation.navigate('PdfPreview', { id, number: num, supplier })}
    />
  );
}

function ExpenseDetailRoute() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { expense } = route.params;
  return (
    <ExpenseDetailScreen
      expense={expense}
      onBack={() => navigation.goBack()}
      onEdited={() => { /* ExpenseHistory refreshes on focus */ }}
      onDeleted={() => { /* screen calls onBack itself after delete */ }}
    />
  );
}

function PdfPreviewRoute() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'PdfPreview'>>();
  return (
    <PdfPreviewPage
      batchId={params.id}
      batchNumber={params.number}
      supplier={params.supplier}
      fileUrl={params.fileUrl}
      title={params.title}
      fileNamePrefix={params.fileNamePrefix}
      onBack={() => navigation.goBack()}
    />
  );
}

function GlobalSearch() {
  useLang();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [visible, setVisible] = useState(false);
  const showSearch = useCallback(() => setVisible(true), []);
  const left = 16 + insets.left;
  const bottom = Math.max(94, insets.bottom + 16);
  const button = useDraggableButton({
    anchor: 'left', left, right: 16 + insets.right, top: insets.top + 12, bottom, onPress: showSearch,
  });

  const open = async (target: AppSearchTarget, signal: AbortSignal) => {
    if (typeof target === 'string') {
      switch (target) {
        case 'email':
        case 'password': return () => navigation.dispatch(StackActions.push('Profile', { accountAction: target }));
        case 'profile': return () => navigation.navigate('Profile');
        case 'userManagement': return () => navigation.navigate('UserManagement');
        case 'invoice': return () => navigation.navigate('Invoice');
        case 'expense': return () => navigation.navigate('ExpenseHistory');
        case 'revenue': return () => navigation.navigate('DailyHistory');
        case 'reconciliation': return () => navigation.navigate('ReconHistory');
        case 'procurement': return () => navigation.dispatch(StackActions.popTo('Main', { searchTab: 'supply' }));
        case 'partner': return () => navigation.dispatch(StackActions.popTo('Main', { searchTab: 'partner' }));
      }
    }
    switch (target.kind) {
      case 'expense': {
        const expense = await api.getTransaction(target.id, signal);
        return () => navigation.dispatch(StackActions.push('ExpenseDetail', { expense }));
      }
      case 'procurement': {
        const batch = await api.getProcurementBatchDetail(target.id, signal);
        return () => navigation.dispatch(StackActions.push('ProcurementDetail', { batch }));
      }
      case 'invoice': return () => navigation.dispatch(StackActions.push('Invoice', { recordId: target.id }));
      case 'revenue': return () => navigation.dispatch(StackActions.push('DailyHistory', { date: target.date }));
      case 'reconciliation': return () => navigation.dispatch(StackActions.push('ReconHistory', { date: target.date }));
      case 'product': return () => navigation.dispatch(StackActions.popTo('Main', { searchTab: 'supply', searchProduct: target.title }));
      case 'partner': return () => navigation.dispatch(StackActions.popTo('Main', { searchTab: 'partner' }));
    }
  };

  return (
    <View pointerEvents="box-none" style={searchStyles.overlay} onLayout={button.onContainerLayout}>
      <GestureDetector gesture={button.gesture}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('appSearchTitle')}
          onAccessibilityTap={showSearch}
          onLayout={button.onButtonLayout}
          style={[searchStyles.button, { left, bottom, backgroundColor: colors.primary }, button.animatedStyle]}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" stroke={colors.surface} strokeWidth={2} fill="none">
            <Circle cx={10.5} cy={10.5} r={5.5} />
            <Line x1={15} y1={15} x2={20} y2={20} strokeLinecap="round" />
          </Svg>
          <Text style={{ color: colors.surface, fontWeight: '600' }}>{t('appSearchFind')}</Text>
        </Animated.View>
      </GestureDetector>
      <AppSearchModal visible={visible} onClose={() => setVisible(false)} onOpen={open} />
    </View>
  );
}

const searchStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  button: {
    position: 'absolute', minHeight: 44, borderRadius: 24, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.26,
    shadowRadius: 6, elevation: 4,
  },
});

export default function RootStack({ onLogout }: { onLogout: () => void }) {
  return (
    <SessionContext.Provider value={{ onLogout }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
        }}
      >
        <Stack.Screen name="Main">
          {() => <HomeScreen onLogout={onLogout} />}
        </Stack.Screen>
        <Stack.Screen name="ExpenseHistory" component={ExpenseHistoryRoute} />
        <Stack.Screen name="DailyHistory" component={DailyHistoryRoute} />
        <Stack.Screen name="ReconHistory" component={ReconHistoryRoute} />
        <Stack.Screen name="Profile" component={ProfileRoute} />
        <Stack.Screen name="UserManagement" component={UserManagementRoute} />
        <Stack.Screen name="UserDetail" component={UserDetailRoute} />
        <Stack.Screen name="Invoice" component={InvoiceRoute} />
        <Stack.Screen name="ProcurementDetail" component={ProcurementDetailRoute} />
        <Stack.Screen name="ExpenseDetail" component={ExpenseDetailRoute} />
        <Stack.Screen name="PdfPreview" component={PdfPreviewRoute} />
      </Stack.Navigator>
      <GlobalSearch />
    </SessionContext.Provider>
  );
}
