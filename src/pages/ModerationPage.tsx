
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPendingPhotos } from "../services/photoService";
import { getEventById } from "../services/eventService";

import type { Photo } from "../types/Photo";
import type { EventItem } from "../services/eventService";
import { updatePhotoStatus, getPhotoUrl } from "../services/photoService";

function ModerationPage() {
  const { eventId } = useParams();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

          async function handleModeration(
          photoId: string,
            status: "approved" | "rejected"
        ) {
  try {
    await updatePhotoStatus(photoId, status);
    await loadData();
  } catch (error) {
    console.error("Erro ao moderar foto:", error);
    setError("Não foi possível atualizar a foto.");
  }
}
  
  async function loadData() {

    if (!eventId) {
      setError("Identificador do evento inválido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const eventData = await getEventById(eventId);

      if (!eventData) {
        setError("Evento não encontrado.");
        return;
      }

      setEvent(eventData);

      const pendingPhotos = await getPendingPhotos(eventId);
setPhotos(pendingPhotos);

const urls = await Promise.all(
  pendingPhotos.map(async (photo) => {
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

setPhotoUrls(Object.fromEntries(urls));
    } catch (err) {
      console.error("Erro ao carregar moderação:", err);
      setError("Não foi possível carregar as fotos pendentes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [eventId]);

  if (loading) {
    return <p>Carregando fotos...</p>;
  }

  if (error) {
    return (
      <main>
        <h1>Moderação</h1>
        <p>{error}</p>
        <button onClick={loadData}>Tentar novamente</button>
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

      <button onClick={loadData}>
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
          alt={photo.caption || "Foto enviada para o evento"}
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
        <p>Carregando imagem ou imagem indisponível.</p>
      )}

      <p>
        <strong>Legenda:</strong> {photo.caption || "Sem legenda"}
      </p>

      <p>
        <strong>Arquivo:</strong> {photo.storagePath}
      </p>

      <p>
        <strong>Status:</strong> {photo.status}
      </p>

      <div>
        <button
          onClick={() => handleModeration(photo.id, "approved")}
        >
          Aprovar
        </button>

        <button
          onClick={() => handleModeration(photo.id, "rejected")}
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
