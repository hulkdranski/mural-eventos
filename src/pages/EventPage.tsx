
import { useState } from "react";
import { createEvent } from "../services/eventService";
import EventsList from "../components/EventsList";

function EventPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [interval, setInterval] = useState(8);
  const [active, setActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [eventId, setEventId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setEventId("");

    try {
      const result = await createEvent({
        name,
        description,
        active,
        slideshowInterval: interval,
      });

      setEventId(result.id ?? "");
      setMessage("Evento cadastrado com sucesso!");

      setName("");
      setDescription("");
      setInterval(8);
      setActive(true);

    } catch (error) {
      console.error(error);
      setMessage("Não foi possível cadastrar o evento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Mural de Eventos</h1>
      <h2>Cadastrar novo evento</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Nome do evento</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Festa de Formatura"
            required
            maxLength={100}
          />
        </div>

        <div>
          <label>Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o evento..."
            maxLength={500}
          />
        </div>

        <div>
          <label>Intervalo entre fotografias (segundos)</label>
          <input
            type="number"
            min={3}
            max={60}
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            required
          />
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Evento ativo
          </label>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Cadastrar evento"}
        </button>
      </form>

      {message && <p>{message}</p>}

      {eventId && (
        <section>
          <h3>Identificador do evento</h3>
          <p>{eventId}</p>
        </section>
      )}
        <EventsList />
    </main>
  );
}

export default EventPage;
