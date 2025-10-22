'use server';

import { z } from 'zod';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { initializeFirebase } from '@/firebase/admin';

const formSchema = z.object({
  hotelName: z.string(),
  hotelRef: z.string(),
  flightNumber: z.string(),
  pnr: z.string(),
  arrivalAirport: z.string(),
  flightDate: z.date(),
  isHajjUmrah: z.boolean(),
  isTestMode: z.boolean(),
});

type BookingFormValues = z.infer<typeof formSchema>;

export async function addBooking(data: BookingFormValues, userId: string) {
    const { firestore } = initializeFirebase();
    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }

    try {
        await addDoc(collection(firestore, 'bookings'), {
            userId: userId,
            hotelName: data.hotelName || '',
            hotelRef: data.hotelRef || '',
            flightNumber: data.flightNumber,
            pnr: data.pnr || '',
            arrivalAirport: data.arrivalAirport || '',
            flightDate: Timestamp.fromDate(data.flightDate),
            isHajjUmrah: data.isHajjUmrah,
            status: 'Pending Verification',
            isTestMode: data.isTestMode,
            createdAt: Timestamp.now(),
        });
    } catch (error) {
        console.error("Error adding document: ", error);
        return { success: false, error: 'Failed to save booking to the database.' };
    }

    revalidatePath('/dashboard');
    redirect('/dashboard');
}
