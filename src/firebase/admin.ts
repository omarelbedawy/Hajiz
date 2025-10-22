import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';

// IMPORTANT: Path to your service account key file
const serviceAccountKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountKeyPath) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. This is required for server-side Firebase Admin operations.');
}

const firebaseAdminConfig = {
  credential: credential.cert(serviceAccountKeyPath),
};

export function initializeFirebase(): { firebaseApp: App; firestore: Firestore } {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseAdminConfig);
    return getSdks(firebaseApp);
  }
  return getSdks(getApp());
}

function getSdks(firebaseApp: App) {
  return {
    firebaseApp,
    firestore: getFirestore(firebaseApp)
  };
}
