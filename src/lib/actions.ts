'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';


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
    
    const dateLocal = flightDate.toISOString().split('T')[0];
    const flightApiUrl = `https://aerodatabox.p.rapidapi.com/flights/number/${flightNumber}/${dateLocal}`;

    try {
        const response = await fetch(flightApiUrl, {
            headers: {
                'X-RapidAPI-Key': flightApiKey,
                'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
            },
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
        
        if (!isTestMode && arrivalAirport) {
             const matchingFlight = flightDataArray.find(flight => flight.arrival?.airport?.iata?.toUpperCase() === arrivalAirport.toUpperCase());
             if(matchingFlight && matchingFlight.status) {
                return matchingFlight.status;
             }
        }

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
        throw new Error('User not authenticated.');
    }

    try {
        const firestore = getFirestore();
        const status = await getLiveFlightStatus(data.flightNumber, data.flightDate, data.arrivalAirport, data.isTestMode);

        await firestore.collection('bookings').add({
            userId: userId,
            hotelName: data.hotelName,
            hotelRef: data.hotelRef,
            flightNumber: data.flightNumber.toUpperCase(),
            pnr: data.pnr.toUpperCase(),
            arrivalAirport: data.arrivalAirport.toUpperCase(),
            flightDate: FieldValue.serverTimestamp(),
            isHajjUmrah: data.isHajjUmrah,
            status: status,
            isTestMode: data.isTestMode,
            createdAt: FieldValue.serverTimestamp(),
        });

    } catch (error) {
        console.error("Error adding document: ", error);
        throw new Error('Failed to save booking to the database.');
    }
    
    revalidatePath('/dashboard');
    redirect('/dashboard');
}
