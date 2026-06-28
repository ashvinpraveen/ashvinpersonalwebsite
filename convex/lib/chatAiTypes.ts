export type BookingToolCall =
  | {
      name: "check_booking_availability";
      args: {
        dateFrom: string;
        dateTo: string;
        timeZone: string;
        preferredStart?: string;
      };
    }
  | {
      name: "create_calendar_booking";
      args: {
        start: string;
        attendeeName: string;
        attendeeEmail: string;
        attendeeTimeZone: string;
        notes?: string;
      };
    };

export type CalSlot = {
  start: string;
  end?: string;
};
