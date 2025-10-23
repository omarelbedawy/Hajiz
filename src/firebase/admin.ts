'use server';

import { initializeApp, getApps, getApp, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// This function safely gets and parses the service account key.
function getServiceAccount(): ServiceAccount | undefined {
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!serviceAccountJson) {
        // This is expected in a deployed environment where application default credentials are used.
        console.warn('GOOGLE_APPLICATION_CREDENTIALS not set. Using application default credentials.');
        return undefined;
    }
    try {
        return JSON.parse(serviceAccountJson);
    } catch (e) {
        console.error('Error parsing GOOGLE_APPLICATION_CREDENTIALS:', e);
        // If parsing fails, it's better to return undefined and let initialization fail clearly
        // than to proceed with a broken configuration.
        return undefined;
    }
}

// Prepare the admin config.
const serviceAccount = getServiceAccount();
const firebaseAdminConfig = serviceAccount ? { credential: cert(serviceAccount) } : {};


export async function initializeFirebase(): Promise<{ firebaseApp: App; firestore: Firestore }> {
  // Check if the default app is already initialized.
  if (getApps().length === 0) {
    const firebaseApp = initializeApp(firebaseAdminConfig);
    return {
        firebaseApp,
        firestore: getFirestore(firebaseApp)
    };
  } 
  
  const firebaseApp = getApp();
  return {
    firebaseApp,
    firestore: getFirestore(firebaseApp)
  };
}
