import { Component, AfterViewInit } from '@angular/core';
import { Gesture, GestureController } from '@ionic/angular';;
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { BleClient, numbersToDataView, ScanResult } from '@capacitor-community/bluetooth-le';
import { Geolocation } from '@capacitor/geolocation';
import { NgZone } from '@angular/core';
import {
  SERVICE_UUID,
  CHARACTERISTIC_UUID,
} from '../../config/constants';

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';


@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]  // Asegúrate de incluir IonicModule aquí
})

export class HomePage implements AfterViewInit {
  lat: number = 0;
  lon: number = 0;
  initiaLat: number = 0;
  initiaLon: number = 0;
  speed: number = 0;
  altitude: number = 0;
  heading: number = 0;
  accelX: number = 0;
  accelY: number = 0;
  accelXNG: number = 0;
  accelYNG: number = 0;
  BatteryV: number = 0;
  BatteryP: number = 0;
  Satellite: number = 0;
  GiroX: number = 0;
  GiroY: number = 0;
  GiroZ: number = 0;
  MaxAcellX: number = 0;
  MaxAcellY: number = 0;


  accelZ: number = 0;
  pitch: number = 0;
  roll: number = 0;
  pitchESP: number = 0;
  rollESP: number = 0;

  // Variables para guardar las lecturas iniciales (niveladas)
  initialPitch: number = 0;
  initialRoll: number = 0;
  isLevelingDone: boolean = false;
  

  map: L.Map | null = null; // Inicializar map como null
  marker: L.Marker | null = null; // Inicializar marker como null
  track: L.Polyline | null = null;

  coordinates: L.LatLng[] = [];

  maxSpeed: number = 0;
  maxAltitude: number = 0;
  totalDistance: number = 0;
  prevLat: number | null = null;
  prevLon: number | null = null;
  //deviceId: string; // Definir deviceId como propiedad de la clase
  gpsMessage: string = '';
  mpuMessage: string = '';

  data: string = '';  // Declara la propiedad 'data' aquí
  deviceId = '24:EC:4A:28:32:CD'; // Dirección MAC del ESP32


  // Variable para el nombre del archivo
  // Inicializar travelFileName
  travelFileName: string = '';
  private isConnected = false; // Variable para rastrear el estado de conexión



  constructor(private gestureCtrl: GestureController, private router: Router, private zone: NgZone) {}

  ngAfterViewInit() {
    const gesture: Gesture = this.gestureCtrl.create({
      el: document.querySelector('app-home')!,
      gestureName: 'swipe',
      onEnd: ev => {
        if (ev.deltaX < -50) { // Deslizar hacia la izquierda
          // Usar NgZone para navegar dentro del contexto de Angular
          this.zone.run(() => {
            this.router.navigateByUrl('/viajes-list');
          });
        }
      }
    });
    gesture.enable();
  }
  

  ngOnInit() {

    KeepAwake.keepAwake(); // Mantener la pantalla encendida
    this.createTravelDirectory();
    // Iniciar el bucle de conexión
    this.startConnectionLoop();

    // Iniciar el procesamiento de datos
    this.startDataProcessing();
    
    
    // Iniciar la actualización del GPS cada segundo
    this.startGPS();
    this.initMap();
    this.startNewTravel();
    this.checkAndRequestPermissions();
     
  }
  
  ngOnDestroy() {
    KeepAwake.allowSleep(); // Permitir que la pantalla se apague cuando se cierra la vista
  }



  goToViajesList() {
    this.router.navigate(['/viajes-list']);
  }
  
  // Manejo del bluetooth

