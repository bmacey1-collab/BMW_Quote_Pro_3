# Alpha 6 Architecture

One `state` object is the source of truth for the customer, vehicle, trade, fees, incentives, scenarios, notes, and presentation settings.

The customer quote and manager worksheet render directly from that state. Saving stores the complete state as JSON. No hidden legacy form fields are used.
