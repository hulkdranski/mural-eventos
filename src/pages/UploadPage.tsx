
import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { useParams } from "react-router-dom";
import { getEventById } from "../services/eventService";
import type { EventItem } from "../services/eventService";
import { uploadPhoto, registerPhoto } from "../services/photoService";

function UploadPage() {
  const { eventId } = useParams();
    const [uploadError, setUploadError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  

  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);

  async function handleUpload() {
  if (!eventId || files.length === 0 || uploading) {
    return;
  }

  setUploading(true);
  setUploadError("");
  setSuccessMessage("");

  let uploadedCount = 0;

  try {
    for (const file of files) {
      // 1. Envia a imagem ao Supabase
      const storagePath = await uploadPhoto(eventId, file);

      // 2. Registra os dados no Firestore
      await registerPhoto(eventId, storagePath, caption);

      uploadedCount++;
    }

    setFiles([]);
    setCaption("");

    setSuccessMessage(
      `${uploadedCount} foto(s) enviada(s) com sucesso! Aguardando aprovação.`
    );
  } catch (error) {
  console.error("Erro ao enviar fotos:", error);

  setUploadError(
    uploadedCount > 0
      ? `${uploadedCount} foto(s) foram enviadas. Ocorreu um erro nas demais.`
      : "Não foi possível enviar as fotos. Tente novamente."
  );
} finally {
    setUploading(false);
  }
}
  
  useEffect(() => {
    let cancelled = false;

    async function loadEvent() {
      if (!eventId) {
        setError("Identificador do evento inválido.");
        setLoading(false);
        return;
      }

      try {
        const result = await getEventById(eventId);

        if (!result || result.active !== true) {
  setError("Evento não encontrado ou indisponível.");
} else {
  setEvent(result);
}
      } catch (err) {
        console.error("Erro ao buscar evento:", err);

        if (!cancelled) {
          setError("Não foi possível acessar este evento.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles = Array.from(event.target.files ?? []);

    const validFiles = selectedFiles.filter((file) => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      return (
        allowedTypes.includes(file.type) &&
        file.size <= 10 * 1024 * 1024
      );
    });

    setFiles((previousFiles) => [
      ...previousFiles,
      ...validFiles,
    ]);

    event.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((previousFiles) =>
      previousFiles.filter((_, i) => i !== index)
    );
  }

  if (loading) {
    return <p>Carregando evento...</p>;
  }

  if (error || !event) {
    return (
      <main>
        <h1>Evento indisponível</h1>
        <p>{error || "Não foi possível encontrar este evento."}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>{event.name}</h1>

      <p>{event.description}</p>

      <h2>Compartilhe suas fotos!</h2>

      <p>
        Selecione as fotos que deseja compartilhar neste evento.
      </p>

      <label htmlFor="photo-input">
        Escolher fotos
      </label>

      <input
        id="photo-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileChange}
      />

      <section>
        <h2>Fotos selecionadas ({files.length})</h2>

        {files.map((file, index) => (
          <div key={`${file.name}-${index}`}>
            <img
              src={previews[index]}
              alt={`Prévia da foto ${index + 1}`}
              width={150}
            />

            <p>{file.name}</p>

            <button
              type="button"
              onClick={() => removeFile(index)}
            >
              Remover
            </button>
          </div>
        ))}
      </section>

      <div>
        <label htmlFor="caption">
          Legenda (opcional)
        </label>

        <textarea
          id="caption"
          value={caption}
          onChange={(event) =>
            setCaption(event.target.value.slice(0, 200))
          }
          maxLength={200}
          placeholder="Escreva uma mensagem..."
        />

        <p>{caption.length}/200 caracteres</p>
      </div>

      <button
  type="button"
  onClick={handleUpload}
  disabled={files.length === 0 || uploading}
>
  {uploading ? "Enviando fotos..." : "Enviar fotos"}
</button>

{successMessage && (
  <p style={{ color: "green" }}>
    {successMessage}
  </p>
)}

{uploadError && (
  <p style={{ color: "red" }}>
    {uploadError}
  </p>
)}
    </main>
  );
}

export default UploadPage;
