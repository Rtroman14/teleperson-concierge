// {"status":"success","data":{"id":1537157,"email":"ryan@webagent.ai","timeFormat":12,"defaultScheduleId":661792,"weekStart":"Sunday","timeZone":"America/Denver","username":"webagent","organizationId":null}}

// * Bookings
// https://cal.com/docs/api-reference/v2/bookings/get-all-bookings

// Fetch calendars and extract credential information
import cal from "../lib/Cal.js";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";

// Function to fetch calendars and print their details
const fetchCalendars = async () => {
    try {
        const calendarsResponse = await cal.fetchCalendars();

        // Extract credentialId and externalId from the primary calendar
        const primaryCalendar = calendarsResponse.data.connectedCalendars[0].primary;
        const credentialId = primaryCalendar.credentialId;
        const externalId = primaryCalendar.externalId;

        return { credentialId, externalId };
    } catch (error) {
        console.error("Error fetching calendars:", error);
        throw error;
    }
};

const fetchBusyTimes = async ({ timeZone, targetDate }) => {
    try {
        // Fetch calendars and get credentials
        const { credentialId, externalId } = await fetchCalendars();

        const startDate = new Date(`${targetDate}T00:00:00`);
        const endDate = new Date(`${targetDate}T23:59:59`);

        // Format the dates with time component
        const dateFrom = formatInTimeZone(startDate, timeZone, "yyyy-MM-dd'T'HH:mm:ss");
        const dateTo = formatInTimeZone(endDate, timeZone, "yyyy-MM-dd'T'HH:mm:ss");

        const busyTimesResponse = await cal.fetchBusyTimes({
            loggedInUsersTz: timeZone,
            dateFrom,
            dateTo,
            credentialId,
            externalId,
        });

        if (!busyTimesResponse.success) throw new Error(busyTimesResponse.message);

        const busyTimes = busyTimesResponse.data.data.map((meeting) => ({
            start: formatInTimeZone(
                new Date(meeting.start),
                timeZone,
                "EEEE, MMMM do, yyyy 'at' h:mm a"
            ),
            end: formatInTimeZone(
                new Date(meeting.end),
                timeZone,
                "EEEE, MMMM do, yyyy 'at' h:mm a"
            ),
        }));

        return busyTimes;
    } catch (error) {
        console.error(error);
        return {
            success: false,
            message: error.message,
        };
    }
};

const checkCalendar = async () => {
    try {
        const timeZone = "America/Denver";
        const targetDate = "2025-05-20";

        const busyTimes = await fetchBusyTimes({ timeZone, targetDate });

        console.log(busyTimes);
    } catch (error) {
        console.error("Main execution error:", error);
    }
};

const createBooking = async () => {
    try {
        // Create booking on 2025-05-21
        const bookingDate = "2025-05-21";
        const timeZone = "America/Denver";
        const startTime = "09:00";

        // Create a zoned time for 9:00 AM Denver time
        const localtime = toZonedTime(new Date(`${bookingDate}T${startTime}:00`), timeZone);

        // Convert to UTC ISO string
        const startTimeUTC = localtime.toISOString();

        const bookingData = {
            start: startTimeUTC,
            attendee: {
                name: "Ryan Roman",
                email: "rtroman14@gmail.com",
                timeZone: timeZone,
            },
            // eventTypeSlug: "30min",
            // username: "webagent",
            eventTypeId: 2485287,
            metadata: {
                summary: "",
            },
        };

        console.log("Attempting to book meeting for:", startTimeUTC);
        const response = await cal.createBooking(bookingData);

        console.log("Booking response:", response);
    } catch (error) {
        console.error("Error creating booking:", error);
    }
};

createBooking();

// checkCalendar();
