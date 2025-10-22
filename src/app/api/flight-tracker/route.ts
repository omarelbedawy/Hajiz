import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/admin';
import { collection, query, where, getDocs, Timestamp, updateDoc } from 'firebase/firestore';

// Placeholder for the function that will trigger your protection alert (e.g., send an email)
async function triggerProtectionAlert(bookingId: string) {
  const emailApiKey = process.env.EMAIL_SERVICE_API_KEY;
  if (!emailApiKey || emailApiKey === "YOUR_EMAIL_SERVICE_KEY_HERE") {
    console.error('EMAIL_SERVICE_API_KEY is not set. Cannot send alert.');
    return;
  }
  console.log(`CRITICAL ALERT: Calling protection alert for booking: ${bookingId}`);
  // TODO: Implement actual alert logic, e.g., send an email using the emailApiKey
  // Example:
  // await sendCriticalDelayEmail(bookingId, emailApiKey);
}

// This function can be run on a schedule (e.g., every 15 minutes) by a cron job service.
export async function GET(request: Request) {
  const flightApiKey = process.env.FLIGHT_API_KEY;
  if (!flightApiKey || flightApiKey === "YOUR_AVIATIONSTACK_API_KEY") {
    throw new Error('FLIGHT_API_KEY is not set in environment variables.');
  }

  const { firestore } = initializeFirebase();
  try {
    const now = Timestamp.now();
    const futureDate = new Date(now.toDate().getTime() + 72 * 60 * 60 * 1000); // 72 hours from now
    const futureTimestamp = Timestamp.fromDate(futureDate);

    const bookingsRef = collection(firestore, 'bookings');
    const q = query(
      bookingsRef,
      where('status', '==', 'ReadyToTrack'),
      where('flightDate', '<=', futureTimestamp)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ message: 'No flights to track at this time.' });
    }

    const trackingPromises = querySnapshot.docs.map(async (doc) => {
      const booking = doc.data();
      const bookingId = doc.id;

      // --- CRITICAL TESTING MODE ---
      if (booking.isTestMode === true) {
        const runCount = (booking.testRunCount || 0) + 1;
        await updateDoc(doc.ref, { testRunCount: runCount });

        if (runCount >= 2) {
          await triggerProtectionAlert(bookingId);
          return { bookingId, status: 'Forced CRITICAL_DELAY for testing' };
        }
        return { bookingId, status: 'Test mode, run 1, no action' };
      }

      // --- REAL API CALL for aviationstack ---
      // See aviationstack documentation for more details on the response: https://aviationstack.com/documentation
      const flightApiUrl = `http://api.aviationstack.com/v1/flights?access_key=${flightApiKey}&flight_iata=${booking.flightNumber}`;
      
      const response = await fetch(flightApiUrl);
      const flightData = await response.json();
      
      // --- CRITICAL LOGIC (using aviationstack structure) ---
      // Check if data array exists and has entries
      if (!flightData.data || flightData.data.length === 0) {
        return { bookingId, status: `No flight data found for ${booking.flightNumber}` };
      }

      // We'll analyze the first result, which should be the most relevant.
      const flightInfo = flightData.data[0];
      const new_status = flightInfo.flight_status; // e.g., "scheduled", "landed", "cancelled", "delayed"
      const new_estimated_arrival_time = flightInfo.arrival.estimated ? new Date(flightInfo.arrival.estimated) : null;

      // 4 hours after original flight time
      const predefined_no_show_window_time = new Date(booking.flightDate.toDate().getTime() + 4 * 60 * 60 * 1000);

      if (new_status === 'cancelled' || (new_estimated_arrival_time && new_estimated_arrival_time > predefined_no_show_window_time)) {
        await triggerProtectionAlert(bookingId);
        return { bookingId, status: `Alert triggered due to: ${new_status}` };
      }

      return { bookingId, status: `Tracked, current status: ${new_status}` };
    });

    const results = await Promise.all(trackingPromises);
    return NextResponse.json({ success: true, trackedBookings: results });

  } catch (error: any) {
    console.error('Error in flight tracker cron job:', error);
    return NextResponse.json({ error: 'Failed to track flights.', details: error.message }, { status: 500 });
  }
}
