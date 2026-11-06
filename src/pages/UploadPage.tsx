
import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { useParams } from "react-router-dom";
import { getEventById } from "../services/eventService";
import type { EventItem } from "../services/eventService";
import { uploadPhoto, registerPhoto } from "../services/photoService";
import logo from "../assets/logo.png";

const MAX_PHOTOS_PER_UPLOAD = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

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

  const remainingSlots = MAX_PHOTOS_PER_UPLOAD - files.length;

  const validFiles = selectedFiles.filter((file) => {
    return (
      ALLOWED_TYPES.includes(file.type) &&
      file.size <= MAX_FILE_SIZE
    );
  });

  const acceptedFiles = validFiles.slice(0, remainingSlots);

  setFiles((previousFiles) => [
    ...previousFiles,
    ...acceptedFiles,
  ]);

  if (validFiles.length < selectedFiles.length) {
    setUploadError(
      "Algumas imagens foram ignoradas. Verifique o formato e o limite de 10 MB."
    );
  } else if (validFiles.length > remainingSlots) {
    setUploadError(
      `Limite de ${MAX_PHOTOS_PER_UPLOAD} fotos por envio.`
    );
  } else {
    setUploadError("");
  }

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
  <main style={{
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    color: "#243B53",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    boxSizing: "border-box",
  }}>
    <div style={{
      maxWidth: "700px",
      margin: "0 auto",
    }}>

      {/* Cabeçalho */}
      <header style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "12px 0 24px",
        borderBottom: "1px solid #e5e7eb",
      }}>
        <img
          src={logo}
          alt="Logo do Colégio Rainha da Paz"
          style={{
            width: "75px",
            height: "75px",
            objectFit: "contain",
          }}
        />

        <div>
          <h2 style={{
            margin: 0,
            fontSize: "18px",
            color: "#243B53",
          }}>
            COLÉGIO RAINHA DA PAZ
          </h2>

          <p style={{
            margin: "5px 0 0",
            color: "#243B53",
            fontSize: "14px",
          }}>
            Compartilhamento de fotos
          </p>
        </div>
      </header>

      {/* Apresentação */}
      <section style={{
        textAlign: "center",
        padding: "40px 10px 30px",
      }}>
        <h1 style={{
          fontSize: "28px",
          lineHeight: 1.3,
          margin: "0 0 12px",
          color: "#243B53",
        }}>
          Oficina Vestindo Histórias
        </h1>

        <p style={{
          color: "#243B53",
          fontSize: "16px",
          lineHeight: 1.6,
          margin: 0,
        }}>
          Envie suas fotos e faça parte das lembranças deste evento.
        </p>
      </section>

      {/* Seleção de fotos */}
      <section style={{
        border: "2px dashed #cbd5e1",
        borderRadius: "16px",
        padding: "30px 20px",
        textAlign: "center",
        backgroundColor: "#f8fafc",
      }}>
        <div style={{ fontSize: "42px", marginBottom: "12px" }}>
          📸
        </div>

        <h2 style={{ margin: "0 0 8px", fontSize: "21px", color: "#243B53",}}>
          Adicione suas fotos
        </h2>

        <p style={{
          color: "#64748b",
          margin: "0 0 20px",
        }}>
          Selecione imagens da galeria do seu celular.
        </p>

        <label
          htmlFor="photo-input"
          style={{
            display: "inline-block",
            backgroundColor: "#243B53",
            color: "#ffffff",
            padding: "13px 25px",
            borderRadius: "9px",
            cursor: uploading || files.length >= 10
              ? "not-allowed"
              : "pointer",
            opacity: uploading || files.length >= 10 ? 0.5 : 1,
            fontWeight: "bold",
          }}
        >
          Escolher fotos
        </label>

        <p style={{
          color: "#64748b",
          fontSize: "12px",
          marginTop: "15px",
        }}>
          Até 10 fotos por envio · JPEG, PNG ou WEBP
        </p>

        <input
          id="photo-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={uploading || files.length >= 10}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </section>

      {/* Fotos selecionadas */}
      {files.length > 0 && (
        <section style={{ marginTop: "30px" }}>
          <h2>Fotos selecionadas ({files.length}/10)</h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: "15px",
          }}>
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "8px",
                  overflow: "hidden",
                }}
              >
                <img
                  src={previews[index]}
                  alt={`Prévia da foto ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "120px",
                    objectFit: "cover",
                    borderRadius: "8px",
                  }}
                />

                <p style={{
                  fontSize: "12px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {file.name}
                </p>

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => removeFile(index)}
                  style={{
                    border: "none",
                    background: "#fee2e2",
                    color: "#b91c1c",
                    padding: "8px",
                    borderRadius: "6px",
                    width: "100%",
                    cursor: "pointer",
                  }}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Legenda */}
      <section style={{ marginTop: "25px" }}>
        <label htmlFor="caption" style={{
          display: "block",
          fontWeight: "bold",
          marginBottom: "8px",
        }}>
          Legenda (opcional)
        </label>

        <textarea
          id="caption"
          value={caption}
          disabled={uploading}
          onChange={(event) =>
            setCaption(event.target.value.slice(0, 200))
          }
          maxLength={200}
          placeholder="Escreva uma mensagem..."
          style={{
            width: "100%",
            minHeight: "100px",
            padding: "12px",
            border: "1px solid #cbd5e1",
            borderRadius: "9px",
            resize: "vertical",
            boxSizing: "border-box",
            fontFamily: "inherit",
            fontSize: "15px",
          }}
        />

        <p style={{
          textAlign: "right",
          fontSize: "12px",
          color: "#64748b",
        }}>
          {caption.length}/200 caracteres
        </p>
      </section>

      {/* Envio */}
      <button
        type="button"
        onClick={handleUpload}
        disabled={files.length === 0 || uploading}
        style={{
          width: "100%",
          padding: "16px",
          border: "none",
          borderRadius: "10px",
          backgroundColor: "#243B53",
          color: "#ffffff",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: files.length === 0 || uploading
            ? "not-allowed"
            : "pointer",
          opacity: files.length === 0 || uploading ? 0.5 : 1,
        }}
      >
        {uploading ? "Enviando fotos..." : "Enviar fotos"}
      </button>

      {successMessage && (
        <p style={{
          color: "#15803d",
          backgroundColor: "#dcfce7",
          padding: "14px",
          borderRadius: "8px",
          textAlign: "center",
        }}>
          {successMessage}
        </p>
      )}

      {uploadError && (
        <p style={{
          color: "#b91c1c",
          backgroundColor: "#fee2e2",
          padding: "14px",
          borderRadius: "8px",
        }}>
          {uploadError}
        </p>
      )}

      {/* Rodapé */}
      <footer style={{
        textAlign: "center",
        color: "#94a3b8",
        fontSize: "12px",
        padding: "35px 0 15px",
      }}>
        Colégio Rainha da Paz · Compartilhe bons momentos
      </footer>

    </div>
  </main>
);

}

export default UploadPage;
