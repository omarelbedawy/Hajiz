import admin from 'firebase-admin';
import { App } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';

function getServiceAccount() {
  const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!serviceAccountJson) {
    console.warn('Firebase Admin credentials environment variable not set. Using default credentials.');
    return undefined;
  }
  try {
    return JSON.parse(serviceAccountJson);
  } catch (e) {
    console.error('Could not parse Firebase Admin credentials.', e);
    return undefined;
  }
}

let firebaseAdminApp: App;

function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    const serviceAccount = getServiceAccount();
    const credential = serviceAccount 
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault();

    firebaseAdminApp = admin.initializeApp({
      credential,
    });
    console.log('Firebase Admin SDK Initialized.');
  } else {
    firebaseAdminApp = admin.app();
  }
  return firebaseAdminApp;
}

// Initialize on module load
initializeFirebaseAdmin();

export function getFirestore(): Firestore {
    if (!firebaseAdminApp) {
        initializeFirebaseAdmin();
    }
    return getAdminFirestore(firebaseAdminApp);
}
