import React from 'react';
import { Calendar, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import type { Grant } from '../types/grant';

interface ReportingProps {
  grants: Grant[];
}

type TimelineEvent = {
  date: string;
  title: string;
  status: Grant['status'];
};

const statusLabel: Record<Grant['status'], string> = {
  available: 'Available',
  applied: 'Applied',
  approved: 'Approved',
  archived: 'Archived',
  denied: 'Denied',
  withdrawn: 'Withdrawn',
  closed: 'Closed',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatExactDate(value: string) {
  const normalized = `${value}T00:00:00`;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

const Reporting: React.FC<ReportingProps> = ({ grants }) => {
  const filteredGrants = grants;

  const timelineEvents: TimelineEvent[] = grants
    .filter((grant) => Boolean(grant.deadline))
    .map((grant) => ({
      date: grant.deadline as string,
      title: grant.title,
      status: grant.status,
    }))
    .sort((a, b) => new Date(`${a.date}T00:00:00`).getTime() - new Date(`${b.date}T00:00:00`).getTime());

  const totalSecured = grants
    .filter((grant) => grant.status === 'approved')
    .reduce((accumulator, grant) => accumulator + Number(grant.amount || 0), 0);

  const handleExportExcel = async (items: Grant[]) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Executive Grants', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    worksheet.columns = [
      { header: 'Grant ID', key: 'grantId', width: 35 },
      { header: 'Opportunity Title', key: 'opportunityTitle', width: 60 },
      { header: 'Issuing Agency', key: 'issuingAgency', width: 50 },
      { header: 'Total Award', key: 'totalAward', width: 16 },
      { header: 'Current Status', key: 'currentStatus', width: 18 },
      { header: 'Application Deadline', key: 'applicationDeadline', width: 18 },
      { header: 'Internal Lead', key: 'internalLead', width: 22 },
    ];

    items.forEach((grant) => {
      const record = grant as Grant & {
        grant_number?: string;
        agency?: string;
      };

      worksheet.addRow({
        grantId: record.grant_number ?? grant.funderId,
        opportunityTitle: grant.title,
        issuingAgency: record.agency ?? grant.source,
        totalAward: Number(grant.amount ?? 0),
        currentStatus: grant.status.charAt(0).toUpperCase() + grant.status.slice(1),
        applicationDeadline: grant.deadline ?? '',
        internalLead: grant.internalLead ?? 'Unassigned',
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF002158' },
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9E2F2' } },
        left: { style: 'thin', color: { argb: 'FFD9E2F2' } },
        bottom: { style: 'thin', color: { argb: 'FFD9E2F2' } },
        right: { style: 'thin', color: { argb: 'FFD9E2F2' } },
      };
    });

    worksheet.getColumn('totalAward').numFmt = '$#,##0.00';
    worksheet.autoFilter = 'A1:G1';

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 4 ? 'right' : 'left',
        };
      });
    });

    const today = new Date();
    const formattedDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob(
      [buffer],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laredo_Executive_Grants_Report_${formattedDate}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        minHeight: 'calc(100vh - 8rem)',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '2.25rem',
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
            }}
          >
            Master Insights & Reporting
          </h1>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => handleExportExcel(filteredGrants)}
          style={{
            padding: '0.9rem 1.35rem',
            borderRadius: '0.9rem',
            boxShadow: '0 18px 30px rgba(0, 45, 98, 0.16)',
          }}
        >
          <Download className="w-4 h-4" /> Export Executive Excel
        </button>
      </header>

      <section
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          borderRadius: '1.75rem',
          padding: '2rem 2.25rem',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div
          style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#94a3b8',
            marginBottom: '0.9rem',
          }}
        >
          TOTAL SECURED
        </div>
        <div
          style={{
            fontSize: 'clamp(1.9rem, 3vw, 2.75rem)',
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: '-0.05em',
            color: '#0f172a',
          }}
        >
          {formatCurrency(totalSecured)}
        </div>
      </section>

      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          backgroundColor: 'var(--bg-card)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          borderRadius: '1.75rem',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1.5rem 1.75rem',
            borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
          }}
        >
          <Calendar size={20} color="#0f172a" />
          <h2
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 750,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            Master Chronological Timeline
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {timelineEvents.length === 0 ? (
            <div
              style={{
                padding: '2rem 1.75rem',
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
              }}
            >
              No timeline entries are available yet.
            </div>
          ) : (
            timelineEvents.map((event, index) => (
              <div
                key={`${event.title}-${event.date}-${index}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(170px, 220px) minmax(110px, 130px) minmax(0, 1fr) minmax(90px, 120px)',
                  gap: '1rem',
                  alignItems: 'center',
                  padding: '1.1rem 1.75rem',
                  borderBottom: index === timelineEvents.length - 1 ? 'none' : '1px solid rgba(148, 163, 184, 0.12)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    color: 'var(--text-primary)',
                  }}
                >
                  {formatExactDate(event.date)}
                </div>

                <div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '88px',
                      padding: '0.38rem 0.7rem',
                      borderRadius: '999px',
                      backgroundColor: '#eef2f6',
                      color: '#64748b',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Deadline
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '0.98rem',
                    fontWeight: 650,
                    color: 'var(--text-primary)',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}
                >
                  {event.title}
                </div>

                <div
                  style={{
                    fontSize: '0.83rem',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    color: '#94a3b8',
                    justifySelf: 'start',
                  }}
                >
                  {statusLabel[event.status]}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Reporting;
