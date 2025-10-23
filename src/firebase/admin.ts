import admin from 'firebase-admin';
import { App } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';

// This function is self-contained and handles parsing the credentials.
function initializeFirebaseAdmin(): App {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!serviceAccountJson) {
      console.warn('Firebase Admin credentials environment variable not set. Using default credentials.');
       return admin.initializeApp();
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.error('Could not parse Firebase Admin credentials. Initializing with default app.', e);
    return admin.initializeApp();
  }
}

// Call initialization right away.
const firebaseAdminApp = initializeFirebaseAdmin();

// Export a function that returns the already initialized Firestore instance.
export function getFirestore(): Firestore {
    return getAdminFirestore(firebaseAdminApp);
}
