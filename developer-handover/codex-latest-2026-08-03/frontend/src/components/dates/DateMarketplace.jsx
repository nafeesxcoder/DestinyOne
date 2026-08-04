import { useEffect, useMemo, useState } from "react";
import { BedDouble, BellRing, CalendarDays, Check, ChevronRight, Coffee, Compass, Hotel, Leaf, MapPin, Search, ShieldCheck, Sparkles, Star, Utensils } from "lucide-react";
import DatePlanner from "./DatePlanner";
import { dateCategories, fallbackPlaces, searchPlaces } from "../../services/places";

const iconFor = (category) => ({ Restaurant: Utensils, Cafe: Coffee, Park: Leaf, Hotel, Tourist: Compass, Wellness: Sparkles, Activity: CalendarDays, Cultural: Compass }[category] || MapPin);
const quickSearches = ["Romantic dinner", "Parks & gardens", "Coffee & chai", "Hotels & Airbnb", "Weekend trips", "Things to do"];

export default function DateMarketplace() {
  const [city, setCity] = useState("Fresno, CA");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [places, setPlaces] = useState(() => fallbackPlaces("Fresno, CA"));
  const [mode, setMode] = useState("preview");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState([]);
  const [noticeOpen, setNoticeOpen] = useState(true);

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("destinyone-profile") || "null");
      if (profile?.city) { setCity(profile.city); setPlaces(fallbackPlaces(profile.city)); }
    } catch {}
  }, []);

  async function runSearch(nextQuery = query, nextCategory = category) {
    if (!city.trim()) return;
    setLoading(true);
    const result = await searchPlaces({ city: city.trim(), query: nextQuery.trim(), category: nextCategory });
    setPlaces(result.places);
    setMode(result.mode || "preview");
    setLoading(false);
  }

  const headline = useMemo(() => city ? `Recommended around ${city.split(",")[0]}` : "Choose your city", [city]);
  return <div className="date-marketplace">
    <section className="date-hero">
      <div className="date-hero-icon"><CalendarDays size={27} /></div>
      <div><p className="eyebrow">Personalized from your profile location</p><h2>Plan the whole date, beautifully.</h2><p>Search restaurants, parks, activities, culture, travel and stays across the US and Canada. Your city, intent and date style shape the order.</p><div className="date-trust"><span><ShieldCheck size={15}/>Public-first</span><span><MapPin size={15}/>{city}</span><span><Sparkles size={15}/>Preference ranked</span></div></div>
    </section>

    {noticeOpen && <aside className="date-smart-notice" role="status"><BellRing size={22}/><div><strong>Fresh {city.split(",")[0]} ideas are ready</strong><p>New local picks can appear here as live provider inventory changes. Hours and availability are always confirmed before booking.</p></div><button onClick={() => setNoticeOpen(false)} aria-label="Dismiss notification">×</button></aside>}

    <section className="date-search-panel">
      <div className="date-location-field"><MapPin size={19}/><label><span>Profile city or destination</span><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Fresno, CA or Toronto, ON" /></label></div>
      <div className="date-query-field"><Search size={19}/><input aria-label="Search Date Marketplace" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && runSearch()} placeholder="Restaurant, park, Airbnb, hotel, romantic place…"/><button onClick={() => runSearch()} disabled={loading}>{loading ? "Searching…" : "Search"}</button></div>
      <div className="date-quick-row">{quickSearches.map((item) => <button key={item} onClick={() => { setQuery(item); setCategory("All"); runSearch(item, "All"); }}>{item}</button>)}</div>
      <div className="date-category-row">{dateCategories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => { setCategory(item); runSearch(query, item); }}>{item}</button>)}</div>
    </section>

    <div className="date-results-head"><div><p className="eyebrow">{mode === "live" ? "Live local results" : "Provider-ready recommendations"}</p><h2>{headline}</h2></div><span>{places.length} ideas</span></div>
    <section className="date-result-grid">{places.map((place) => {
      const Icon = iconFor(place.category); const isSaved = saved.includes(place.id);
      return <article className="date-result-card" key={place.id}>
        <div className="date-result-top"><div className="date-result-icon"><Icon size={22}/></div><span className="date-score"><Sparkles size={13}/>{place.matchScore || 90}% fit</span></div>
        <p className="eyebrow">{place.category} · {place.price}</p><h3>{place.name}</h3><p>{place.summary || `${place.rating ? `${place.rating} rated · ` : ""}${place.address}`}</p>
        <div className="date-meta"><span><MapPin size={14}/>{place.address || place.city}</span>{place.rating && <span><Star size={14}/>{place.rating} ({place.ratingCount || 0})</span>}</div>
        <div className="date-card-actions"><button className="secondary-button" onClick={() => setSaved((current) => isSaved ? current.filter((id) => id !== place.id) : [...current, place.id])}>{isSaved ? <Check size={16}/> : null}{isSaved ? "Saved" : "Save"}</button><button className="primary-button" onClick={() => setSelected(place)}>Plan this date<ChevronRight size={16}/></button></div>
        <div className="date-provider-links"><a href={place.mapsUrl || place.providerLinks?.maps} target="_blank" rel="noreferrer">View live places</a>{place.category === "Hotel" && <><a href={place.providerLinks?.airbnb} target="_blank" rel="noreferrer"><BedDouble size={13}/>Airbnb</a><a href={place.providerLinks?.hotels} target="_blank" rel="noreferrer">Hotels</a></>}</div>
      </article>;
    })}</section>
    {!places.length && <div className="date-empty"><Search size={30}/><h3>No results yet</h3><p>Try another category or a broader city search.</p></div>}
    <section className="date-safety"><ShieldCheck size={27}/><div><strong>First-date safety stays on by default</strong><p>Public venue, separate arrival, clear cancellation terms and an optional trusted-contact check-in.</p></div></section>
    {selected && <div className="date-planner-modal" role="dialog" aria-modal="true" aria-label="Plan selected date"><button className="date-modal-backdrop" onClick={() => setSelected(null)} aria-label="Close planner"/><div className="date-planner-sheet"><button className="date-modal-close" onClick={() => setSelected(null)} aria-label="Close">×</button><DatePlanner selectedPlace={selected} city={city}/></div></div>}
  </div>;
}
