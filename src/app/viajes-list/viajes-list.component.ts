import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { format, parse } from 'date-fns';

interface TravelFile {
  name: string;
  displayName: string;
  date: Date; // Añadir la propiedad date
}

@Component({
  selector: 'app-viajes-list',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './viajes-list.component.html',
  styleUrls: ['./viajes-list.component.scss']
})
export class ViajesListComponent implements OnInit {
  travelFiles: TravelFile[] = [];

  constructor() {}

  ngOnInit() {
    this.loadTravelFiles();
  }

  async loadTravelFiles() {
    try {
      const result = await Filesystem.readdir({
        path: 'Travels',
        directory: Directory.Documents
      });
  
      if (result.files.length === 0) {
        console.warn('VIAJES LIST - No se encontraron archivos en el directorio Travels.');
      }
  
      // Procesar los nombres de archivo para extraer y formatear la fecha
      this.travelFiles = result.files.map(fileInfo => {
        const date = this.extractDateFromFileName(fileInfo.name);
        const formattedDate = format(date, 'PPpp');
        return { name: fileInfo.name, displayName: formattedDate, date: date };
      });
  
      // Ordenar por fecha descendente
      this.travelFiles.sort((a, b) => b.date.getTime() - a.date.getTime());
  
      console.log('VIAJES LIST - archivos de viaje:', this.travelFiles);
    } catch (error) {
      console.error('VIAJES LIST - Error al leer los archivos de viaje:', error);
    }
  }

  
  extractDateFromFileName(fileName: string): Date {
    try {
      const dateString = fileName.replace('travel_', '').replace('.csv', '');
      console.log('Procesando fecha:', dateString);
      return parse(dateString, "yyyy-MM-dd'T'HH-mm-ss", new Date());
    } catch (error) {
      console.error('VIAJES LIST - Error al extraer la fecha del nombre del archivo:', fileName, error);
      return new Date(); // Retorna una fecha por defecto en caso de error
    }
  }

  async deleteTravelFile(fileName: string) {
    try {
      await Filesystem.deleteFile({
        path: `Travels/${fileName}`,
        directory: Directory.Documents
      });
      console.log(`VIAJES LIST - Archivo ${fileName} eliminado.`);
      this.loadTravelFiles(); // Recargar la lista de archivos
    } catch (error) {
      console.error('VIAJES LIST - Error al eliminar el archivo:', error);
    }
  }
}