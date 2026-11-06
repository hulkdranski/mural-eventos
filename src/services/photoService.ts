
import { supabase } from "./supabase";
import { auth } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
   getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

const BUCKET_NAME = "fotos-eventos";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function uploadPhoto(
  eventId: string,
  file: File
): Promise<string> {
  if (!eventId.trim()) {
    throw new Error("Evento inválido.");
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Formato de imagem não permitido.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("A imagem deve ter no máximo 10 MB.");
  }

  const extension = file.type.split("/")[1];
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const filePath = `${eventId}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Erro no upload:", error);
    throw error;
  }

  return filePath;
}


export async function registerPhoto(
  eventId: string,
  storagePath: string,
  caption: string
) {
  const photoData = {
    eventId,
    storagePath,
    caption: caption.trim().slice(0, 200),
    status: "pending",
    uploadedAt: serverTimestamp(),
  };

  const docRef = await addDoc(
    collection(db, "photos"),
    photoData
  );

  return docRef.id;
}

import type { Photo } from "../types/Photo";

// Busca as fotos pendentes de um evento
export async function getPendingPhotos(
  eventId: string
): Promise<Photo[]> {
  const photosQuery = query(
    collection(db, "photos"),
    where("eventId", "==", eventId),
    where("status", "==", "pending"),
    orderBy("uploadedAt", "desc")
  );

  

  const snapshot = await getDocs(photosQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as Photo[];
}

export async function updatePhotoStatus(
  photoId: string,
  status: "approved" | "rejected"
) {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Administrador não autenticado.");
  }

  const photoRef = doc(db, "photos", photoId);

  const updateData =
    status === "approved"
      ? {
          status,
          approvedAt: serverTimestamp(),
          approvedBy: currentUser.uid,
        }
      : {
          status,
        };

  await updateDoc(photoRef, updateData);
}


export async function getPhotoUrl(
  photoId: string
): Promise<string> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Administrador não autenticado.");
  }

  const token = await currentUser.getIdToken();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/admin-photo-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "apikey": supabaseKey,
      },
      body: JSON.stringify({ photoId }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("Erro ao obter imagem:", result);
    throw new Error(result.error || "Não foi possível carregar a imagem.");
  }

  return result.signedUrl;
}


export async function getApprovedPhotoUrl(photoId: string): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/approved-photo-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
      },
      body: JSON.stringify({ photoId }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("Erro ao obter imagem aprovada:", result);
    throw new Error(
      result.error || "Não foi possível carregar a imagem."
    );
  }

  return result.signedUrl;
}


export async function getApprovedPhotos(eventId: string): Promise<Photo[]> {
  const photosQuery = query(
    collection(db, "photos"),
    where("eventId", "==", eventId),
    where("status", "==", "approved"),
    orderBy("approvedAt", "desc")
  );

  const snapshot = await getDocs(photosQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as Photo[];
}
