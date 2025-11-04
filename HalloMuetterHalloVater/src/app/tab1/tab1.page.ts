import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';
import { Geolocation } from '@capacitor/geolocation';
import { Map, latLng, tileLayer, Layer, marker, icon, Polyline, polyline } from 'leaflet';

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
      this.trajectoryPoints = [];
    }
  }

  watchPosition() {
    this.clearTrajectory();
    this.watchID = Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 5000, maximumAge: Infinity },
      (position, err) => {
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
}
