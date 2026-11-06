
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import {
  getPendingPhotos,
  updatePhotoStatus,
  getPhotoUrl,
} from "../services/photoService";

import { getEventById } from "../services/eventService";

import type { Photo } from "../types/Photo";
import type { EventItem } from "../services/eventService";

function ModerationPage() {
  const { eventId } = useParams<{ eventId: string }>();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const photoUrlsRef = useRef<Record<string, string>>({});
  const loadingDataRef = useRef(false);

  async function loadData(silent = false) {
    if (!eventId || loadingDataRef.current) {
      return;
    }

    loadingDataRef.current = true;

    if (!silent) {
      setLoading(true);
    }

    try {
      const eventData = await getEventById(eventId);

      if (!eventData) {
        setError("Evento não encontrado.");
        return;
      }

      setEvent(eventData);

      const pendingPhotos = await getPendingPhotos(eventId);

      setPhotos(pendingPhotos);

      // Busca somente as imagens que ainda não possuem URL
      const newPhotos = pendingPhotos.filter(
        (photo) => !photoUrlsRef.current[photo.id]
      );

      const newUrls = await Promise.all(
        newPhotos.map(async (photo) => {
          try {
            const url = await getPhotoUrl(photo.id);
            return [photo.id, url] as const;
          } catch (error) {
            console.error(
              `Erro ao carregar imagem ${photo.id}:`,
              error
            );

            return [photo.id, ""] as const;
          }
        })
      );

      const updatedUrls = {
        ...photoUrlsRef.current,
        ...Object.fromEntries(newUrls),
      };

      // Mantém somente as URLs das fotos ainda pendentes
      const pendingIds = new Set(
        pendingPhotos.map((photo) => photo.id)
      );

      const filteredUrls = Object.fromEntries(
        Object.entries(updatedUrls).filter(([id]) =>
          pendingIds.has(id)
        )
      );

      photoUrlsRef.current = filteredUrls;
      setPhotoUrls(filteredUrls);

      setError("");
    } catch (err) {
      console.error("Erro ao carregar moderação:", err);
      setError("Não foi possível carregar as fotos pendentes.");
    } finally {
      loadingDataRef.current = false;

      if (!silent) {
        setLoading(false);
      }
    }
  }

  async function handleModeration(
    photoId: string,
    status: "approved" | "rejected"
  ) {
    try {
      await updatePhotoStatus(photoId, status);
      await loadData(true);
    } catch (error) {
      console.error("Erro ao moderar foto:", error);
      setError("Não foi possível atualizar a foto.");
    }
  }

  // Atualização automática a cada 5 segundos
  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [eventId]);

  if (loading) {
    return <p>Carregando fotos...</p>;
  }

  if (error) {
    return (
      <main>
        <h1>Moderação</h1>
        <p>{error}</p>
        <button onClick={() => loadData()}>
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main>
      <h1>Moderação de fotos</h1>

      <h2>{event?.name}</h2>

      <p>
        {photos.length} foto(s) aguardando aprovação.
      </p>

      <p style={{ color: "#16a34a", fontSize: "14px" }}>
        ● Atualização automática ativada (5 segundos)
      </p>

      <button onClick={() => loadData()}>
        Atualizar lista
      </button>

      {photos.length === 0 ? (
        <p>Nenhuma foto aguardando aprovação.</p>
      ) : (
        <section>
          {photos.map((photo) => (
            <article
              key={photo.id}
              style={{
                border: "1px solid #ccc",
                padding: "16px",
                marginTop: "12px",
                borderRadius: "8px",
              }}
            >
              <h3>Foto recebida</h3>

              {photoUrls[photo.id] ? (
                <img
                  src={photoUrls[photo.id]}
                  alt={
                    photo.caption ||
                    "Foto enviada para o evento"
                  }
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "400px",
                    objectFit: "contain",
                    marginBottom: "12px",
                    borderRadius: "6px",
                  }}
                />
              ) : (
                <p>
                  Carregando imagem ou imagem indisponível.
                </p>
              )}

              <p>
                <strong>Legenda:</strong>{" "}
                {photo.caption || "Sem legenda"}
              </p>

              <p>
                <strong>Arquivo:</strong> {photo.storagePath}
              </p>

              <p>
                <strong>Status:</strong> {photo.status}
              </p>

              <div>
                <button
                  onClick={() =>
                    handleModeration(photo.id, "approved")
                  }
                >
                  Aprovar
                </button>

                <button
                  onClick={() =>
                    handleModeration(photo.id, "rejected")
                  }
                >
                  Rejeitar
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default ModerationPage;
