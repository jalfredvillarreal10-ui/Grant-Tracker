# Project Description: Laredo Health Grant Pulse (LHGP)
Project Name: Laredo Health Grant Pulse (LHGP)
Target User: City of Laredo Public Health Department Administration
Core Purpose: A segmented, high-security management portal designed to identify, track, and secure high-value healthcare funding opportunities through a focused lifecycle approach.
# 1. Executive Summary
The Laredo Health Grant Pulse (LHGP) is a specialized web-based management system built for the City of Laredo Public Health Department. Unlike generic grant trackers, LHGP is strictly curated for high-impact healthcare grants (targets of $150,000+). The platform utilizes a segmented navigation system to guide administrators through the three distinct phases of funding: Discovery (Available), Lifecycle (Applied), and Portfolio Management (Approved).
# 2. User Authentication & Access
- Secure Gateway: A streamlined landing page requiring a department-authorized email address (City of Laredo domain).
- Strict Access Control: No public registration. Accounts are provisioned by the Lead Administrator.
- Persistent Session Management: Users remain authenticated for the duration of their shift, with a persistent "Sign Out" button located in the top-right corner of the global navigation bar.
- Global Navigation: A persistent sidebar or top navigation menu allows one-click switching between the three core grant modules and the reporting center.
# 3. The Segmented Management Hub
To eliminate visual clutter, the platform is divided into three dedicated pages. Each page features a unique UI optimized for the specific goals of that grant stage.
- A. The Discovery Page (Available Grants)
    Purpose: Identifying the next major funding win for the City.
    Data Threshold: Automatically filters and displays only healthcare-related grants with a minimum value of $150,000.
    * UI Layout: High-density list or "card view" highlighting the financial reward.
    * Primary Sort: Value/Benefit (Descending) – The highest-paying grants always sit at the top.
    * Unique Columns:
      + Grant Title & Funder ID.
      + Funding Source (Federal, State, or Private).
      + Award Floor/Ceiling.
      + Application Deadline (with a "Days Remaining" countdown).
    * Action Button: A "Move to Applied" button that triggers a pop-up to input the submission date, shifting the record to the next page.
- B. The Lifecycle Page (Applied/Pending Grants)
    * Purpose: Monitoring submitted applications and managing follow-ups.
    * UI Layout: Focuses on the timeline and communication status.
    * Primary Sort: Application Closing Date (Ascending) – Helps staff track which decisions are expected soonest.
    * Key Data Points:
      + Submission Date.
      + Expected Decision/Notification Date.
      + Point of Contact at the Granting Agency.
      + Internal Lead (The staff member who wrote the grant).
    * Status Tracking: Visual progress bar (e.g., Submitted → Under Review → Interview/Clarification Phase).
- C. The Portfolio Page (Approved/Awarded Grants)
    Purpose: Active management of secured funds to ensure compliance, track spending milestones, and prevent the expiration of high-value resources.
    Primary Sort: Expiration Date (Soonest First) – This maintains the "Urgency Focus" to prevent funding loss.
    The "Active Portfolio" Dropdown Menu:
    Located at the top-left of the page, this menu allows administrators to filter the list of awarded grants by operational status:
    * View All Active Awards: (Default) Shows all currently funded grants.
    * Recently Awarded: Focuses on grants secured within the last 90 days (Onboarding phase).
    * Under Extension: Highlights grants where a "Renewal" or "No-Cost Extension" has been filed.
    * Successfully Closed: A historical dropdown to view completed grants for audit purposes.
    UI Layout & High-Value Columns:
    To manage complex healthcare funding, the awarded list includes specific data points not found on other pages:
    * Total Award Amount ($): The full contract value.
    * Spending Burn Rate: A visual percentage bar showing funds utilized vs. time elapsed.
    * Compliance Category: (e.g., Clinical Services, Infrastructure, Workforce Development).
    * Assigned Program Manager: The specific department head responsible for the funds.
    * Reporting Milestones: A "Next Report Due" date column with a direct link to the funder’s portal.
    Action Buttons for Awarded Grants:
    * "Initiate Renewal": Shifts the grant into a "Renewal Pending" status, creating a duplicate entry back in the Lifecycle (Applied) tab for the next cycle.
    * "Closeout Checklist": Triggers a pop-up with a standard City of Laredo protocol for finalizing high-value accounts.
# 4. Automated "Urgency Trigger" Notification System
To ensure the department never loses a funding stream due to administrative oversight, LHGP features an automated email relay system tied specifically to the Portfolio (Approved) page:
- T-Minus 7 Days: An automated "Reminder" email is sent to the Department Head and the assigned Program Manager.
- T-Minus 1 Day: A "Final Notice" email is sent 24 hours before expiration to ensure final reporting or budget draw-downs are completed.
- Day of Expiration: A "Termination Notice" email is sent the morning of the expiration date, and the grant is moved to the "Archived" section.
# 5. Advanced Reporting & Master Visualization
- The Master Timeline: A dedicated page featuring a unified calendar view. This merges deadlines from all three pages (Application Deadlines, Decision Dates, and Expiration Dates) into one chronological master schedule.
- Executive Export Module: A tool for generating PDF/CSV reports for City Council or Health Board meetings.
    * Content: Summary of total funding secured, a pipeline of pending funds ($), and a risk assessment of grants expiring in the next quarter.
# 6. Technical Specifications (UI/UX)
- City Branding: The interface utilizes the official City of Laredo color palette (Navy, White, and Gold accents) for a professional, institutional feel.
- High-Value Highlighting: Any grant over $500,000 receives a "Premium Opportunity" visual badge across all pages.
- Responsive Architecture: Fully optimized for desktop (office use) and tablets (on-site health inspections or meetings).
- Data Integrity: Each page includes a "Refresh Data" trigger to pull the latest updates from the grant database.
# 7. Technical Specification Addendum: The "Awarded" UX
- Visual Urgency: Grants appearing in the "Approved" list that are within 30 days of expiration are pinned to the top of the list regardless of other filters, ensuring they are never missed.
- The "Laredo Gold" Badge: Any awarded grant with a total value exceeding $500,000 features a persistent Gold Badge in the list view, signaling its status as a "Departmental Priority Asset."
- Export Functionality: The Awarded list includes a "Quick Export" button to generate a Monthly Grant Status Report specifically for the Health Department Director.

# Summary of Logic Rules for Developers
| Page/Link | Primary Sort | Objective | Key UI Focus | Dropdown/Filter Content |
| --------- | ------------ | --------- | ------------ | ----------------------- |
| Available | Reward Amount (High to Low) | Prioritize ROI | Financial Value & Eligibility | Filter by Source (Federal/State/Private) |
| Applied | Deadline (Soonest First) | Monitor Pipeline | Follow-up & Decision Dates | Filter by Internal Lead (Staff Member) |
| Approved | Expiration Date (Soonest First) | Compliance & Renewal | Urgency & Burn Rate | Filter by Award Status (Active/Closed/Renewal) |


## License  

[MIT](LICENSE)
