
import { NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase/admin';
import { collection, query, where, getDocs, Timestamp, updateDoc, doc } from 'firebase/firestore';

// Placeholder for the function that will trigger your protection alert (e.g., send an email)
async function triggerProtectionAlert(bookingId: string) {
  const emailApiKey = process.env.EMAIL_SERVICE_API_KEY;
  if (!emailApiKey || emailApiKey === "YOUR_EMAIL_SERVICE_KEY_HERE") {
    console.error('EMAIL_SERVICE_API_KEY is not set. Cannot send alert for booking:', bookingId);
    return;
  }
  console.log(`CRITICAL ALERT: Calling protection alert for booking: ${bookingId}`);
  // In a real app, you would implement email sending logic here.
}

// This function can be run on a schedule (e.g., every 15 minutes) by a cron job service.
export async function GET(request: Request) {
  // API Key is hardcoded as requested for immediate functionality.
  const flightApiKey = "abf6e166a1msh3911bf103317920p17e443jsn8e9ed0e4693a";

  const { firestore } = initializeFirebase();
  try {
    const now = Timestamp.now();
    const futureDate = new Date(now.toDate().getTime() + 72 * 60 * 60 * 1000); // 72 hours from now
    const futureTimestamp = Timestamp.fromDate(futureDate);

    const bookingsRef = collection(firestore, 'bookings');
    // Find all bookings that are ready to be tracked or have an active, non-final status.
    const q = query(
      bookingsRef,
      where('status', 'in', ['ReadyToTrack', 'Scheduled', 'Delayed', 'Active', 'En-Route']),
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
      const flightDate = (booking.flightDate as Timestamp).toDate();
      const flightDateStr = flightDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

      // --- TEST MODE LOGIC ---
      if (booking.isTestMode === true) {
        await triggerProtectionAlert(bookingId);
        await updateDoc(bookingRef, { status: 'CRITICAL_DELAY' });
        return { bookingId, status: 'Test Mode: Forced CRITICAL_DELAY' };
      }

      // --- REAL API CALL for AeroDataBox ---
      const flightApiUrl = `https://aerodatabox.p.rapidapi.com/flights/number/${booking.flightNumber}/${flightDateStr}`;
      
      let flightDataArray;
      try {
        const response = await fetch(flightApiUrl, {
            headers: {
                'X-RapidAPI-Key': flightApiKey,
                'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
            }
        });
        if (!response.ok) {
          // If the API call itself fails, we can't determine the status.
          // We will update the status to reflect the API error for debugging.
          const errorBody = await response.text();
          console.error(`AeroDataBox API call failed for ${booking.flightNumber}: ${response.status}`, errorBody);
          await updateDoc(bookingRef, { status: `API Error ${response.status}` });
          return { bookingId, status: `API call failed with status: ${response.status}` };
        }
        flightDataArray = await response.json();
      } catch (fetchError: any) {
        console.error(`Failed to fetch flight data for ${booking.flightNumber}`, fetchError);
        // Network or other fetch-related error
        await updateDoc(bookingRef, { status: 'Fetch Error' });
        return { bookingId, status: `API fetch error: ${fetchError.message}` };
      }
      
      // --- LIVE STATUS PROCESSING ---
      if (!flightDataArray || !Array.isArray(flightDataArray) || flightDataArray.length === 0) {
        // If API returns no flight data, update status to indicate this.
        await updateDoc(bookingRef, { status: 'Flight Not Found' });
        return { bookingId, status: `No live flight data found for ${booking.flightNumber}` };
      }

      // Find the specific flight that matches the arrival airport, or take the first result.
      const flightInfo = flightDataArray.find(f => f.arrival.airport.iata?.toLowerCase() === booking.arrivalAirport?.toLowerCase()) || flightDataArray[0];
      const liveStatus = flightInfo.status; // e.g., "Scheduled", "Landed", "Canceled", "Diverted", "En-Route"
      
      // **SAVE THE REAL STATUS TO THE DATABASE**
      await updateDoc(bookingRef, { status: liveStatus });

      // **SEPARATE ALERT LOGIC** (Does not change the status in the DB)
      let alertTriggered = false;
      if (liveStatus.toLowerCase() === 'canceled' || liveStatus.toLowerCase() === 'diverted') {
        await triggerProtectionAlert(bookingId);
        alertTriggered = true;
      } else if (flightInfo.arrival.actualTimeUtc) {
          const originalFlightTime = flightDate.getTime();
          const criticalDelayThreshold = new Date(originalFlightTime + 4 * 60 * 60 * 1000); // 4 hours after original flight time
          const estimatedArrival = new Date(flightInfo.arrival.actualTimeUtc);
          if (estimatedArrival > criticalDelayThreshold) {
               await triggerProtectionAlert(bookingId);
               alertTriggered = true;
          }
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
