'use server';

import { z } from 'zod';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { initializeFirebase } from '@/firebase/admin';

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
    const flightApiKey = "abf6e166a1msh3911bf103317920p17e443jsn8e9ed0e4693a";
    const flightDateStr = flightDate.toISOString().split('T')[0];
    const flightApiUrl = `https://aerodatabox.p.rapidapi.com/flights/number/${flightNumber}/${flightDateStr}`;

    try {
        const response = await fetch(flightApiUrl, {
            headers: {
                'X-RapidAPI-Key': flightApiKey,
                'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
            }
        });

        if (!response.ok) {
            console.error(`AeroDataBox API call failed for ${flightNumber}: ${response.status} ${response.statusText}`);
            return 'Flight Not Found';
        }

        const flightDataArray = await response.json();
        
        if (!flightDataArray || !Array.isArray(flightDataArray) || flightDataArray.length === 0) {
            return 'Flight Not Found';
        }

        let specificFlight;

        if (!isTestMode && arrivalAirport) {
            specificFlight = flightDataArray.find(f => f.arrival.airport.iata?.toLowerCase() === arrivalAirport.toLowerCase());
        } else {
            // In test mode, or if no arrival airport is provided, we can't be specific.
            // But since we query by date, the first result is our best guess.
            specificFlight = flightDataArray[0];
        }

        if (specificFlight) {
            return specificFlight.status || 'Not Tracked';
        }

        return 'Flight Not Found';

    } catch (error) {
        console.error("Error fetching flight status: ", error);
        return 'API Error';
    }
}


export async function addBooking(data: BookingFormValues, userId: string) {
    const { firestore } = await initializeFirebase();
    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }

    try {
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
            isTestMode: data.isTestMoe,
            createdAt: Timestamp.now(),
        });
    } catch (error) {
        console.error("Error adding document: ", error);
        return { success: false, error: 'Failed to save booking to the database.' };
    }

    revalidatePath('/dashboard');
    redirect('/dashboard');
}
