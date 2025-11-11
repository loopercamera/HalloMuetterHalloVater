import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
} from '@ionic/angular/standalone';
import { Geolocation } from '@capacitor/geolocation';
import {
  Map,
  tileLayer,
  latLng,
  circleMarker,
  CircleMarker,
  Polyline,
  polyline,
  Rectangle,
  rectangle,
} from 'leaflet';

const RECT_CENTER_LAT = 47.46385684116505;
const RECT_CENTER_LON = 8.39244934396616;
const RECT_SIDE_METERS = 1000; // 1 km

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
  ],
})
export class Tab3Page {
  private map?: Map;

  private apiMarker?: CircleMarker;    // red (API)
  private myMarker?: CircleMarker;     // blue (me)
  private directionLine?: Polyline;    // short arrow from me -> API
  private fixedRectangle?: Rectangle;  // hard-coded 1 km square

  // API position
  apiLat: number | null = null;
  apiLon: number | null = null;

  // my position
  myLat: number | null = null;
  myLon: number | null = null;

  // results
  distanceMeters: number | null = null;
  directionGon: number | null = null;

  errorMessage: string | null = null;

  constructor() {}

  ionViewDidEnter(): void {
    this.initMap();
    this.createFixedRectangle();
  }

  ionViewWillLeave(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  private initMap(): void {
    if (this.map) {
      return;
    }

    this.map = new Map('map3Id').setView([47.5, 8.4], 12);

    tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
  }

  // --- fixed rectangle, hard-coded center ---

  private createFixedRectangle(): void {
    if (!this.map) {
      return;
    }

    if (this.fixedRectangle) {
      return; // already created
    }

    const halfSide = RECT_SIDE_METERS / 2; // 500 m
    const R = 6371000; // Earth radius in m

    const latRad = this.toRad(RECT_CENTER_LAT);
    const dLat = (halfSide / R) * (180 / Math.PI);

    const cosLat = Math.cos(latRad);
    if (Math.abs(cosLat) < 1e-6) {
      // extremely close to poles – not the case here, but be defensive
      return;
    }

    const dLon = (halfSide / (R * cosLat)) * (180 / Math.PI);

    const south = RECT_CENTER_LAT - dLat;
    const north = RECT_CENTER_LAT + dLat;
    const west = RECT_CENTER_LON - dLon;
    const east = RECT_CENTER_LON + dLon;

    this.fixedRectangle = rectangle(
      [
        [south, west],
        [north, east],
      ],
      {
        color: 'red',
        weight: 1.5,
        fill: false,
      }
    ).addTo(this.map);
  }

  // --- positions ---

  async getMyLocation(): Promise<void> {
    this.errorMessage = null;

    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });

      this.myLat = pos.coords.latitude;
      this.myLon = pos.coords.longitude;

      if (!this.map) {
        this.initMap();
        this.createFixedRectangle();
      }

      if (!this.map) {
        this.errorMessage = 'Map not initialized.';
        return;
      }

      // remove old marker
      if (this.myMarker) {
        this.map.removeLayer(this.myMarker);
        this.myMarker = undefined;
      }

      // blue point for my location
      this.myMarker = circleMarker([this.myLat, this.myLon], {
        radius: 8,
        color: 'blue',
        fillColor: 'blue',
        fillOpacity: 0.8,
      }).addTo(this.map);

      // if API not loaded yet, center on me
      if (this.apiLat == null || this.apiLon == null) {
        this.map.panTo(latLng(this.myLat, this.myLon));
      }

      this.updateDistanceAndDirection();
    } catch (err) {
      console.error('Error getting my location', err);
      this.errorMessage = 'Failed to get current position (permissions / GPS).';
    }
  }

  async loadApiLocation(): Promise<void> {
    this.errorMessage = null;

    try {
      const response = await fetch(
        'https://fastapihmhv-production.up.railway.app/api/coordinates'
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = (await response.json()) as {
        id: number;
        lat: number;
        lon: number;
        created_at: string;
      };

      this.apiLat = data.lat;
      this.apiLon = data.lon;

      if (!this.map) {
        this.initMap();
        this.createFixedRectangle();
      }

      if (!this.map) {
        this.errorMessage = 'Map not initialized.';
        return;
      }

      // remove old API marker
      if (this.apiMarker) {
        this.map.removeLayer(this.apiMarker);
        this.apiMarker = undefined;
      }

      // red point for API location
      this.apiMarker = circleMarker([this.apiLat, this.apiLon], {
        radius: 8,
        color: 'red',
        fillColor: 'red',
        fillOpacity: 0.8,
      }).addTo(this.map);

      // if we don't know my location yet, center on API
      if (this.myLat == null || this.myLon == null) {
        this.map.panTo(latLng(this.apiLat, this.apiLon));
      }

      this.updateDistanceAndDirection();
    } catch (err) {
      console.error('Error loading API location', err);
      this.errorMessage =
        'Failed to load API location. In browser this is probably a CORS issue.';
    }
  }

  // --- distance & direction ---

  private updateDistanceAndDirection(): void {
    // remove old direction arrow
    if (this.map && this.directionLine) {
      this.map.removeLayer(this.directionLine);
      this.directionLine = undefined;
    }

    if (
      this.myLat == null ||
      this.myLon == null ||
      this.apiLat == null ||
      this.apiLon == null
    ) {
      this.distanceMeters = null;
      this.directionGon = null;
      return;
    }

    // Haversine distance (meters)
    const R = 6371000; // Earth radius in m
    const φ1 = this.toRad(this.myLat);
    const φ2 = this.toRad(this.apiLat);
    const Δφ = this.toRad(this.apiLat - this.myLat);
    const Δλ = this.toRad(this.apiLon - this.myLon);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) *
        Math.cos(φ2) *
        Math.sin(Δλ / 2) *
        Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    this.distanceMeters = R * c;

    // Bearing from my position -> API position (degrees)
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    let brngDeg = Math.atan2(y, x) * (180 / Math.PI);
    brngDeg = (brngDeg + 360) % 360; // normalize 0–360°

    // convert to gon (400 gon = full circle)
    let brngGon = brngDeg * (10 / 9); // 360° -> 400 gon
    if (brngGon < 0) brngGon += 400;
    if (brngGon >= 400) brngGon -= 400;

    this.directionGon = brngGon;

    // draw a short "arrow" (fixed length) from me in the direction of the API
    if (this.map) {
      const arrowLength = 100; // meters, fixed length
      const brngRad = this.toRad(brngDeg);

      const lat1Rad = this.toRad(this.myLat);
      const lon1Rad = this.toRad(this.myLon);
      const d = arrowLength / R;

      const lat2Rad =
        Math.asin(
          Math.sin(lat1Rad) * Math.cos(d) +
            Math.cos(lat1Rad) * Math.sin(d) * Math.cos(brngRad)
        );

      const lon2Rad =
        lon1Rad +
        Math.atan2(
          Math.sin(brngRad) * Math.sin(d) * Math.cos(lat1Rad),
          Math.cos(d) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
        );

      const lat2 = (lat2Rad * 180) / Math.PI;
      const lon2 = (lon2Rad * 180) / Math.PI;

      this.directionLine = polyline(
        [
          [this.myLat, this.myLon],
          [lat2, lon2],
        ],
        {
          color: 'black',
        }
      ).addTo(this.map);
    }
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
