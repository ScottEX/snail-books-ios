import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import ExpenseHistoryScreen from '../screens/ExpenseHistoryScreen';
import DailyRevenueHistory from '../screens/DailyRevenueHistory';
import ReconHistoryScreen from '../screens/ReconHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import UserDetailScreen from '../screens/UserDetailScreen';
import InvoiceScreen from '../screens/InvoiceScreen';
import ProcurementDetailScreen from '../screens/ProcurementDetailScreen';
import ExpenseDetailScreen from '../screens/ExpenseDetailScreen';
import PdfPreviewPage from '../screens/PdfPreviewPage';
import { api } from '../api/client';

// ── Types ──

export type MainStackParamList = {
  Main: { editBatch?: any } | undefined;
  ExpenseHistory: undefined;
  DailyHistory: undefined;
  ReconHistory: undefined;
  Profile: undefined;
  UserManagement: undefined;
  UserDetail: { user: any };
  Invoice: { filterBatchId?: number | null } | undefined;
  ProcurementDetail: { batch: any };
  ExpenseDetail: { expense: any };
};

export type RootStackParamList = {
  MainStack: undefined;
  PdfPreview: { id: number; number: number; supplier?: string; fileUrl?: string; title?: string };
};

const MainStackNav = createNativeStackNavigator<MainStackParamList>();
const Root = createNativeStackNavigator<RootStackParamList>();

// ── Session context ──
export const SessionContext = createContext<{ onLogout: () => void }>({ onLogout: () => {} });

// ── Avatar-changed event ──
const avatarListeners = new Set<() => void>();
export const onAvatarChanged = (fn: () => void) => {
  avatarListeners.add(fn);
  return () => { avatarListeners.delete(fn); };
};
export const emitAvatarChanged = () => { avatarListeners.forEach(f => f()); };

// ── Focus-refresh ──
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
  return <DailyRevenueHistory onBack={() => navigation.goBack()} />;
}

function ReconHistoryRoute() {
  const navigation = useNavigation<any>();
  return <ReconHistoryScreen onBack={() => navigation.goBack()} />;
}

function ProfileRoute() {
  const navigation = useNavigation<any>();
  const { onLogout } = useContext(SessionContext);
  const refreshKey = useFocusRefreshKey();
  return (
    <ProfileScreen
      onBack={() => navigation.goBack()}
      onLogout={onLogout}
      onAvatarChange={emitAvatarChanged}
      onManageUsers={() => navigation.navigate('UserManagement')}
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
      onBack={() => navigation.goBack()}
    />
  );
}

// ── MainStack: 所有普通页面,一行不改 ──
function MainStackNavigator({ onLogout }: { onLogout: () => void }) {
  return (
    <MainStackNav.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
      }}
    >
      <MainStackNav.Screen name="Main">
        {() => <HomeScreen onLogout={onLogout} />}
      </MainStackNav.Screen>
      <MainStackNav.Screen name="ExpenseHistory" component={ExpenseHistoryRoute} />
      <MainStackNav.Screen name="DailyHistory" component={DailyHistoryRoute} />
      <MainStackNav.Screen name="ReconHistory" component={ReconHistoryRoute} />
      <MainStackNav.Screen name="Profile" component={ProfileRoute} />
      <MainStackNav.Screen name="UserManagement" component={UserManagementRoute} />
      <MainStackNav.Screen name="UserDetail" component={UserDetailRoute} />
      <MainStackNav.Screen name="Invoice" component={InvoiceRoute} />
      <MainStackNav.Screen name="ProcurementDetail" component={ProcurementDetailRoute} />
      <MainStackNav.Screen name="ExpenseDetail" component={ExpenseDetailRoute} />
    </MainStackNav.Navigator>
  );
}

// ── Root: MainStack + 全局 Modal ──
export default function RootStack({ onLogout }: { onLogout: () => void }) {
  return (
    <SessionContext.Provider value={{ onLogout }}>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        <Root.Screen name="MainStack" options={{ headerShown: false }}>
          {() => <MainStackNavigator onLogout={onLogout} />}
        </Root.Screen>
        <Root.Screen
          name="PdfPreview"
          component={PdfPreviewRoute}
          options={{
            presentation: 'fullScreenModal',
          }}
        />
      </Root.Navigator>
    </SessionContext.Provider>
  );
}
