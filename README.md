Project Name: Laredo Health Grant Pulse (LHGP)
Target User: City of Laredo Public Health Department Administration
Core Purpose: A centralized management portal to identify, track, and secure high-value healthcare funding opportunities.
1. Executive Summary
The Laredo Health Grant Pulse (LHGP) is a specialized web-based management system designed for the City of Laredo Public Health Department. The platform streamlines the grant lifecycle—from discovery to expiration—with a strict focus on high-impact healthcare grants (targets of $150,000+). By automating deadline tracking and notification triggers, LHGP ensures the department never loses a funding window or misses a compliance deadline.
2. User Authentication & Access
Secure Email Login: A streamlined landing page requiring a department-authorized email address. No public access is permitted.
Session Management: Once authenticated, users remain logged in for their work session, with a visible "Sign Out" option available in the global navigation bar at all times.
3. The Central Dashboard
The core interface is a three-pillar dashboard designed for rapid status assessment.
A. Available Grants (Discovery)
Filtering: Specifically aggregates healthcare grants with a minimum award value of $150,000.
Sorting Logic: Primarily ordered by "Value/Benefit" (highest award amount first) to ensure high-priority opportunities are seen first.
Data Points: Displays grant title, funding source, award amount, and the application deadline.
B. Applied Grants (Pending)
Status Tracking: Shows all grants where an application has been submitted but a decision is pending.
Sorting Logic: Ordered by "Application Closing Date" and award value.
Information View: Includes submission date and expected notification date.
C. Approved Grants (Management)
Focus: Active funding currently being utilized by the department.
Sorting Logic: Ordered by "Expiration Date" (Soonest First). This "Urgency Sort" ensures staff are aware of which funding sources are ending soonest to facilitate timely renewals or budget shifts.
4. Automated Compliance & Notification System
To prevent the loss of funding, the system features a built-in "Urgency Trigger" for Approved Grants:
T-Minus 7 Days: An automated email is sent to the user/leadership notifying them that a grant expires in one week.
T-Minus 1 Day: A "Final Notice" email is sent 24 hours before expiration.
Day of Expiration: A "Termination Notice" email is sent the morning of the expiration date.
5. Advanced Reporting & Deadline Visualization
Deadline Dashboard: A dedicated calendar or timeline view that merges deadlines from all three categories (Available, Applied, and Approved) into a single chronological master schedule.
Exportable Leadership Reports: A specialized module where users can generate high-level reports.
Format: Exportable as PDF or CSV.
Content: Summary of total funding secured, upcoming high-value opportunities, and a list of grants expiring within the next quarter.
6. Technical Specifications (UI/UX)
Front-End Priority: A clean, professional interface using the City of Laredo’s color palette.
Responsive Design: Optimized for desktop use in the office and tablet use during field meetings.
Information Hierarchy: High-value grants ($150k+) are visually highlighted with badges or distinct borders to draw immediate attention.
Summary of Sorting & Logic Rules for Developers:
Category	Primary Sort	Purpose
Available	Reward Amount (Descending)	Prioritize the biggest financial wins.
Applied	Deadline (Ascending)	Keep track of upcoming decision dates.
Approved	Expiration Date (Soonest First)	Prevent funding lapses and ensure compliance.

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)
