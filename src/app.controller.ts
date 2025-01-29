import { Controller, Get, Post, UseInterceptors, UploadedFiles, Render, Res } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { Response } from 'express';
import * as fs from 'fs';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Render('index')
  renderForm() {
    return { message: 'Upload an Excel and TXT file' };
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 2, { dest: 'uploads/' }))
  async handleFileUpload(@UploadedFiles() files: Array<{ path: string; mimetype: string }>, @Res() res: Response) {
    const excelFile = files.find(f => f.mimetype.includes('spreadsheetml'));
    const txtFile = files.find(f => f.mimetype.includes('text/plain'));

    if (!excelFile || !txtFile) throw new Error('Both files are required');

    this.appService.parseCategories(txtFile.path);
    this.appService.processExcel(excelFile.path);

    // Przechowujemy dane w serwisie, aby mogły zostać pobrane przez widok
    this.appService.getProcessedData();

    // Przekierowanie na stronę `/records`
    res.redirect('/records');
  }

  @Get('records')
  @Render('records')
  async showRecords() {
    const data = this.appService.getProcessedData();
    return { records: data };
  }

  @Get('export')
  async exportProcessedData(@Res() res: Response) {
    const filePath = this.appService.exportExcel();
    res.download(filePath, 'processed_data.xlsx', (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
    });
  }
}
