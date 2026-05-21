import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import vfs from 'pdfmake/build/vfs_fonts';
import type {
  Content,
  ContentTable,
  CustomTableLayout,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { Hierarchy } from '../models/hierarchy.model';
import { Relation } from '../models/relation.model';
import {
  buildHierarchyWithRegistrations,
  HierarchyCategoryWithRegistrations,
} from '../utils/build-hierarchy-with-registrations.util';
import { EZ_RELATION_GROUP } from '../constants';

const HEADER_BG = '#B6DEEB';
const SUBCATEGORY_COLOR = '#7F7F7F';

const MAIN_TABLE_WIDTHS = [240, 70, 65, 50, 50, 60, '*'] as const;
const SUMMARY_TOTALS_WIDTHS = [200, 60, 60] as const;
const SUMMARY_INVOICES_WIDTHS = [80, 80, 80, '*'] as const;

let vfsInstalled = false;
const installVfsOnce = () => {
  if (vfsInstalled) return;
  pdfMake.addVirtualFileSystem(vfs);
  vfsInstalled = true;
};

@Injectable({ providedIn: 'root' })
export class RegistrationsPdfService {
  generate(
    relations: Relation[],
    hierarchy: Hierarchy,
    registrationDateUntil: Date,
  ): void {
    installVfsOnce();
    const dateLabel = formatDateDDMMYYYY(registrationDateUntil);
    const content: Content[] = relations.flatMap((relation, index) =>
      buildRelationPage(relation, hierarchy, dateLabel, index > 0),
    );

    const docDefinition: TDocumentDefinitions = {
      pageOrientation: 'landscape',
      pageSize: 'A4',
      pageMargins: [16, 16, 16, 16],
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      content,
    };

    pdfMake.createPdf(docDefinition).download('admin-pulse.pdf');
  }
}

const buildRelationPage = (
  relation: Relation,
  hierarchy: Hierarchy,
  dateLabel: string,
  breakBefore: boolean,
): Content[] => {
  const categories = buildHierarchyWithRegistrations(
    hierarchy,
    relation.registrations,
  );

  // Wrap each relation in a 1-column outer table whose first row is the
  // relation header. With headerRows: 1, pdfmake repeats that row at the top
  // of every page the table spans, so multi-page relations stay identified.
  // Spacing is encoded as per-row paddingBottom in the layout so it survives
  // the header-row repeat on subsequent pages.
  const wrapped: ContentTable = {
    table: {
      headerRows: 1,
      widths: ['*'],
      body: [
        [relationHeader(relation, dateLabel)],
        [mainTable(categories)],
        [summarySection(categories, relation)],
      ],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingTop: () => 0,
      paddingBottom: (rowIndex) => (rowIndex === 0 ? 8 : rowIndex === 1 ? 12 : 0),
      paddingLeft: () => 0,
      paddingRight: () => 0,
    },
  };

  return breakBefore ? [{ ...wrapped, pageBreak: 'before' }] : [wrapped];
};

const relationHeader = (relation: Relation, dateLabel: string): Content => {
  const codeOrId = relation.code || relation.uniqueIdentifier;
  const subline = relation.invoicedOnBehalfOfCodes?.length
    ? relation.invoicedOnBehalfOfCodes.join(', ')
    : '';
  const isEZ = relation.relationGroupName === EZ_RELATION_GROUP;

  const leftStack: Content[] = [
    { text: codeOrId, fontSize: 16 },
    ...(subline
      ? [{ text: subline, fontSize: 8, color: SUBCATEGORY_COLOR }]
      : []),
    ...(isEZ
      ? [
          {
            text: 'Ez zonder tijdsregistratie',
            fontSize: 8,
            color: SUBCATEGORY_COLOR,
          },
        ]
      : []),
  ];

  const centerStack: Content[] = [
    {
      text: relation.displayName,
      bold: true,
      fontSize: 13,
      alignment: 'center',
    },
    {
      text: relation.company?.name ?? '',
      fontSize: 8,
      color: SUBCATEGORY_COLOR,
      alignment: 'center',
    },
  ];

  return {
    table: {
      widths: [200, '*', 200],
      body: [
        [
          { stack: leftStack, border: [true, true, false, true] },
          { stack: centerStack, border: [false, true, false, true] },
          {
            text: `Prestaties tot en met: ${dateLabel}`,
            alignment: 'right',
            border: [false, true, true, true],
            margin: [0, 6, 0, 0],
          },
        ],
      ],
    },
    layout: {
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
  };
};

const mainTable = (
  categories: HierarchyCategoryWithRegistrations[],
): Content => {
  const headerRow: TableCell[] = [
    { text: 'Categorie en sub categorie', bold: true },
    { text: 'Medewerker', bold: true },
    { text: 'Datum', bold: true },
    { text: 'Tijd/aantal', bold: true, alignment: 'right' },
    { text: 'Tarief', bold: true, alignment: 'right' },
    { text: 'Ereloon', bold: true, alignment: 'right' },
    { text: 'Interne opmerking', bold: true },
  ];

  const body: TableCell[][] = [headerRow];

  for (const category of categories) {
    body.push([
      { text: category.category, bold: true, colSpan: 3 },
      {},
      {},
      { text: formatDecimal(category.duration), bold: true, alignment: 'right' },
      {},
      { text: formatDecimal(category.total), bold: true, alignment: 'right' },
      {},
    ]);

    for (const sub of category.subCategories) {
      body.push([
        { text: sub.subCategory, color: SUBCATEGORY_COLOR, bold: true, colSpan: 3 },
        {},
        {},
        {
          text: formatDecimal(sub.duration),
          color: SUBCATEGORY_COLOR,
          alignment: 'right',
        },
        {},
        {
          text: formatDecimal(sub.total),
          color: SUBCATEGORY_COLOR,
          alignment: 'right',
        },
        {},
      ]);

      for (const child of sub.children) {
        for (const reg of child.registrations) {
          const employee = (reg.user?.name ?? '').split(' ')[0];
          const valueDisplay = reg.duration
            ? formatDecimal(reg.duration / 60)
            : String(reg.quantity);
          const billable =
            (reg.duration ? reg.duration / 60 : reg.quantity) * reg.unitPrice;
          body.push([
            { text: child.child, fontSize: 8, margin: [12, 0, 0, 0] },
            { text: employee, fontSize: 8 },
            { text: formatRegistrationDate(reg.registrationDate), fontSize: 8 },
            { text: valueDisplay, fontSize: 8, alignment: 'right' },
            { text: formatDecimal(reg.unitPrice), fontSize: 8, alignment: 'right' },
            { text: formatDecimal(billable), fontSize: 8, alignment: 'right' },
            { text: reg.remarkInternal ?? '', fontSize: 8 },
          ]);
        }
      }
    }
  }

  return {
    table: {
      headerRows: 1,
      widths: [...MAIN_TABLE_WIDTHS],
      body,
    },
    layout: highlightHeaderLayout(),
  };
};

const summarySection = (
  categories: HierarchyCategoryWithRegistrations[],
  relation: Relation,
): Content => {
  const totalsBody: TableCell[][] = [
    [
      { text: 'Categorie', bold: true },
      { text: 'Tijd', bold: true, alignment: 'right' },
      { text: 'Ereloon', bold: true, alignment: 'right' },
    ],
    ...categories.map((c): TableCell[] => [
      { text: c.category },
      {
        text: `${c.quantity ? '* ' : ''}${formatDecimal(c.duration)}`,
        alignment: 'right',
      },
      { text: formatDecimal(c.total), alignment: 'right' },
    ]),
  ];

  const grandTotal = categories.reduce((acc, c) => acc + c.total, 0);
  const grandDuration = categories.reduce((acc, c) => acc + c.duration, 0);
  const grandQuantity = categories.reduce((acc, c) => acc + c.quantity, 0);
  totalsBody.push([
    { text: 'Totaal', bold: true },
    {
      text: `${grandQuantity ? '* ' : ''}${formatDecimal(grandDuration)}`,
      bold: true,
      alignment: 'right',
    },
    { text: formatDecimal(grandTotal), bold: true, alignment: 'right' },
  ]);

  const invoicesBody: TableCell[][] = [
    [
      { text: 'Nummer', bold: true },
      { text: 'Vervaldatum', bold: true },
      { text: 'Bedrag', bold: true, alignment: 'right' },
      { text: 'Betaald', bold: true },
    ],
    ...(relation.invoices ?? []).map((invoice): TableCell[] => [
      { text: invoice.invoiceNumber },
      {
        text: invoice.dueDateAsDate
          ? formatDateDDMMYYYY(invoice.dueDateAsDate)
          : '',
      },
      { text: formatDecimal(invoice.originalAmount), alignment: 'right' },
      { text: invoice.paid ? 'Ja' : 'Nee' },
    ]),
  ];

  const totalsTable: ContentTable = {
    table: {
      headerRows: 1,
      widths: [...SUMMARY_TOTALS_WIDTHS],
      body: totalsBody,
    },
    layout: highlightHeaderLayout(),
  };

  const invoicesTable: ContentTable = {
    table: {
      headerRows: 1,
      widths: [...SUMMARY_INVOICES_WIDTHS],
      body: invoicesBody,
    },
    layout: highlightHeaderLayout(),
  };

  return {
    columns: [totalsTable, invoicesTable],
    columnGap: 20,
  };
};

const highlightHeaderLayout = (): CustomTableLayout => ({
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  paddingTop: () => 3,
  paddingBottom: () => 3,
  paddingLeft: () => 6,
  paddingRight: () => 6,
  fillColor: (rowIndex) => (rowIndex === 0 ? HEADER_BG : null),
});

const formatDateDDMMYYYY = (date: Date): string => {
  const dd = `${date.getDate()}`.padStart(2, '0');
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
};

const formatRegistrationDate = (ddMMyyyy: string): string =>
  ddMMyyyy.length === 8
    ? `${ddMMyyyy.slice(0, 2)}/${ddMMyyyy.slice(2, 4)}/${ddMMyyyy.slice(4, 8)}`
    : ddMMyyyy;

const formatDecimal = (n: number): string =>
  n.toLocaleString('nl-BE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
