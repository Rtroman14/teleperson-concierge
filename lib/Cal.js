import dotenv from "dotenv";
import axios from "axios";
import { formatInTimeZone } from "date-fns-tz";
dotenv.config({ path: ".env.local" });

class Cal {
    constructor() {
        this.baseUrl = "https://api.cal.com/v2";
        this.apiKey = process.env.CAL_API_KEY;
    }

    fetchMe = async () => {
        try {
            const response = await axios({
                method: "GET",
                url: `${this.baseUrl}/me`,
                headers: {
                    Authorization: this.apiKey,
                },
            });

            return response.data;
        } catch (error) {
            console.error("fetchMe() -->", error.message);
            throw error;
        }
    };

    fetchCalendars = async () => {
        try {
            const response = await axios({
                method: "GET",
                url: `${this.baseUrl}/calendars`,
                headers: {
                    Authorization: this.apiKey,
                },
            });

            return response.data;
        } catch (error) {
            console.error("fetchCalendars() -->", error.message);
            throw error;
        }
    };

    fetchEventTypes = async () => {
        try {
            const response = await axios({
                method: "GET",
                url: `${this.baseUrl}/event-types`,
                headers: {
                    Authorization: this.apiKey,
                },
            });

            return response.data;
        } catch (error) {
            console.error("fetchEventTypes() -->", error.message);
            throw error;
        }
    };

    fetchBookings = async (params = {}) => {
        try {
            const response = await axios({
                method: "GET",
                url: `${this.baseUrl}/bookings`,
                headers: {
                    Authorization: this.apiKey,
                },
                params,
            });

            return response.data;
        } catch (error) {
            console.error("fetchBookings() -->", error.message);
            throw error;
        }
    };

    createBooking = async (bookingData) => {
        try {
            const response = await axios({
                method: "POST",
                url: `${this.baseUrl}/bookings`,
                headers: {
                    Authorization: this.apiKey,
                    "Content-Type": "application/json",
                    "cal-api-version": "2024-08-13",
                },
                data: bookingData,
            });

            return response.data;
        } catch (error) {
            console.error("createBooking() -->", error.message);
            console.error("Error details:", error.response?.data || "No details available");
            return {
                status: "error",
                message: error.message,
                details: error.response?.data,
            };
        }
    };

    fetchBusyTimes = async ({ loggedInUsersTz, dateFrom, dateTo, credentialId, externalId }) => {
        try {
            const response = await axios({
                method: "GET",
                url: `${this.baseUrl}/calendars/busy-times`,
                headers: {
                    Authorization: this.apiKey,
                },
                params: {
                    loggedInUsersTz, // e.g. "America/Denver"
                    dateFrom, // "YYYY-MM-DD"
                    dateTo, // "YYYY-MM-DD"
                    "calendarsToLoad[0][credentialId]": credentialId,
                    "calendarsToLoad[0][externalId]": externalId,
                },
            });

            return {
                success: true,
                data: response.data,
            };
        } catch (error) {
            console.error("fetchBusyTimes() -->", error.message);
            return {
                success: false,
                message: error.message,
            };
        }
    };

    convertBusyTimesToTimezone = (busyTimes, timezone = "America/Denver") => {
        return busyTimes.map((busy) => {
            const utcStart = new Date(busy.start);
            const utcEnd = new Date(busy.end);

            return {
                ...busy,
                utcStart: busy.start,
                utcEnd: busy.end,
                start: utcStart.toLocaleString("en-US", { timeZone: timezone }),
                end: utcEnd.toLocaleString("en-US", { timeZone: timezone }),
                timezone,
            };
        });
    };

    formatBusyTimes = (busyTimes, timezone = "America/Denver") => {
        return busyTimes.map((busy) => {
            const startDate = new Date(busy.start);
            const endDate = new Date(busy.end);

            return {
                ...busy,
                formattedDate: formatInTimeZone(startDate, timezone, "MMMM d, yyyy"),
                formattedTime: `${formatInTimeZone(
                    startDate,
                    timezone,
                    "h:mm a"
                )} - ${formatInTimeZone(endDate, timezone, "h:mm a")}`,
                formattedDateTime:
                    formatInTimeZone(startDate, timezone, "MMMM d, yyyy h:mm a") +
                    " - " +
                    formatInTimeZone(endDate, timezone, "h:mm a"),
                timezone,
            };
        });
    };

    fetchSchedules = async () => {
        try {
            const response = await axios({
                method: "GET",
                url: `${this.baseUrl}/schedules`,
                headers: {
                    Authorization: this.apiKey,
                    "cal-api-version": "2024-08-13",
                },
            });

            return response.data;
        } catch (error) {
            console.error("fetchSchedules() -->", error.message);
            throw error;
        }
    };
}

export default new Cal();
