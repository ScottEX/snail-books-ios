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

export type RootStackParamList = MainStackParamList & {
  PdfPreview: { id: number; number: number; supplier?: string; fileUrl?: string; title?: string };
};

export type RootParamList = {
  MainStack: undefined;
  PdfPreview: { id: number; number: number; supplier?: string; fileUrl?: string; title?: string };
};

const MainStack = createNativeStackNavigator<MainStackParamList>();
const Root = createNativeStackNavigator<RootParamList>();

// ── Session context: onLogout lives in App.tsx, stack screens consume it ──
export const SessionContext = createContext<{ onLogout: () => void }>({ onLogout: () => {} });

// ── Avatar-changed event: ProfileScreen uploads → HomeScreen header reloads ──
const avatarListeners = new Set<() => void>();
export const onAvatarChanged = (fn: () => void) => {
  avatarListeners.add(fn);
  return () => { avatarListeners.delete(fn); };
};
export const emitAvatarChanged = () => { avatarListeners.forEach(f => f()); };

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
  const { params } = useRoute<RouteProp<RootParamList, 'PdfPreview'>>();
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

function MainStackNavigator({ onLogout }: { onLogout: () => void }) {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
      }}
    >
      <MainStack.Screen name="Main">
        {() => <HomeScreen onLogout={onLogout} />}
      </MainStack.Screen>
      <MainStack.Screen name="ExpenseHistory" component={ExpenseHistoryRoute} />
      <MainStack.Screen name="DailyHistory" component={DailyHistoryRoute} />
      <MainStack.Screen name="ReconHistory" component={ReconHistoryRoute} />
      <MainStack.Screen name="Profile" component={ProfileRoute} />
      <MainStack.Screen name="UserManagement" component={UserManagementRoute} />
      <MainStack.Screen name="UserDetail" component={UserDetailRoute} />
      <MainStack.Screen name="Invoice" component={InvoiceRoute} />
      <MainStack.Screen name="ProcurementDetail" component={ProcurementDetailRoute} />
      <MainStack.Screen name="ExpenseDetail" component={ExpenseDetailRoute} />
    </MainStack.Navigator>
  );
}

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
            animation: 'slide_from_right',
          }}
        />
      </Root.Navigator>
    </SessionContext.Provider>
  );
}
