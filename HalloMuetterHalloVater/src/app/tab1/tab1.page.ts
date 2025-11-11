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
  latLng,
  tileLayer,
  marker,
  icon,
  Polyline,
  polyline,
} from 'leaflet';

interface TrackPoint {
  userId: string;
  timestamp: string; // ISO string
  lat: number;
  lon: number;
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
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
export class Tab1Page {
  private map: Map | undefined;
  private trajectory: Polyline | undefined;
  private watchID: string | null = null;

  private readonly USER_ID = 'user_001';

  // must be public for template binding
  trackPoints: TrackPoint[] = [];
  isUploading: boolean = false;

  constructor() {}

  ionViewDidEnter() {
    this.leafletMap();
  }

  ionViewWillLeave() {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
    if (this.watchID) {
      Geolocation.clearWatch({ id: this.watchID });
      this.watchID = null;
    }
  }

  // --- map setup ---

  private leafletMap() {
    if (this.map) {
      return;
    }

    this.map = new Map('mapId').setView([47.535023, 7.642173], 15);

    tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
  }

  // --- one-time current position marker ---

  async getCurrentPosition() {
    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
    });
    console.log('Current position: ', coordinates);

    if (this.map) {
      const myIcon = icon({
        iconUrl: 'leaflet/marker-icon.png',
        shadowUrl: 'leaflet/marker-shadow.png',
        iconAnchor: [12, 41],
        popupAnchor: [0, -41],
      });

      marker([coordinates.coords.latitude, coordinates.coords.longitude], {
        icon: myIcon,
      })
        .addTo(this.map)
        .bindPopup('You are here')
        .openPopup();

      this.map.panTo(
        latLng(coordinates.coords.latitude, coordinates.coords.longitude)
      );
    }
  }

  // --- tracking ---

  watchPosition() {
    this.clearTrajectory();

    this.watchID = Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 5000, maximumAge: Infinity },
      (position, err) => {
        if (err) {
          console.error('Geolocation watch error:', err);
          return;
        }
        if (this.map && position) {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          const tp: TrackPoint = {
            userId: this.USER_ID,
            timestamp: new Date().toISOString(),
            lat,
            lon,
          };
          this.trackPoints.push(tp);

          const latlngs = this.trackPoints.map((p) => [p.lat, p.lon]) as [
            number,
            number
          ][];

          if (this.trajectory) {
            this.map.removeLayer(this.trajectory);
          }
          this.trajectory = polyline(latlngs).addTo(this.map);

          this.map.panTo(latLng(lat, lon));
        }
      }
    ) as unknown as string; // Capacitor returns string id
  }

  stopWatchPosition() {
    if (this.watchID) {
      Geolocation.clearWatch({ id: this.watchID });
      this.watchID = null;
    }
    this.clearTrajectory();
  }

  private clearTrajectory() {
    if (this.map && this.trajectory) {
      this.map.removeLayer(this.trajectory);
      this.trajectory = undefined;
    }
    this.trackPoints = [];
  }

  // --- upload to DB via API ---

  async uploadTrackToDb() {
    if (this.trackPoints.length === 0) {
      console.warn('No trajectory points to upload.');
      return;
    }

    this.isUploading = true;

    const url =
      'https://fastapihmhv-production.up.railway.app/api/coordinates';

    try {
      for (const p of this.trackPoints) {
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lat: p.lat,
            lon: p.lon,
          }),
        });

        if (!resp.ok) {
          console.error(
            'Upload failed for point',
            p,
            'status',
            resp.status
          );
        }
      }

      console.log('Track upload finished.');
    } catch (err) {
      console.error(
        'Error uploading track to DB (likely CORS in browser):',
        err
      );
    } finally {
      this.isUploading = false;
    }
  }
}
