'use server';

import { z } from 'zod';
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const formSchema = z.object({
  hotelName: z.string(),
  hotelRef: z.string(),
  flightNumber: z.string(),
  pnr: z.string(),
  arrivalAirport: z.string(),
  flightDate: z.date(),
  isHajjUmrah: z.boolean(),
});

type BookingFormValues = z.infer<typeof formSchema>;

export async function addBooking(data: BookingFormValues, userId: string) {
    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }

    try {
        await addDoc(collection(db, 'bookings'), {
            userId: userId,
            hotelName: data.hotelName,
            hotelRef: data.hotelRef,
            flightNumber: data.flightNumber,
            pnr: data.pnr,
            arrivalAirport: data.arrivalAirport,
            flightDate: Timestamp.fromDate(data.flightDate),
            isHajjUmrah: data.isHajjUmrah,
            status: 'Pending Verification',
            isTestMode: false,
            createdAt: Timestamp.now(),
        });
    } catch (error) {
        console.error("Error adding document: ", error);
        return { success: false, error: 'Failed to save booking to the database.' };
    }

    revalidatePath('/dashboard');
    redirect('/dashboard');
}
