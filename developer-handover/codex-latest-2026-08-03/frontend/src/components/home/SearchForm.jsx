import { Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";

export default function SearchForm() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function submit(event) {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <form className="search-form" onSubmit={submit}>
      <Search size={20} aria-hidden="true" />
      <label className="sr-only" htmlFor="home-search">Search people or cities</label>
      <input
        id="home-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by city, interests or values"
      />
      <button className="secondary-button" type="button"><SlidersHorizontal size={18} /> Filters</button>
      <button className="primary-button" type="submit">Discover</button>
    </form>
  );
}
