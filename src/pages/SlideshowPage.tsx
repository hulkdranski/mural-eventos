
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getApprovedPhotos,
  getApprovedPhotoUrl,
} from "../services/photoService";

import {
  getEventById,
  type EventItem,
} from "../services/eventService";

import type { Photo } from "../types/Photo";

export default function SlideshowPage() {
  const { eventId } = useParams<{ eventId: string }>();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const urlCache = useRef<Record<string, string>>({});
  const lastUrlRefresh = useRef(0);

  // Carrega o evento e suas fotos aprovadas.
  useEffect(() => {
    if (!eventId) return;

    let mounted = true;

    async function loadEvent() {
      try {
        const eventData = await getEventById(eventId!);

        if (!mounted) return;

        if (!eventData || !eventData.active) {
          setError("Evento não encontrado ou inativo.");
          setLoading(false);
          return;
        }

        setEvent(eventData);
      } catch (err) {
        console.error("Erro ao carregar evento:", err);
        if (mounted) {
          setError("Não foi possível carregar o evento.");
          setLoading(false);
        }
      }
    }

    loadEvent();

    return () => {
      mounted = false;
    };
  }, [eventId]);

  // Busca as fotos e atualiza as URLs temporárias.
  useEffect(() => {
    if (!eventId || !event) return;

    let mounted = true;

    async function loadPhotos() {
      try {
        const approvedPhotos = await getApprovedPhotos(eventId!);

        if (!mounted) return;

        setPhotos(approvedPhotos);

        const renewUrls =
          Date.now() - lastUrlRefresh.current >= 240000;

        const photosToLoad = approvedPhotos.filter(
          (photo) => renewUrls || !urlCache.current[photo.id]
        );

        const results = await Promise.all(
          photosToLoad.map(async (photo) => {
            try {
              const url = await getApprovedPhotoUrl(photo.id);
              return { id: photo.id, url };
            } catch (err) {
              console.error(
                `Erro ao carregar foto ${photo.id}:`,
                err
              );
              return null;
            }
          })
        );

        if (!mounted) return;

        results.forEach((result) => {
          if (result) {
            urlCache.current[result.id] = result.url;
          }
        });

        if (renewUrls || lastUrlRefresh.current === 0) {
          lastUrlRefresh.current = Date.now();
        }

        setPhotoUrls({ ...urlCache.current });

        setLoading(false);
      } catch (err) {
        console.error("Erro ao buscar fotos:", err);
        if (mounted) {
          setError("Não foi possível carregar as fotos.");
          setLoading(false);
        }
      }
    }

    loadPhotos();

    // Procura novas fotos aprovadas a cada 15 segundos.
    const polling = window.setInterval(loadPhotos, 15000);

    return () => {
      mounted = false;
      window.clearInterval(polling);
    };
  }, [eventId, event]);

  // Alterna as fotos automaticamente.
  useEffect(() => {
    if (photos.length <= 1) return;

    const intervalSeconds = Math.max(
      3,
      event?.slideshowInterval || 8
    );

    const timer = window.setInterval(() => {
      setCurrentIndex((previous) => (previous + 1) % photos.length);
    }, intervalSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [photos.length, event]);

  // Mantém o índice válido quando a lista de fotos muda.
  useEffect(() => {
    if (currentIndex >= photos.length) {
      setCurrentIndex(0);
    }
  }, [photos.length, currentIndex]);

  const currentPhoto = photos[currentIndex];

  if (loading) {
    return (
      <main style={styles.message}>
        Carregando apresentação...
      </main>
    );
  }

  if (error) {
    return (
      <main style={styles.message}>
        {error}
      </main>
    );
  }

  if (!photos.length) {
    return (
      <main style={styles.message}>
        <h2>{event?.name}</h2>
        <p>Aguardando fotos aprovadas...</p>
      </main>
    );
  }

  return (
    <main style={styles.container}>
      {currentPhoto && photoUrls[currentPhoto.id] ? (
        <img
          key={currentPhoto.id}
          src={photoUrls[currentPhoto.id]}
          alt={currentPhoto.caption || "Foto do evento"}
          style={styles.image}
        />
      ) : (
        <p style={styles.message}>
          Carregando imagem...
        </p>
      )}

      {currentPhoto?.caption && (
        <div style={styles.caption}>
          {currentPhoto.caption}
        </div>
      )}

      <div style={styles.counter}>
        {currentIndex + 1} / {photos.length}
      </div>
    </main>
  );
}

const styles = {
  container: {
    width: "100%",
    height: "100vh",
    backgroundColor: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
    overflow: "hidden",
  },

  image: {
    maxWidth: "100%",
    maxHeight: "100%",
    width: "100%",
    height: "100%",
    objectFit: "contain" as const,
  },

  caption: {
    position: "absolute" as const,
    bottom: "45px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "rgba(0,0,0,0.65)",
    color: "#fff",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "20px",
    maxWidth: "80%",
    textAlign: "center" as const,
  },

  counter: {
    position: "absolute" as const,
    top: "20px",
    right: "25px",
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: "8px 14px",
    borderRadius: "20px",
  },

  message: {
    width: "100%",
    height: "100vh",
    backgroundColor: "#111",
    color: "#fff",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center" as const,
  },
};
