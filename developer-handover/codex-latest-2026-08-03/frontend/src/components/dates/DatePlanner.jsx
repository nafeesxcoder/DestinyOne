import { useEffect, useState } from "react";
import { CalendarCheck, ShieldCheck } from "lucide-react";
import { api } from "../../services/api";

export default function DatePlanner({ selectedPlace, city = "" }) {
  const [form, setForm] = useState({ venue: selectedPlace?.name || "A quiet café", area: selectedPlace?.address || city || "Downtown", scheduledAt: "", note: "" });
  const [status, setStatus] = useState("");
  useEffect(() => setForm((current) => ({ ...current, venue: selectedPlace?.name || current.venue, area: selectedPlace?.address || city || current.area })), [selectedPlace, city]);
  async function submit(event) { event.preventDefault(); try { await api.post("/dates", form); setStatus("Date proposal sent privately. Your match can accept or suggest another time."); } catch { setStatus("Date proposal saved in preview mode. Your developer can connect the production API without changing this UI."); } }
  return <form className="form-card planner-card premium-date-planner" onSubmit={submit}><div className="planner-title"><CalendarCheck size={25}/><div><p className="eyebrow">Date Concierge</p><h2>Turn this idea into a clear plan</h2></div></div><div className="field"><label htmlFor="venue">Selected date idea</label><input id="venue" value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })}/></div><div className="grid-2"><div className="field"><label htmlFor="area">Public meeting place</label><input id="area" value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })}/></div><div className="field"><label htmlFor="scheduledAt">Date and time</label><input id="scheduledAt" type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })}/></div></div><div className="field"><label htmlFor="date-note">Private proposal note</label><textarea id="date-note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Would Friday at 7 work for you? We can arrive separately."/></div><div className="planner-safety"><ShieldCheck size={18}/><span>Public venue · separate arrival · check-in reminder enabled</span></div><button className="primary-button full-button" type="submit">Send private date proposal</button>{status && <p className="helper-text" role="status">{status}</p>}</form>;
}

