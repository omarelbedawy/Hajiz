'use server';

import { z } from 'zod';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { initializeFirebase } from '@/firebase'; // Using client-side init

const formSchema = z.object({
    flightNumber: z.string().min(1, { message: 'Flight number is required.' }),
    flightDate: z.date({ required_error: 'Flight date is required.' }),
    isTestMode: z.boolean().default(false),
    // Conditional fields
    hotelName: z.string(),
    hotelRef: z.string(),
    pnr: z.string(),
    arrivalAirport: z.string(),
    isHajjUmrah: z.boolean(),
  }).superRefine((data, ctx) => {
    if (!data.isTestMode) {
      if (data.hotelName.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Hotel name is required.', path: ['hotelName'] });
      }
      if (data.hotelRef.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Booking reference is required.', path: ['hotelRef'] });
      }
      if (data.pnr.length !== 6) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'PNR must be exactly 6 characters.', path: ['pnr'] });
      }
      if (data.arrivalAirport.length !== 3) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Airport code must be 3 characters.', path: ['arrivalAirport'] });
      }
    }
  });


type BookingFormValues = z.infer<typeof formSchema>;

async function getLiveFlightStatus(flightNumber: string, flightDate: Date, arrivalAirport: string) {
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
            console.error(`AeroDataBox API call failed for ${flightNumber}: ${response.status}`);
            return 'Flight Not Found';
        }

        const flightDataArray = await response.json();
        if (!flightDataArray || !Array.isArray(flightDataArray) || flightDataArray.length === 0) {
            return 'Flight Not Found';
        }

        const flightInfo = flightDataArray.find(f => f.arrival.airport.iata?.toLowerCase() === arrivalAirport?.toLowerCase()) || flightDataArray[0];
        return flightInfo.status || 'Not Tracked';

    } catch (error) {
        console.error("Error fetching flight status: ", error);
        return 'API Error';
    }
}


export async function addBooking(values: BookingFormValues, userId: string) {
    const { firestore } = initializeFirebase(); // Using client SDK now
    if (!userId) {
        throw new Error('User not authenticated.');
    }

    let status = 'Pending Verification';

    if (values.isTestMode) {
        status = 'CRITICAL_DELAY'; // For test mode, set status directly
    } else {
        // For real flights, fetch status instantly
        status = await getLiveFlightStatus(values.flightNumber, values.flightDate, values.arrivalAirport);
    }
    
    const dataToSend = {
      userId: userId,
      hotelName: values.isTestMode ? '' : values.hotelName,
      hotelRef: values.isTestMode ? '' : values.hotelRef,
      flightNumber: values.flightNumber,
      pnr: values.isTestMode ? '' : values.pnr.toUpperCase(),
      arrivalAirport: values.isTestMode ? '' : values.arrivalAirport.toUpperCase(),
      flightDate: Timestamp.fromDate(values.flightDate),
      isHajjUmrah: values.isTestMode ? false : values.isHajjUmrah,
      status: status, 
      isTestMode: values.isTestMode,
      createdAt: Timestamp.now(),
    };

    try {
        await addDoc(collection(firestore, 'bookings'), dataToSend);
    } catch (error) {
        console.error("Error adding document: ", error);
        throw new Error('Failed to save booking to the database.');
    }

    revalidatePath('/dashboard');
    redirect('/dashboard');
}
