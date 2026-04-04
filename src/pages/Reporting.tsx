import React from 'react';
import { Calendar, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import type { Grant } from '../types/grant';

interface ReportingProps {
  grants: Grant[];
}

const Reporting: React.FC<ReportingProps> = ({ grants }) => {
  const filteredGrants = grants;

  // Combine all important dates for the timeline
  const timelineEvents = grants.flatMap(g => {
    const events = [];
    if (g.deadline) events.push({ date: g.deadline, type: 'Deadline', title: g.title, status: g.status });
    if (g.expectedNotificationDate) events.push({ date: g.expectedNotificationDate, type: 'Decision', title: g.title, status: g.status });
    if (g.expirationDate) events.push({ date: g.expirationDate, type: 'Expiration', title: g.title, status: g.status });
    return events;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalFunds = grants.filter(g => g.status === 'approved').reduce((acc, g) => acc + g.amount, 0);
  const pendingFunds = grants.filter(g => g.status === 'applied').reduce((acc, g) => acc + g.amount, 0);

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
    <div className="flex flex-col gap-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Master Insights & Reporting</h1>
          <p className="text-zinc-500">Unified visualization of the funding pipeline.</p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => handleExportExcel(filteredGrants)}
        >
          <Download className="w-4 h-4" /> Export Executive Excel
        </button>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-900">
          <span className="text-xs font-bold text-zinc-400 uppercase">Total Secured</span>
          <h3 className="text-2xl font-bold text-zinc-900">${totalFunds.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-zinc-400">
          <span className="text-xs font-bold text-zinc-400 uppercase">Pipeline Value</span>
          <h3 className="text-2xl font-bold text-zinc-900">${pendingFunds.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-red-600">
          <span className="text-xs font-bold text-zinc-400 uppercase">Risk Level</span>
          <h3 className="text-2xl font-bold text-red-600">Moderate</h3>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-lg">
        <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5" /> Master Chronological Timeline
        </h2>
        <div className="flex flex-col gap-4">
          {timelineEvents.map((event, i) => (
            <div key={i} className="flex gap-4 items-center p-4 border-b border-zinc-50 last:border-0 hover:bg-zinc-50 rounded-lg transition-colors">
              <div className="min-w-[100px] text-sm font-bold text-blue-900">{event.date}</div>
              <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                event.type === 'Deadline' ? 'bg-zinc-100' : 
                event.type === 'Decision' ? 'bg-blue-100 text-blue-900' : 'bg-red-100 text-red-600'
              }`}>
                {event.type}
              </div>
              <div className="flex-1 font-medium">{event.title}</div>
              <div className="text-xs text-zinc-400 capitalize">{event.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reporting;
