import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { fetchProducts, finishTransaction, getAvailablePurchases, type ProductSubscription, type Purchase, useIAP } from 'expo-iap';
import { supabase } from '../lib/supabase';
import { beginStoreRestore, finalizeStoreRestore, prepareStorePurchase, restoreStorePurchases, verifyStorePurchase, type RestoredEntitlement } from '../services/billing';
import { storePlatformForOperatingSystem, type StoreProductSelection } from '../domain/storeCatalog';

type PendingPurchase = {
  selection: StoreProductSelection;
  purchaseSessionId: string;
  resolve: (entitlements: RestoredEntitlement[]) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const clientKey = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const errorMessage = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;

export function useStoreBilling() {
  const pending = useRef<PendingPurchase | null>(null);

  const settlePending = (result: { entitlements?: RestoredEntitlement[]; error?: Error }) => {
    const current = pending.current;
    if (!current) return;
    clearTimeout(current.timer);
    pending.current = null;
    if (result.error) current.reject(result.error);
    else current.resolve(result.entitlements ?? []);
  };

  const { connected, requestPurchase, reconnect } = useIAP({
    onPurchaseSuccess: purchase => {
      const current = pending.current;
      if (!current || purchase.productId !== current.selection.externalProductId) return;
      void (async () => {
        try {
          if (!purchase.purchaseToken) throw new Error('The app store returned no verification token. No entitlement was changed.');
          const platform = storePlatformForOperatingSystem(Platform.OS);
          if (!platform) throw new Error('Store purchases are available in the signed iOS or Android app.');
          const result = await verifyStorePurchase({
            purchaseSessionId: current.purchaseSessionId,
            platform,
            productId: purchase.productId,
            purchaseToken: purchase.purchaseToken,
            transactionId: 'transactionId' in purchase ? purchase.transactionId ?? purchase.id : purchase.id,
          });
          await finishTransaction({ purchase, isConsumable: current.selection.consumable });
          settlePending({ entitlements: result.entitlements });
        } catch (error) {
          settlePending({ error: new Error(errorMessage(error, 'Secure purchase verification failed. No entitlement was changed.')) });
        }
      })();
    },
    onPurchaseError: error => settlePending({ error: new Error(error.message || 'The app store purchase was not completed.') }),
  });

  useEffect(() => () => {
    if (pending.current) settlePending({ error: new Error('Checkout closed before the app store finished.') });
  }, []);

  const requireUserId = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.id) throw new Error('Sign in is required for secure store billing.');
    return data.user.id;
  };

  const buy = async (selection: StoreProductSelection) => {
    const platform = storePlatformForOperatingSystem(Platform.OS);
    if (!platform) throw new Error('Membership purchases are available only in the signed iOS or Android app.');
    if (pending.current) throw new Error('Another app-store purchase is still being processed.');
    const userId = await requireUserId();
    if (!connected && !(await reconnect())) throw new Error('The app store is not available on this device.');
    const prepared = await prepareStorePurchase(selection.productKey, platform, clientKey('purchase'));
    const products = (await fetchProducts({ skus: [prepared.externalProductId], type: selection.purchaseType })) ?? [];
    if (!products.some(product => product.id === prepared.externalProductId)) throw new Error('This store product is not available for the current storefront.');
    const googleOffer = platform === 'google_play' && selection.purchaseType === 'subs'
      ? (products.find(product => product.id === prepared.externalProductId) as ProductSubscription | undefined)?.subscriptionOffers?.find(offer => offer.offerTokenAndroid)?.offerTokenAndroid
      : null;

    const completion = new Promise<RestoredEntitlement[]>((resolve, reject) => {
      const timer = setTimeout(() => settlePending({ error: new Error('The app store did not finish in time. You can safely retry or restore purchases.') }), 120000);
      pending.current = { selection, purchaseSessionId: prepared.purchaseSessionId, resolve, reject, timer };
    });
    try {
      if (selection.purchaseType === 'subs') {
        await requestPurchase({
          type: 'subs',
          request: {
            apple: { sku: prepared.externalProductId, appAccountToken: userId, andDangerouslyFinishTransactionAutomatically: false },
            google: { skus: [prepared.externalProductId], obfuscatedAccountId: userId, ...(googleOffer ? { subscriptionOffers: [{ sku: prepared.externalProductId, offerToken: googleOffer }] } : {}) },
          },
        });
      } else {
        await requestPurchase({
          type: 'in-app',
          request: {
            apple: { sku: prepared.externalProductId, appAccountToken: userId, andDangerouslyFinishTransactionAutomatically: false },
            google: { skus: [prepared.externalProductId], obfuscatedAccountId: userId },
          },
        });
      }
    } catch (error) {
      settlePending({ error: new Error(errorMessage(error, 'The app store could not open checkout.')) });
    }
    return completion;
  };

  const restore = async () => {
    const platform = storePlatformForOperatingSystem(Platform.OS);
    if (!platform) throw new Error('Restore purchases is available only in the signed iOS or Android app.');
    if (!connected && !(await reconnect())) throw new Error('The app store is not available on this device.');
    await requireUserId();
    const restoreSession = await beginStoreRestore(platform, clientKey('restore'));
    const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
    const restored = new Map<string, RestoredEntitlement>();
    let verifiedPurchaseCount = 0;
    for (const purchase of purchases as Purchase[]) {
      if (!purchase.purchaseToken) continue;
      try {
        const verified = await verifyStorePurchase({
          restoreSessionId: restoreSession.restoreSessionId,
          platform,
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          transactionId: 'transactionId' in purchase ? purchase.transactionId ?? purchase.id : purchase.id,
        });
        verifiedPurchaseCount += 1;
        for (const entitlement of verified.entitlements) restored.set(entitlement.key, entitlement);
        await finishTransaction({ purchase, isConsumable: false });
      } catch {
        // One invalid or expired item must not prevent the remaining owned
        // products from being restored and verified independently.
      }
    }
    await finalizeStoreRestore(restoreSession.restoreSessionId, verifiedPurchaseCount);
    const serverSnapshot = await restoreStorePurchases();
    for (const entitlement of serverSnapshot?.restored ?? []) restored.set(entitlement.key, entitlement);
    return [...restored.values()];
  };

  return { connected, buy, restore };
}
