'use server';

import { z } from 'zod';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getFirestore } from '@/firebase/admin';

// Re-defining schema here for the server action
const formSchema = z.object({
  hotelName: z.string(),
  hotelRef: z.string(),
  flightNumber: z.string().min(1, 'Flight number is required.'),
  pnr: z.string(),
  arrivalAirport: z.string(),
  flightDate: z.date(),
  isHajjUmrah: z.boolean(),
  isTestMode: z.boolean(),
});

type BookingFormValues = z.infer<typeof formSchema>;

async function getLiveFlightStatus(flightNumber: string, flightDate: Date, arrivalAirport: string, isTestMode: boolean) {
    // This key is for the AeroDataBox API as specified.
    const flightApiKey = "abf6e166a1msh3911bf103317920p17e443jsn8e9ed0e4693a";
    
    // Format date to YYYY-MM-DD
    const dateLocal = flightDate.toISOString().split('T')[0];
    const flightApiUrl = `https://aerodatabox.p.rapidapi.com/flights/number/${flightNumber}/${dateLocal}`;

    try {
        const response = await fetch(flightApiUrl, {
            headers: {
                'X-RapidAPI-Key': flightApiKey,
                'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
            },
            // Add cache-busting to ensure fresh data
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`AeroDataBox API call failed for ${flightNumber}: ${response.status} ${response.statusText}`);
            return 'Flight Not Found';
        }

        const flightDataArray = await response.json();
        
        if (!flightDataArray || !Array.isArray(flightDataArray) || flightDataArray.length === 0) {
            console.log(`No flights found for ${flightNumber} on ${dateLocal}`);
            return 'Flight Not Found';
        }
        
        // If not in test mode, try to find the flight with matching arrival airport
        if (!isTestMode && arrivalAirport) {
             const matchingFlight = flightDataArray.find(flight => flight.arrival?.airport?.iata?.toUpperCase() === arrivalAirport.toUpperCase());
             if(matchingFlight && matchingFlight.status) {
                return matchingFlight.status;
             }
        }

        // Fallback to the first result if no specific airport match is found or if in test mode
        if (flightDataArray[0] && flightDataArray[0].status) {
            return flightDataArray[0].status;
        }

        return 'Not Tracked';

    } catch (error) {
        console.error("Error fetching flight status: ", error);
        return 'API Error';
    }
}


export async function addBooking(userId: string, data: BookingFormValues) {
    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }

    try {
        const firestore = getFirestore();
        const status = await getLiveFlightStatus(data.flightNumber, data.flightDate, data.arrivalAirport, data.isTestMode);

        await addDoc(collection(firestore, 'bookings'), {
            userId: userId,
            hotelName: data.hotelName,
            hotelRef: data.hotelRef,
            flightNumber: data.flightNumber.toUpperCase(),
            pnr: data.pnr.toUpperCase(),
            arrivalAirport: data.arrivalAirport.toUpperCase(),
            flightDate: Timestamp.fromDate(data.flightDate),
            isHajjUmrah: data.isHajjUmrah,
            status: status,
            isTestMode: data.isTestMode,
            createdAt: Timestamp.now(),
        });

    } catch (error) {
        console.error("Error adding document: ", error);
        return { success: false, error: 'Failed to save booking to the database.' };
    }
    
    // These must be called outside the try/catch block
    revalidatePath('/dashboard');
    redirect('/dashboard');
}
