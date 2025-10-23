import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';

// IMPORTANT: This file is configured for a serverless environment like Cloud Functions or Next.js API routes.
// It expects GOOGLE_APPLICATION_CREDENTIALS to be set in the environment.

function getServiceAccount() {
    try {
        const serviceAccountKey = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (!serviceAccountKey) {
            console.warn('GOOGLE_APPLICATION_CREDENTIALS env var is not set. Using default credentials. This is expected for local dev but not in production.');
            return undefined; // Use default credentials if not set
        }
        return JSON.parse(serviceAccountKey);
    } catch (e) {
        console.error('Error parsing GOOGLE_APPLICATION_CREDENTIALS:', e);
        throw new Error('Could not parse service account credentials. Make sure the environment variable is set correctly.');
    }
}


const firebaseAdminConfig = {
  // Use credential.cert() only if the service account is successfully parsed
  // otherwise, allow initializeApp to use default credentials.
  credential: getServiceAccount() ? credential.cert(getServiceAccount()!) : undefined,
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
