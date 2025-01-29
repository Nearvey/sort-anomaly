import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class AppService {
  private categories: Record<string, Record<string, string[]>> = {};
  private processedData: any[] = [];
  private excelFilePath: string;

  // Parsowanie pliku .txt z kategoriami
  parseCategories(filePath: string) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const categoryRegex = /(\w+)\s*\{([^}]+)\}/g;
    const subcategoryRegex = /(\w+)\("([^"]+)"(?:,\s*"([^"]+)")*\)/g;

    let match;
    while ((match = categoryRegex.exec(content)) !== null) {
      const category = match[1];
      const subcategories = match[2];

      if (!this.categories[category]) this.categories[category] = {};

      let subMatch;
      while ((subMatch = subcategoryRegex.exec(subcategories)) !== null) {
        const subcategory = subMatch[1];
        const keywords = subMatch.slice(2).filter(Boolean);
        this.categories[category][subcategory] = keywords;
      }
    }
  }

  // Przetwarzanie pliku XLSX
  processExcel(filePath: string) {
    this.excelFilePath = filePath;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let data: any[] = XLSX.utils.sheet_to_json(sheet);

    // Sprawdzenie, czy istnieje kolumna TAGS
    if (!data.length || !Object.keys(data[0]).includes('TAGS')) {
      data = data.map(row => ({ ...row, TAGS: '' }));
    }

    // Przetwarzanie danych
    data.forEach(row => {
      let tags = new Set<string>();
      for (const category in this.categories) {
        for (const subcategory in this.categories[category]) {
          const keywords = this.categories[category][subcategory];
          for (const keyword of keywords) {
            for (const field in row) {
              if (typeof row[field] === 'string' && row[field].toLowerCase().includes(keyword.toLowerCase())) {
                tags.add(`${category}, ${subcategory}`);
              }
            }
          }
        }
      }
      row['TAGS'] = [...tags].join(', ');
    });

    this.processedData = data;
  }

  // Pobranie przetworzonych danych do widoku
  getProcessedData() {
    return this.processedData;
  }

  // Eksport przetworzonego pliku
  exportExcel() {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(this.processedData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Processed Data');

    const exportPath = join(__dirname, '..', 'exports', 'processed_data.xlsx');
    if (!fs.existsSync(join(__dirname, '..', 'exports'))) {
      fs.mkdirSync(join(__dirname, '..', 'exports'));
    }

    XLSX.writeFile(workbook, exportPath);
    return exportPath;
  }
}