  startConnectionLoop() {
  // Ejecutar cada 5 segundos para intentar reconectar si no está conectado
  setInterval(() => {
    if (!this.isConnected) {
      console.log('Intentando conectar al dispositivo BLE...');
      this.connectToDevice(this.deviceId);
    }
  }, 5000); // 5 segundos
}

async setupNotifications(deviceId: string) {
  const serviceUUID = SERVICE_UUID; // UUID del servicio
  const characteristicUUID = CHARACTERISTIC_UUID; // UUID de la característica

  try {
    await BleClient.startNotifications(deviceId, serviceUUID, characteristicUUID, (value) => {
      const decoder = new TextDecoder();
      const data = decoder.decode(value.buffer);
      console.log('Datos recibidos:', data);
      this.processData(data); // Procesar los datos recibidos
    });
    console.log('Notificaciones iniciadas');
  } catch (notificationError) {
    console.error('Error al establecer notificaciones:', notificationError);
    this.isConnected = false; // Marcar como desconectado si falla
  }
}

async connectToDevice(deviceId: string) {
  try {
    await BleClient.initialize();
    console.log('BLE Client inicializado');

    await BleClient.connect(deviceId);
    console.log('Conectado al dispositivo:', deviceId);
    this.isConnected = true;

    // Configurar notificaciones
    await this.setupNotifications(deviceId);

  } catch (error) {
    console.error('Error al conectar:', error);
    this.isConnected = false; // Marcar como desconectado si falla
  }
}

  // Localizacion del telefono

  async getPhoneLocation() {
    const coordinates = await Geolocation.getCurrentPosition();
    const { latitude, longitude } = coordinates.coords;
    console.log('Ubicación inicial desde el teléfono:', latitude, longitude);
  
    // Puedes usar estas coordenadas como las iniciales
    this.lat = latitude;
    this.lon = longitude;
  }


  // Iniciar el procesamiento de datos cada 100 ms
  startDataProcessing() {
    setInterval(() => {
      if (this.isConnected) {
        // Aquí puedes manejar cualquier lógica que necesites ejecutar cada 100 ms
        console.log('Procesamiento de datos en curso...');
      }
    }, 100); // 100 ms
  }

