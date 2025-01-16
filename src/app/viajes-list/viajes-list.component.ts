import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Filesystem, Directory } from '@capacitor/filesystem';

@Component({
  selector: 'app-viajes-list',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './viajes-list.component.html',
  styleUrls: ['./viajes-list.component.scss']
})
export class ViajesListComponent implements OnInit {
  travelFiles: string[] = [];

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

      this.travelFiles = result.files.map(fileInfo => fileInfo.name);
      console.log('Archivos de viaje:', this.travelFiles);
    } catch (error) {
      console.error('Error al leer los archivos de viaje:', error);
    }
  }
}