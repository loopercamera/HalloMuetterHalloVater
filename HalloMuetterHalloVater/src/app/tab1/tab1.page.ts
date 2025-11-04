import { Component } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
} from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';
import { Geolocation } from '@capacitor/geolocation';
import {
  Map,
  latLng,
  tileLayer,
  Layer,
  marker,
  icon,
  Polyline,
  polyline,
} from 'leaflet';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    IonButton,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    ExploreContainerComponent,
  ],
})
export class Tab1Page {
  private map: Map | undefined;
  private trajectory: Polyline | undefined;
  private trajectoryPoints: any[] = [];
  private watchID: any;
  lastTrackFileName: string | null = null;

  constructor() {}

  async getCurrentPosition() {
    const coordinates = await Geolocation.getCurrentPosition();
    console.log('Current position: ', coordinates);

    if (this.map) {
      const myIcon = icon({
        iconUrl: 'leaflet/marker-icon.png',
        shadowUrl: 'leaflet/marker-shadow.png',
        iconAnchor: [12, 41], // point of the icon which will correspond to marker's location
        popupAnchor: [0, -41], // point from which the popup should open relative to the iconAnchor
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

  ionViewDidEnter() {
    this.leafletMap();
  }

  leafletMap() {
    // In setView add latLng and zoom
    this.map = new Map('mapId').setView([47.535023, 7.642173], 15);
    tileLayer(
      'http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'edupala.com © ionic LeafLet',
      }
    ).addTo(this.map);
  }

  /* Remove map when we have multiple map object */
  ionViewWillLeave() {
    if (this.map) {
      this.map.remove();
    }
  }

  stopWatchPosition() {
    Geolocation.clearWatch(this.watchID);
    this.clearTrajectory();
  }

  clearTrajectory() {
    if (this.map && this.trajectory) {
      this.map.removeLayer(this.trajectory);
    }
    this.trajectoryPoints = [];
  }

  watchPosition() {
    this.clearTrajectory();
    this.watchID = Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 5000, maximumAge: Infinity },
      (position, err) => {
        if (err) {
          console.error('Watch position error:', err);
          return;
        }

        if (this.map && position) {
          const lat = position.coords.latitude;
          const long = position.coords.longitude;
          this.trajectoryPoints.push([lat, long]);
          if (this.trajectory) {
            this.map.removeLayer(this.trajectory);
          }
          this.trajectory = polyline(this.trajectoryPoints).addTo(this.map);
        }
      }
    );
  }

async saveTrackToFile(): Promise<void> {
    if (!this.trajectoryPoints.length) {
      console.log('No trajectory points to save.');
      return;
    }

    const header = 'lat,lon\n';
    const body = this.trajectoryPoints
      .map(([lat, lon]) => `${lat},${lon}`)
      .join('\n');

    const data = header + body;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `track-${timestamp}.csv`;

    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      // WICHTIG: hier merken wir uns den Namen
      this.lastTrackFileName = fileName;

      console.log('Track saved to file:', result.uri ?? fileName);
    } catch (error) {
      console.error('Error saving track file:', error);
    }
  }

  async downloadTrack(): Promise<void> {
    if (!this.lastTrackFileName) {
      console.log('No track file saved yet.');
      return;
    }

    try {
      const result = await Filesystem.readFile({
        path: this.lastTrackFileName,
        directory: Directory.Documents,
      });

      // result.data ist für Web meist ein String (Base64 oder Text je nach Implementierung)
      // du sagst, dein aktueller Download funktioniert – also lassen wir die Logik, wie du sie hattest:
      const blob = new Blob([result.data], {
        type: 'text/csv;charset=utf-8;',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.lastTrackFileName;
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading track file:', error);
    }
  }
}



