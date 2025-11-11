# HalloMuetterHalloVater
Web App for tracking your children

## Set up project

```bash
 npm install -g @ionic/cli native-run
```

Navigate insiede `HalloMuetterHalloVater` APP directory with:

```bash
cd HalloMuetterHalloVater
```

Than install the dependencies with:

```bash
npm install @capacitor/camera @capacitor/preferences @capacitor/filesystem
```

Run the APP:
```bash
ionic serve
```

Setup for device:

```bash
ionic build
ionic cap add android
ionic cap copy
ionic cap sync
```
```bash
ionic build
ionic cap add android
ionic cap copy
ionic cap sync
```
Open open on Android Studio with:

```bash
ionic cap open android
```



## Device install REST API

Install Geolocation and Angular Common with:
```bash
npm install @capacitor/geolocation
```
```bash
npm install @angular/common@latest
```

```bash
ionic cap sync
```

## Set up Backend with PostGIS

### Open PGAdmin

Create new database `hallo_muetter_hallo_vater`

```sql
CREATE EXTENSION postgis;
```
add table for user positions

```sql
CREATE TABLE user_positions (
  id SERIAL PRIMARY KEY,
  geom geometry(Point, 4326),
  created_at TIMESTAMP DEFAULT now()
);
```

add table for outgoing rayon


```sql
CREATE TABLE outgoing_rayon (
    id SERIAL PRIMARY KEY,
    name TEXT,
    geom GEOMETRY(MULTIPOLYGON, 4326),
    created_at TIMESTAMP DEFAULT NOW()
);
```
