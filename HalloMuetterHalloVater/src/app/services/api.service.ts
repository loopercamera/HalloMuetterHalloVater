import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = 'http://<SERVER-IP>:3000/api'; // change to your server IP

  constructor(private http: HttpClient) {}

  sendCoordinates(lat: number, lon: number) {
    return this.http.post(`${this.baseUrl}/coordinates`, { lat, lon });
  }
}
