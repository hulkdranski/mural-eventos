
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


async function compressImage(file: File): Promise<File> {
  const TARGET_SIZE = 1 * 1024 * 1024; // 1 MB

  // Não altera imagens que já estão abaixo de 1 MB.
  if (file.size <= TARGET_SIZE) {
    return file;
  }

  const bitmap = await createImageBitmap(file);

  try {
    const dimensions = [1920, 1600, 1400];
    const qualities = [0.82, 0.72, 0.62, 0.52];

    let bestBlob: Blob | null = null;

    for (const maxDimension of dimensions) {
      const scale = Math.min(
        1,
        maxDimension / Math.max(bitmap.width, bitmap.height)
      );

      const width = Math.round(bitmap.width * scale);
      const height = Math.round(bitmap.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Não foi possível processar a imagem.");
      }

      // Fundo branco para preservar corretamente imagens com transparência.
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, width, height);

      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of qualities) {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(result);
              } else {
                reject(new Error("Erro ao comprimir a imagem."));
              }
            },
            "image/jpeg",
            quality
          );
        });

        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob;
        }

        if (blob.size <= TARGET_SIZE) {
          return new File(
            [blob],
            file.name.replace(/\.[^.]+$/, "") + ".jpg",
            {
              type: "image/jpeg",
              lastModified: Date.now(),
            }
          );
        }
      }
    }

    if (!bestBlob) {
      throw new Error("Não foi possível comprimir a imagem.");
    }

    return new File(
      [bestBlob],
      file.name.replace(/\.[^.]+$/, "") + ".jpg",
      {
        type: "image/jpeg",
        lastModified: Date.now(),
      }
    );
  } finally {
    bitmap.close();
  }
}


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

  // Comprime a imagem antes do envio.
  const optimizedFile = await compressImage(file);

  const extension = optimizedFile.type === "image/jpeg"
    ? "jpg"
    : optimizedFile.type.split("/")[1];

  const fileName = `${crypto.randomUUID()}.${extension}`;
  const filePath = `${eventId}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, optimizedFile, {
      contentType: optimizedFile.type,
      upsert: false,
    });

  if (error) {
    console.error("Erro no upload:", error);
    throw error;
  }

  console.log(
    `Imagem original: ${(file.size / 1024 / 1024).toFixed(2)} MB`
  );

  console.log(
    `Imagem após compressão: ${(optimizedFile.size / 1024 / 1024).toFixed(2)} MB`
  );

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
