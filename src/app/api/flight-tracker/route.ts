
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/admin';
import { collection, query, where, getDocs, Timestamp, updateDoc, doc } from 'firebase/firestore';

// Placeholder for the function that will trigger your protection alert (e.g., send an email)
async function triggerProtectionAlert(bookingId: string) {
  const emailApiKey = process.env.EMAIL_SERVICE_API_KEY;
  if (!emailApiKey || emailApiKey === "YOUR_EMAIL_SERVICE_KEY_HERE") {
    console.error('EMAIL_SERVICE_API_KEY is not set. Cannot send alert.');
    return;
  }
  console.log(`CRITICAL ALERT: Calling protection alert for booking: ${bookingId}`);
  // In a real app, you would implement email sending logic here.
  // e.g., await sendCriticalDelayEmail(bookingId, emailApiKey);
}

// This function can be run on a schedule (e.g., every 15 minutes) by a cron job service.
export async function GET(request: Request) {
  const flightApiKey = process.env.FLIGHT_API_KEY;
  if (!flightApiKey || flightApiKey === "YOUR_AVIATIONSTACK_API_KEY") {
    console.log('FLIGHT_API_KEY is not set. Skipping flight tracking.');
    return NextResponse.json({ message: 'FLIGHT_API_KEY is not set. Skipping flight tracking.' });
  }

  const { firestore } = initializeFirebase();
  try {
    const now = Timestamp.now();
    const futureDate = new Date(now.toDate().getTime() + 72 * 60 * 60 * 1000); // 72 hours from now
    const futureTimestamp = Timestamp.fromDate(futureDate);

    const bookingsRef = collection(firestore, 'bookings');
    // Find all bookings that are ready to be tracked and are within the 72-hour window.
    const q = query(
      bookingsRef,
      where('status', 'in', ['ReadyToTrack', 'scheduled', 'delayed']),
      where('flightDate', '<=', futureTimestamp)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ message: 'No flights to track at this time.' });
    }

    const trackingPromises = querySnapshot.docs.map(async (document) => {
      const booking = document.data();
      const bookingId = document.id;
      const bookingRef = doc(firestore, 'bookings', bookingId);

      // --- IMMEDIATE TEST MODE LOGIC ---
      if (booking.isTestMode === true) {
        // For test bookings, immediately set to CRITICAL_DELAY and alert.
        await triggerProtectionAlert(bookingId);
        await updateDoc(bookingRef, { status: 'CRITICAL_DELAY' });
        return { bookingId, status: 'Test Mode: Forced CRITICAL_DELAY' };
      }

      // --- REAL API CALL for aviationstack ---
      const flightApiUrl = `http://api.aviationstack.com/v1/flights?access_key=${flightApiKey}&flight_iata=${booking.flightNumber}`;
      
      let flightData;
      try {
        const response = await fetch(flightApiUrl);
        flightData = await response.json();
      } catch (fetchError: any) {
        console.error(`Failed to fetch flight data for ${booking.flightNumber}`, fetchError);
        return { bookingId, status: `API fetch error for ${booking.flightNumber}` };
      }
      
      // --- LIVE STATUS PROCESSING ---
      if (!flightData.data || flightData.data.length === 0) {
        // No live data found, maybe the flight is too far in the future or the number is wrong.
        // We will keep its status as is and try again later.
        return { bookingId, status: `No live flight data found for ${booking.flightNumber}` };
      }

      const flightInfo = flightData.data[0];
      const liveStatus = flightInfo.flight_status; // e.g., "scheduled", "landed", "cancelled", "delayed"
      
      // **THE FIX:** Update the booking status in Firestore with the live status from the API.
      // This is the value the user will see on the dashboard.
      await updateDoc(bookingRef, { status: liveStatus });

      // **SEPARATE ALERT LOGIC:** Now, check for critical conditions to send an alert.
      // This does not change the status again. It only triggers the protection mechanism.
      const estimatedArrival = flightInfo.arrival.estimated ? new Date(flightInfo.arrival.estimated) : null;
      const noShowWindow = new Date(booking.flightDate.toDate().getTime() + 4 * 60 * 60 * 1000); // 4 hours after original flight time

      let alertTriggered = false;
      if (liveStatus === 'cancelled') {
        await triggerProtectionAlert(bookingId);
        alertTriggered = true;
      } else if (liveStatus === 'delayed' && estimatedArrival && estimatedArrival > noShowWindow) {
        // The new arrival time is past the hotel's likely no-show cutoff.
        // We trigger the alert but KEEP the status as "delayed" for the user to see.
        await triggerProtectionAlert(bookingId);
        alertTriggered = true;
      }

      return { 
        bookingId, 
        liveStatus, 
        alertTriggered 
      };
    });

    const results = await Promise.all(trackingPromises);
    return NextResponse.json({ success: true, trackedBookings: results });

  } catch (error: any) {
    console.error('Error in flight tracker cron job:', error);
    return NextResponse.json({ error: 'Failed to track flights.', details: error.message }, { status: 500 });
  }
}
