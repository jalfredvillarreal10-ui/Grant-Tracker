import React, { useState } from 'react';
import { Calendar, Download, FileSpreadsheet, FileText, X } from 'lucide-react';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Grant } from '../types/grant';

interface ReportingProps {
  grants: Grant[];
}

type TimelineEvent = {
  date: string;
  title: string;
  status: Grant['status'];
};

type ReportRow = {
  grantId: string;
  opportunityTitle: string;
  issuingAgency: string;
  totalAward: number;
  currentStatus: string;
  applicationDeadline: string;
  expirationDate: string;
  internalLead: string;
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

function formatFileDate() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
}

function getReportRows(items: Grant[]): ReportRow[] {
  return items.map((grant) => {
    const record = grant as Grant & {
      grant_number?: string;
      agency?: string;
    };

    return {
      grantId: record.grant_number ?? grant.funderId,
      opportunityTitle: grant.title,
      issuingAgency: record.agency ?? grant.source,
      totalAward: Number(grant.amount ?? 0),
      currentStatus: statusLabel[grant.status],
      applicationDeadline: grant.deadline ?? '',
      expirationDate: grant.expirationDate ?? 'N/A',
      internalLead: grant.internalLead ?? 'Unassigned',
    };
  });
}

const Reporting: React.FC<ReportingProps> = ({ grants }) => {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
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
    const reportRows = getReportRows(items);
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
      { header: 'Expiration Date', key: 'expirationDate', width: 18 },
      { header: 'Internal Lead', key: 'internalLead', width: 22 },
    ];

    reportRows.forEach((row) => {
      worksheet.addRow(row);
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
    worksheet.autoFilter = 'A1:H1';

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 4 ? 'right' : 'left',
        };
      });
    });

    const formattedDate = formatFileDate();

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

  const handleExportPdf = (items: Grant[]) => {
    const reportRows = getReportRows(items);
    const formattedDate = formatFileDate();
    const document = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'letter',
    });

    document.setProperties({
      title: 'Laredo Executive Grants Report',
      subject: 'Executive grants report',
      creator: 'LHGP Portal',
    });

    document.setFont('helvetica', 'bold');
    document.setFontSize(16);
    document.text('Laredo Executive Grants Report', 40, 42);

    document.setFont('helvetica', 'normal');
    document.setFontSize(9);
    document.setTextColor(90, 100, 116);
    document.text(`Generated ${formattedDate} | ${reportRows.length} grants`, 40, 60);

    autoTable(document, {
      startY: 82,
      head: [[
        'Grant ID',
        'Opportunity Title',
        'Issuing Agency',
        'Total Award',
        'Status',
        'Deadline',
        'Expiration',
        'Internal Lead',
      ]],
      body: reportRows.map((row) => [
        row.grantId,
        row.opportunityTitle,
        row.issuingAgency,
        formatCurrency(row.totalAward),
        row.currentStatus,
        row.applicationDeadline,
        row.expirationDate,
        row.internalLead,
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [0, 33, 88],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 4,
        valign: 'middle',
      },
      columnStyles: {
        0: { cellWidth: 82 },
        1: { cellWidth: 156 },
        2: { cellWidth: 128 },
        3: { cellWidth: 72, halign: 'right' },
        4: { cellWidth: 62 },
        5: { cellWidth: 64 },
        6: { cellWidth: 64 },
        7: { cellWidth: 74 },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: {
        left: 40,
        right: 40,
      },
      didDrawPage: () => {
        const pageNumber = document.getCurrentPageInfo().pageNumber;
        document.setFont('helvetica', 'normal');
        document.setFontSize(8);
        document.setTextColor(120, 130, 145);
        document.text(
          `Page ${pageNumber}`,
          document.internal.pageSize.getWidth() - 72,
          document.internal.pageSize.getHeight() - 24
        );
      },
    });

    document.save(`Laredo_Executive_Grants_Report_${formattedDate}.pdf`);
  };

  const handleExportFormat = async (format: 'xlsx' | 'pdf') => {
    setIsExportDialogOpen(false);

    if (format === 'xlsx') {
      await handleExportExcel(filteredGrants);
      return;
    }

    handleExportPdf(filteredGrants);
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
          className="flex items-center gap-2 rounded-[0.9rem] bg-laredo-navy px-[1.35rem] py-[0.9rem] font-bold text-white transition hover:brightness-110 dark:bg-laredo-gold-new dark:text-black"
          onClick={() => setIsExportDialogOpen(true)}
          style={{
            boxShadow: '0 18px 30px rgba(0, 45, 98, 0.16)',
          }}
        >
          <Download className="w-4 h-4" /> Export Executive Report
        </button>
      </header>

      {isExportDialogOpen && (
        <div
          role="presentation"
          onClick={() => setIsExportDialogOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-dialog-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(100%, 430px)',
              borderRadius: '0.75rem',
              border: '1px solid rgba(148, 163, 184, 0.22)',
              backgroundColor: 'var(--bg-card)',
              boxShadow: '0 24px 70px rgba(15, 23, 42, 0.24)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '1.1rem 1.25rem',
                borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
              }}
            >
              <h2
                id="export-dialog-title"
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                }}
              >
                Choose Export Format
              </h2>
              <button
                type="button"
                aria-label="Close export options"
                onClick={() => setIsExportDialogOpen(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '2rem',
                  height: '2rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '0.85rem',
                padding: '1.25rem',
              }}
            >
              <button
                type="button"
                onClick={() => void handleExportFormat('pdf')}
                style={{
                  display: 'flex',
                  minHeight: '7.5rem',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '0.8rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(148, 163, 184, 0.28)',
                  backgroundColor: 'var(--bg-panel)',
                  padding: '1rem',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <FileText size={24} color="#002158" />
                <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>PDF</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                  PDF Report
                </span>
              </button>

              <button
                type="button"
                onClick={() => void handleExportFormat('xlsx')}
                style={{
                  display: 'flex',
                  minHeight: '7.5rem',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '0.8rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(148, 163, 184, 0.28)',
                  backgroundColor: 'var(--bg-panel)',
                  padding: '1rem',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <FileSpreadsheet size={24} color="#007a3d" />
                <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>XLSX</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                  Editable spreadsheet
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

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