  async processData(data: string) {
    // Procesa stringData como una cadena separada por comas
    const valores = data.split(',');
  
    // Asegúrate de que tienes todos los datos esperados
    if (valores.length >= 20) {
      // Conversión a números
      const latitud = parseFloat(valores[0]);
      const longitud = parseFloat(valores[1]);
      const velocidad = parseFloat(valores[2]);
      const altitud = parseFloat(valores[3]);
      const satelite = parseFloat(valores[4]);
      const aceleracionX = parseFloat(valores[12]);
      const aceleracionY = parseFloat(valores[13]);
      const aceleracionZ = parseFloat(valores[14]);
      const giroX = parseFloat(valores[15]); // Velocidad angular en X
      const giroY = parseFloat(valores[16]); // Velocidad angular en Y
      const giroZ = parseFloat(valores[17]); // Velocidad angular en Z
      const BatV = parseFloat(valores[18]);
      const BatP = parseFloat(valores[19]);
  
      // Asigna los valores de latitud y longitud solo si latitud > 0
      if (latitud > 0) {
        this.lat = latitud;
        this.lon = longitud;
      } else {
        this.getPhoneLocation();
      }
  
      // Asigna el resto de valores a tus variables o propiedades
      this.speed = velocidad;
      this.altitude = altitud;
      this.Satellite = satelite;
      this.accelX = parseFloat((aceleracionY * 9.81).toFixed(2)); // Conversión a m/s²
      this.accelY = parseFloat((aceleracionX * 9.81).toFixed(2));
      this.accelZ = parseFloat((aceleracionZ * 9.81).toFixed(2));
      this.GiroX = giroY;
      this.GiroY = giroX;
      this.GiroZ = giroZ;
  
      // Calcular la máxima aceleración
      if (this.accelX > this.MaxAcellX) {
        this.MaxAcellX = this.accelX; // Actualizar el máximo si el nuevo valor es mayor
      }
  
      if (this.accelY > this.MaxAcellY) {
        this.MaxAcellY = this.accelY; // Actualizar el máximo si el nuevo valor es mayor
      }
  
      // Cálculo de Roll y Pitch a partir del Acelerómetro
      const rollAcelerometro = Math.atan2(aceleracionY, aceleracionZ) * (180 / Math.PI);
      const pitchAcelerometro = Math.atan2(aceleracionX, aceleracionZ) * (180 / Math.PI);
  
      // Integración de datos del giroscopio
      const deltaTime = 0.1; // Suponiendo que los datos llegan cada 100 ms
  
      // Actualizar roll y pitch usando datos del giroscopio
      this.roll += giroY * deltaTime; // Usando giroY para roll
      this.pitch += giroX * deltaTime; // Usando giroX para pitch
  
      // Fusión de datos
      const alpha = 0.98; // Peso para el giroscopio
      this.roll = alpha * this.roll + (1 - alpha) * rollAcelerometro;
      this.pitch = alpha * this.pitch + (1 - alpha) * pitchAcelerometro;
  
      // Redondear los valores a enteros
      this.roll = Math.round(this.roll);
      this.pitch = Math.round(this.pitch);
  
      // Asignar el valor de la batería
      this.BatteryP = BatP;
      this.BatteryV = BatV;
  
      // Guardar los datos en el archivo CSV
      await this.saveTravelData();
    } else {
      console.error('Datos recibidos incompletos:', data);
    }
  }


handleGPSData(value: DataView) {
  const gpsData = new TextDecoder().decode(value.buffer);
  console.log('Datos GPS:', gpsData);
  this.updateGPSUI(gpsData);
}



updateGPSUI(data: string) {
  this.gpsMessage = data;
  this.processData(data);
}


  
async disconnect(deviceId: string) {
  await BleClient.disconnect(deviceId);
  console.log('Dispositivo desconectado:', deviceId);
}
  


async startGPS() {
  setInterval(async () => {
    try {
        
        // Comparar y guardar la velocidad máxima
        if (this.speed > this.maxSpeed) {
          this.maxSpeed = this.speed;
        }

       
        // Comparar y guardar la altitud máxima
        if (this.altitude > this.maxAltitude) {
          this.maxAltitude = this.altitude;
        }
        

        //console.log('GPS updated:', this.lat, this.lon, this.speed, this.heading);

        // Si el mapa no está inicializado, inicialízalo
        if (!this.map) {
          this.initMap();
        } else {
          this.updateMap(this.lat, this.lon)
        }


        
      } catch (error) {
        console.error('Error getting GPS position:', error);
      }
    }, 1000); // Actualizar cada segundo
  }




// Función para inicializar el mapa y manejar las actualizaciones
initMap() {
  if (this.lat !== 0 && this.lon !== 0) { // Asegúrate de que las coordenadas son válidas
    console.log(`Inicializando mapa en: Latitud ${this.lat}, Longitud ${this.lon}`);

    // Crear el mapa centrado en la latitud y longitud inicial
    this.map = L.map('map').setView([this.lat, this.lon], 19);
    
    // Añadir la capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    // Crear el marcador en la posición inicial
    this.marker = L.marker([this.lat, this.lon]).addTo(this.map);

    // Inicializar la polilínea para trazar el recorrido
    this.track = L.polyline(this.coordinates, { color: 'blue' }).addTo(this.map);
  } else {
    console.log('Coordenadas no válidas para inicializar el mapa.');
  }
}


// Actualizar el mapa, marcador y la polilínea
updateMap(lat: number, lon: number) {
  if (this.map && this.marker) {
    const newLatLng = new L.LatLng(lat, lon);
    console.log('Adding new point:', newLatLng);
    
    // Actualizar la posición del marcador
    this.marker.setLatLng(newLatLng);
    
    // Actualizar la vista del mapa manteniendo el zoom actual
    this.map.setView(newLatLng, this.map.getZoom());
    
    // Añadir el nuevo punto a la polilínea y actualizarla
    this.coordinates.push(newLatLng);
    if (this.track) {
      this.track.setLatLngs(this.coordinates);
      console.log('Polyline updated with:', this.coordinates);
    }
  }
}
  
updateBatteryLevel(level: number): void {
  const batteryLevel = document.querySelector('.battery-level') as HTMLElement;

  // Ajusta el ancho de la barra según el nivel de la batería
  batteryLevel.style.width = `${Math.max(0, Math.min(100, level))}%`;

  // Cambia el color según el nivel de carga
  if (level <= 20) {
    batteryLevel.classList.add('battery-low');
    batteryLevel.classList.remove('battery-medium', 'battery-high');
  } else if (level <= 50) {
    batteryLevel.classList.add('battery-medium');
    batteryLevel.classList.remove('battery-low', 'battery-high');
  } else {
    batteryLevel.classList.add('battery-high');
    batteryLevel.classList.remove('battery-low', 'battery-medium');
    }
  }
  

// representacion de satelites
getBarHeight(index: number): number {
  const totalSatellites = this.Satellite;
  const maxBars = 5;
  const maxSatellites = 10;

  // Calcular la cantidad de satélites que se corresponden con las barras
  const filledBars = Math.ceil((totalSatellites / maxSatellites) * maxBars);

  // Definir las alturas de las barras
  const heights = [5, 8, 10, 11, 12]; // Alturas de las 5 barras

  // Si el índice está dentro del rango de barras llenas, devolver la altura correspondiente
  if (index < filledBars) {
      return heights[index]; // Retorna la altura de la barra correspondiente
  } else {
      return 0; // Retorna 0 si la barra no está llena
  }
}

isFilled(index: number): boolean {
    const totalSatellites = this.Satellite;
    const maxBars = 5;
    const maxSatellites = 10;

    // Calcular las barras llenas
    const filledBars = Math.ceil((totalSatellites / maxSatellites) * maxBars);
    return index < filledBars; // Devuelve true si el índice está dentro de las barras llenas
}



// Grabado de viajes

async createTravelDirectory() {
  try {
    await Filesystem.mkdir({
      path: 'Travels',
      directory: Directory.Documents,
      recursive: false
    });
    console.log('Directorio de viajes creado');
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        console.log('El directorio ya existe');
      } else {
        console.error('Error al crear el directorio:', error.message);
      }
    } else {
      console.error('Error desconocido al crear el directorio:', error);
    }
  }
}


