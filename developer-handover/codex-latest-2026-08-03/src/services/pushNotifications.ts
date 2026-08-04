import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type PushRegistrationResult =
  | { status: 'registered'; token: string }
  | { status: 'unsupported' | 'permission_denied' | 'not_configured'; reason: string };

type NotificationsModule=typeof import('expo-notifications');
let notificationsPromise:Promise<NotificationsModule>|null=null;
const notifications=()=>notificationsPromise??=import('expo-notifications');

if (Platform.OS !== 'web') {
  void notifications().then(Notifications=>Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  }));
}

function easProjectId() {
  return process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    || Constants.easConfig?.projectId
    || (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId;
}

export async function registerNativePushNotifications(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') return { status: 'unsupported', reason: 'Native push registration runs on iOS and Android.' };
  if (!Device.isDevice) return { status: 'unsupported', reason: 'Use a physical device or supported native simulator.' };
  if (!isSupabaseConfigured) return { status: 'not_configured', reason: 'Connect Supabase before registering push.' };
  const Notifications=await notifications();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages and calls',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#E5092F',
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  const iosAllowed = permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    || permission.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
  if (!permission.granted && !iosAllowed) return { status: 'permission_denied', reason: 'Notification permission was not enabled.' };
  const projectId = easProjectId();
  if (!projectId) return { status: 'not_configured', reason: 'EXPO_PUBLIC_EAS_PROJECT_ID is required for remote push.' };
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw userError ?? new Error('Sign in is required for push registration.');
  const { error } = await supabase.from('push_tokens').upsert({
    user_id: user.id,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    token,
    device_label: [Device.brand, Device.modelName].filter(Boolean).join(' ') || null,
    revoked_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,token' });
  if (error) throw error;
  return { status: 'registered', token };
}

export function listenForPushTokenChanges() {
  if (Platform.OS === 'web') return () => {};
  let removed=false;let subscription:{remove:()=>void}|null=null;
  void notifications().then(Notifications=>{if(!removed)subscription=Notifications.addPushTokenListener(() => { void registerNativePushNotifications().catch(() => undefined); })});
  return () => {removed=true;subscription?.remove()};
}

export function listenForNotificationResponses(onOpen: (data: Record<string, unknown>) => void) {
  if (Platform.OS === 'web') return () => {};
  let removed=false;let subscription:{remove:()=>void}|null=null;
  void notifications().then(Notifications=>{if(!removed)subscription=Notifications.addNotificationResponseReceivedListener((response) => {
    onOpen(response.notification.request.content.data as Record<string, unknown>);
  })});
  return () => {removed=true;subscription?.remove()};
}
