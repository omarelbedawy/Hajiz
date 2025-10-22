import { NextResponse } from 'next/server';
import { simpleParser } from 'mailparser';
import { initializeFirebase } from '@/firebase/admin';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

// This is your webhook endpoint.
// Your email service (e.g., SendGrid, Mailgun) should be configured to POST the raw email content to this URL.
export async function POST(request: Request) {
  try {
    const rawEmail = await request.text();
    const parsedEmail = await simpleParser(rawEmail);

    // --- 1. Extract Hotel Email ---
    // The 'from' field contains the sender's information.
    const hotelEmail = parsedEmail.from?.value[0]?.address;
    if (!hotelEmail) {
      return NextResponse.json({ error: 'Could not extract sender email.' }, { status: 400 });
    }

    // --- 2. Extract Booking Reference ---
    // Scan the email body for a booking reference. This is a simple regex example.
    // You'll need to adjust the regex based on the actual format of your confirmation emails.
    const body = parsedEmail.text || '';
    const refRegex = /Booking Reference:?\s*([A-Z0-9]{6,})/i;
    const match = body.match(refRegex);
    const hotelRef = match ? match[1] : null;

    if (!hotelRef) {
      return NextResponse.json({ error: 'Could not find a valid booking reference.' }, { status: 400 });
    }

    // --- 3. Update Firestore ---
    const { firestore } = initializeFirebase();
    const bookingsRef = collection(firestore, 'bookings'); // Assuming a top-level 'bookings' collection
    const q = query(bookingsRef, where('hotelRef', '==', hotelRef), where('status', '==', 'Pending Verification'));

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({ error: `No pending booking found with reference: ${hotelRef}` }, { status: 404 });
    }

    // Assuming only one booking will match
    const bookingDoc = querySnapshot.docs[0];
    await updateDoc(bookingDoc.ref, {
      hotelEmail: hotelEmail,
      status: 'ReadyToTrack'
    });

    return NextResponse.json({ success: true, message: `Booking ${bookingDoc.id} updated successfully.` });

  } catch (error: any) {
    console.error('Error processing forwarded email:', error);
    return NextResponse.json({ error: 'Failed to process email.', details: error.message }, { status: 500 });
  }
}
