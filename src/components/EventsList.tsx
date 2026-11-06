
import { useEffect, useState } from "react";
import {
  getEvents,
  setEventActive,
} from "../services/eventService";

import type { EventItem } from "../services/eventService";

function EventsList() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEvents() {
    setLoading(true);
    setError("");

    try {
      const result = await getEvents();
      setEvents(result);
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
      setError("Não foi possível carregar os eventos.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleEvent(event: EventItem) {
    try {
      await setEventActive(event.id, !event.active);
      await loadEvents();
    } catch (error) {
      console.error("Erro ao atualizar evento:", error);
      setError("Não foi possível atualizar o evento.");
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  if (loading) {
    return <p>Carregando eventos...</p>;
  }

  return (
    <section>
      <h2>Eventos cadastrados</h2>

      <button onClick={loadEvents}>
        Atualizar listagem
      </button>

      {error && <p role="alert">{error}</p>}

      {events.length === 0 ? (
        <p>Nenhum evento cadastrado.</p>
      ) : (
        events.map((event) => (
          <article key={event.id}>
            <h3>{event.name}</h3>

            <p>{event.description || "Sem descrição"}</p>

            <p>
              Status: {event.active ? "Ativo" : "Inativo"}
            </p>

            <p>
              Intervalo: {event.slideshowInterval} segundos
            </p>

            <p>
              ID: {event.id}
            </p>

            <button
              onClick={() => toggleEvent(event)}
            >
              {event.active ? "Desativar" : "Reativar"}
            </button>

            <hr />
          </article>
        ))
      )}
    </section>
  );
}

export default EventsList;
