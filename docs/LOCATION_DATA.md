# Location data

DestinyOne uses `@countrystatecity/countries-browser` for searchable USA and Canada city data. The package loads state and province city records on demand so the Expo bundle stays responsive.

Location data is provided by the [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database) under the Open Database License (ODbL) v1.0. User-entered city names remain available as a fallback for newly incorporated or missing places.