async startNewTravel() {
  console.log('startNewTravel() se está ejecutando');
  const date = new Date();

  // Obtener componentes de la fecha y hora local
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Los meses son base 0
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // Formatear la fecha y hora en el formato deseado
  const formattedDate = `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;

  this.travelFileName = `Travels/travel_${formattedDate}.csv`;
  console.log('Nombre del archivo de viaje:', this.travelFileName);
  // Crear el archivo CSV con encabezados
  const headers = 'Timestamp,Latitud,Longitud,Velocidad,Altitud,Satelite,AceleracionX,AceleracionY,AceleracionZ,GiroX,GiroY,GiroZ,BatV,BatP,Roll,Pitch\n';
  try {
    await Filesystem.writeFile({
      path: this.travelFileName,
      data: headers,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });
    console.log(`startNewTravel() Archivo de viaje creado: ${this.travelFileName}`);
  } catch (error) {
    console.error('startNewTravel() Error al crear el archivo de viaje:', error);
  }
}


async saveTravelData() {
  console.log('saveTravelData() se está ejecutando');

  // Obtener el timestamp actual en formato ISO 8601
  const timestamp = new Date().toISOString();

  // Crear la cadena de datos con el timestamp al principio
  const travelData = `${timestamp},${this.lat},${this.lon},${this.speed},${this.altitude},${this.Satellite},${this.accelX},${this.accelY},${this.accelZ},${this.GiroX},${this.GiroY},${this.GiroZ},${this.BatteryV},${this.BatteryP},${this.roll},${this.pitch}\n`;

  console.log('Datos a guardar:', travelData);
  console.log('Nombre del archivo:', this.travelFileName);

  try {
    await Filesystem.appendFile({
      path: this.travelFileName,
      data: travelData,
      directory: Directory.Documents, // Asegúrate de que coincida con startNewTravel
      encoding: Encoding.UTF8
    });
    console.log('saveTravelData() Datos del viaje guardados.');
  } catch (error) {
    console.error('saveTravelData() Error al guardar los datos del viaje:', error);
  }
}

  async checkAndRequestPermissions() {
    try {
      // Intenta realizar una operación de archivo para que Capacitor maneje los permisos
      await Filesystem.writeFile({
        path: 'dummy.txt',
        data: 'dummy data',
        directory: Directory.External
      });
      console.log('Permisos concedidos y archivo de prueba creado');
    } catch (error) {
      console.error('Permisos no concedidos o error al crear archivo de prueba:', error);
    }
  }


} // Final del codigo