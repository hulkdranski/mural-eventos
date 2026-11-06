
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export interface EventData {
  name: string;
  description: string;
  active: boolean;
  slideshowInterval: number;
}

export interface EventItem extends EventData {
  id: string;
}

export async function createEvent(event: EventData) {
  const docRef = await addDoc(collection(db, "events"), {
    ...event,
    createdAt: serverTimestamp(),
  });

  return {
    success: true,
    id: docRef.id,
  };
}

export async function getEvents(): Promise<EventItem[]> {
  const snapshot = await getDocs(collection(db, "events"));

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as EventItem[];
}

export async function setEventActive(
  eventId: string,
  active: boolean
) {
  const eventRef = doc(db, "events", eventId);

  await updateDoc(eventRef, { active });
}

export async function getEventById(
  eventId: string
): Promise<EventItem | null> {
  const eventRef = doc(db, "events", eventId);
  const snapshot = await getDoc(eventRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as EventItem;
}