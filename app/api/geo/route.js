import { geolocation } from "@vercel/functions";
// import { find } from "geo-tz";
import { findFromCityStateProvince } from "city-timezones";

// const testLocation = {
//     city: "Plover",
//     country: "US",
//     flag: undefined,
//     countryRegion: "WI",
//     region: "dev1",
//     latitude: 39.92064,
//     longitude: -105.08654,
//     postalCode: 80020,
// };

const testLocation = {
    city: "Chicago",
    country: "US",
    flag: undefined,
    countryRegion: "IL",
    region: "dev1",
    latitude: 41.82999066,
    longitude: -87.75005497,
    postalCode: 80020,
};

export function GET(request) {
    const location = geolocation(request);
    console.log(`location -->`, location);

    // const timeZone = find(testLocation.latitude, testLocation.longitude);
    // console.log(`timeZone -->`, timeZone);

    const userLocation = findFromCityStateProvince(`${location.city} ${location.countryRegion}`);
    console.log(`userLocation -->`, userLocation);

    if (userLocation && userLocation.length) {
        return Response.json(userLocation[0].timezone);
    } else {
        return Response.json("Timezone not found");
    }
}
