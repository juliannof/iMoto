import { Component } from '@angular/core';
import * as L from 'leaflet';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { BleClient, numbersToDataView, ScanResult } from '@capacitor-community/bluetooth-le';
import { Geolocation } from '@capacitor/geolocation';
import { NgZone } from '@angular/core';
import {
  SERVICE_UUID,
  CHARACTERISTIC_UUID,
} from '../config/constants';


let isConnected = false;

//KeepAwake.allowSleep(); // Permitir que la pantalla se apague

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})

export class HomePage {
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
  


  constructor(private zone: NgZone) {}
    //window.plugins.insomnia.keepAwake();
  

  ngOnInit() {

    KeepAwake.keepAwake(); // Mantener la pantalla encendida
    this.startConnectionLoop();
    this.connectToKnownDevice();

    //window.plugins.insomnia.keepAwake();
     // Iniciar la actualización del GPS cada segundo
     this.startGPS();
     this.initMap();
     
     

  }
  
  ngOnDestroy() {
    KeepAwake.allowSleep(); // Permitir que la pantalla se apague cuando se cierra la vista
  }

  // Iniciar la conexión cada segundo
  startConnectionLoop() {
    //const deviceId = 'CC:7B:5C:35:99:EE'; // Reemplaza con el ID del dispositivo correcto
    setInterval(() => {
      this.connectToDevice(this.deviceId);
    }, 100); // Ejecutar cada segundo
  }

  async setupNotifications(deviceId: string) {
    const serviceUUID = SERVICE_UUID; // UUID del servicio
    const characteristicUUID = CHARACTERISTIC_UUID; // UUID de la característica
    
    await BleClient.startNotifications(deviceId, serviceUUID, characteristicUUID, (value) => {
      //const data = new Uint8Array(value.buffer);
      const decoder = new TextDecoder();  // Crea un decodificador de texto
      // Convierte el ArrayBuffer recibido directamente a una cadena de texto
      const data = decoder.decode(value.buffer);
      console.log('Datos recibidos:', data);
      this.processData(data);
    });
  }

  async getPhoneLocation() {
    const coordinates = await Geolocation.getCurrentPosition();
    const { latitude, longitude } = coordinates.coords;
    console.log('Ubicación inicial desde el teléfono:', latitude, longitude);
  
    // Puedes usar estas coordenadas como las iniciales
    this.lat = latitude;
    this.lon = longitude;
  }

  processData(data: string) {
    // Procesa stringData como una cadena separada por comas
    const valores = data.split(',');
  
    // Asegúrate de que tienes todos los datos esperados
    if (valores.length >= 20) {
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
        this.accelX = aceleracionX;
        this.accelY = aceleracionY;
        this.accelZ = aceleracionZ;
        this.GiroX = giroX;
        this.GiroY = giroY;
        this.GiroZ = giroZ;

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

        this.BatteryP = BatP;
        

        // Asignar el valor de la batería
        this.BatteryV = BatV;
  
    } else {
        console.error('Datos recibidos incompletos:', data);
    }
}
  
  async scanDevices() {
    await BleClient.initialize();
    
    BleClient.requestDevice().then((device) => {
      console.log('Dispositivo encontrado:', device);
      this.connectToDevice(device.deviceId);
    });
  }

  async connectToKnownDevice() {
    
    try {
      await BleClient.initialize();
      console.log('BLE Client inicializado');
      
      // Conectar directamente al dispositivo usando el ID conocido
      await this.connectToDevice(this.deviceId);
     
    } catch (error) {
      console.error('Error al conectar con el dispositivo:', error);
    }
  }
  
async connectToDevice(deviceId: string) {
  try {
    await BleClient.connect(deviceId);
    console.log('Conectado al dispositivo:', deviceId);

    // Aquí suscribimos a las notificaciones de las características
    await BleClient.startNotifications(
      deviceId,
      SERVICE_UUID, // UUID del servicio
      CHARACTERISTIC_UUID,  // UUID de la característica GPS
      (value) => this.handleGPSData(value)
    );

  } catch (error) {
    console.error('Error al conectar:', error);
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
  if (this.lat !== 0 && this.lon !== 0) { // Asegúrate de que no sean 0
    // Crear el mapa centrado en la latitud y longitud inicial
    this.map = L.map('map').setView([this.lat, this.lon], 19);
    
    // Añadir la capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    // Crear el marcador en la posición inicial
    this.marker = L.marker([this.lat, this.lon]).addTo(this.map);

    // Inicializar la polilínea para trazar el recorrido
    this.track = L.polyline(this.coordinates, { color: 'blue' }).addTo(this.map);
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
  

  getBarHeight(index: number): number {
    const totalSatellites = this.Satellite;
    const maxBars = 5;
    const maxSatellites = 15;
  
    const height = Math.min((totalSatellites / maxSatellites) * maxBars * 100, 100);
    return index <= Math.ceil(height / 100 * maxBars) ? (index / maxBars) * 100 : 0;
  }
  
  isFilled(index: number): boolean {
    const totalSatellites = this.Satellite;
    const maxBars = 5;
    const maxSatellites = 20;
  
    const filledBars = Math.ceil((totalSatellites / maxSatellites) * maxBars);
    return index <= filledBars;
  }
  

}