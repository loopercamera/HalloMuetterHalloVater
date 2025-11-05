import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // ⬅️ NEW
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
} from '@ionic/angular/standalone';
import { Geolocation } from '@capacitor/geolocation';

@Component({
  selector: 'app-tab3',
  standalone: true, // make sure this is here
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [
    CommonModule,   // ⬅️ IMPORTANT: gives you *ngIf, pipes, etc.
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
  ],
})
export class Tab3Page {
  // deine aktuelle Position
  myLat: number | null = null;
  myLon: number | null = null;

  // Position aus der CSV (wir nehmen den letzten Punkt)
  targetLat: number | null = null;
  targetLon: number | null = null;

  // Ergebnis
  distanceKm: number | null = null;
  bearingDeg: number | null = null;
  bearingText: string | null = null;

  constructor() {}

  async getMyLocation(): Promise<void> {
    const pos = await Geolocation.getCurrentPosition();
    this.myLat = pos.coords.latitude;
    this.myLon = pos.coords.longitude;
    console.log('My location:', this.myLat, this.myLon);

    this.updateDistanceAndBearing();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      this.parseCsvAndSetTarget(text);
    };
    reader.readAsText(file);
  }

  private parseCsvAndSetTarget(csv: string): void {
    // sehr einfache CSV-Logik: wir nehmen die letzte Datenzeile
    const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (lines.length < 2) {
      console.warn('CSV has no data lines');
      return;
    }

    // 1. Zeile = Header -> ignorieren
    const lastLine = lines[lines.length - 1];
    const parts = lastLine.split(',');

    // Erwartetes Format: User_id,Time,Lat,Lon
    if (parts.length < 4) {
      console.warn('Unexpected CSV format', lastLine);
      return;
    }

    const lat = parseFloat(parts[2]);
    const lon = parseFloat(parts[3]);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      console.warn('Invalid lat/lon in CSV', parts[2], parts[3]);
      return;
    }

    this.targetLat = lat;
    this.targetLon = lon;
    console.log('Target from CSV:', this.targetLat, this.targetLon);

    this.updateDistanceAndBearing();
  }

  private updateDistanceAndBearing(): void {
    if (
      this.myLat == null ||
      this.myLon == null ||
      this.targetLat == null ||
      this.targetLon == null
    ) {
      this.distanceKm = null;
      this.bearingDeg = null;
      this.bearingText = null;
      return;
    }

    // Haversine-Distanz
    const R = 6371; // Erdradius in km
    const φ1 = this.toRad(this.myLat);
    const φ2 = this.toRad(this.targetLat);
    const Δφ = this.toRad(this.targetLat - this.myLat);
    const Δλ = this.toRad(this.targetLon - this.myLon);

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    this.distanceKm = R * c;

    // Anfangskurs (Bearing) von mir -> Ziel
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    let brng = Math.atan2(y, x);
    brng = (brng * 180) / Math.PI;
    brng = (brng + 360) % 360; // 0–360°

    this.bearingDeg = brng;
    this.bearingText = this.bearingToCardinal(brng);

    console.log(
      'Distance (km):',
      this.distanceKm,
      'Bearing:',
      this.bearingDeg,
      this.bearingText
    );
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private bearingToCardinal(brng: number): string {
    // grobe 8er-Einteilung reicht hier
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
    const idx = Math.round(brng / 45);
    return dirs[idx];
  }
}
