'use server';

import { initializeApp, getApps, getApp, App, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let firestore: Firestore;

// This function safely gets and parses the service account key.
function getServiceAccount(): ServiceAccount | undefined {
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!serviceAccountJson) {
        console.warn('GOOGLE_APPLICATION_CREDENTIALS not set. Using application default credentials.');
        return undefined;
    }
    try {
        return JSON.parse(serviceAccountJson);
    } catch (e) {
        console.error('Error parsing GOOGLE_APPLICATION_CREDENTIALS:', e);
        return undefined;
    }
}

export async function initializeFirebase(): Promise<{ firebaseApp: App; firestore: Firestore }> {
  if (getApps().length > 0) {
    adminApp = getApp();
    firestore = getFirestore(adminApp);
    return { firebaseApp: adminApp, firestore };
  }

  const serviceAccount = getServiceAccount();

  const adminConfig = serviceAccount 
    ? { credential: cert(serviceAccount) }
    : {};

  adminApp = initializeApp(adminConfig);
  firestore = getFirestore(adminApp);

  return { firebaseApp: adminApp, firestore };
}
