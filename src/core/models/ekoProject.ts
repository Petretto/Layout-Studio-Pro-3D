import {ProjectData} from './types';
import {DEFAULT_MOTOR_PROJECT} from './defaultProjects';
// Demonstration: demand and hall dimensions are illustrative, not plant measurements.
export const DEFAULT_EKO_PROJECT:ProjectData={...DEFAULT_MOTOR_PROJECT,id:'eko-demo-v04',name:'Eko — wariant testowy (czasy montażu przykładowe)',schemaVersion:4,algorithm:'Manual',currency:'PLN',targetLayoutType:'ProcessFlow',layoutMode:'auto',layoutObjects:[],obstacles:[],facility:{widthMm:40000,lengthMm:40000,heightMm:6000,gridSizeMm:100},demand:{yearlyDemand:1500,workingDaysPerYear:250,shiftsPerDay:1,hoursPerShift:8,plannedBreaksMinutesPerShift:30,oeePercent:90},processSteps:[
  {
    "id": "OP10",
    "name": "Podmontaż stelaża",
    "standardTimeSeconds": 3480,
    "vaTimeSeconds": 3340,
    "nvaTimeSeconds": 140,
    "predecessorIds": [],
    "sequenceNumber": 1,
    "assignedWorkstationId": "WS-1"
  },
  {
    "id": "OP11",
    "name": "Montaż stelaża w ramie",
    "standardTimeSeconds": 600,
    "vaTimeSeconds": 580,
    "nvaTimeSeconds": 20,
    "predecessorIds": [
      "OP10"
    ],
    "sequenceNumber": 2,
    "assignedWorkstationId": "WS-2"
  },
  {
    "id": "OP12",
    "name": "Etap I",
    "standardTimeSeconds": 3590,
    "vaTimeSeconds": 3500,
    "nvaTimeSeconds": 90,
    "predecessorIds": [
      "OP11"
    ],
    "sequenceNumber": 3,
    "assignedWorkstationId": "WS-3"
  },
  {
    "id": "OP13",
    "name": "Podmontaż drzwi lewych",
    "standardTimeSeconds": 2640,
    "vaTimeSeconds": 2600,
    "nvaTimeSeconds": 40,
    "predecessorIds": [],
    "sequenceNumber": 4,
    "assignedWorkstationId": "WS-4"
  },
  {
    "id": "OP14",
    "name": "Podmontaż front panel",
    "standardTimeSeconds": 1320,
    "vaTimeSeconds": 1210,
    "nvaTimeSeconds": 110,
    "predecessorIds": [],
    "sequenceNumber": 5,
    "assignedWorkstationId": "WS-5"
  },
  {
    "id": "OP15",
    "name": "Podmonta drzwi prawych",
    "standardTimeSeconds": 2640,
    "vaTimeSeconds": 2600,
    "nvaTimeSeconds": 40,
    "predecessorIds": [],
    "sequenceNumber": 6,
    "assignedWorkstationId": "WS-6"
  },
  {
    "id": "OP16",
    "name": "Podmontaż tylnego panela",
    "standardTimeSeconds": 1920,
    "vaTimeSeconds": 1840,
    "nvaTimeSeconds": 80,
    "predecessorIds": [],
    "sequenceNumber": 7,
    "assignedWorkstationId": "WS-7"
  },
  {
    "id": "OP17",
    "name": "Podmontaż dachu",
    "standardTimeSeconds": 1680,
    "vaTimeSeconds": 1540,
    "nvaTimeSeconds": 140,
    "predecessorIds": [],
    "sequenceNumber": 8,
    "assignedWorkstationId": "WS-8"
  },
  {
    "id": "OP18",
    "name": "Podmontaż „trumny”",
    "standardTimeSeconds": 1200,
    "vaTimeSeconds": 1050,
    "nvaTimeSeconds": 150,
    "predecessorIds": [
      "OP17"
    ],
    "sequenceNumber": 9,
    "assignedWorkstationId": "WS-9"
  },
  {
    "id": "OP22",
    "name": "Montaż drzwi lewych na ramie [CZAS TESTOWY]",
    "standardTimeSeconds": 600,
    "vaTimeSeconds": 510,
    "nvaTimeSeconds": 90,
    "predecessorIds": [
      "OP12",
      "OP13"
    ],
    "sequenceNumber": 10,
    "assignedWorkstationId": "WS-10"
  },
  {
    "id": "OP23",
    "name": "Montaż drzwi prawych na ramie [CZAS TESTOWY]",
    "standardTimeSeconds": 600,
    "vaTimeSeconds": 510,
    "nvaTimeSeconds": 90,
    "predecessorIds": [
      "OP12",
      "OP15"
    ],
    "sequenceNumber": 11,
    "assignedWorkstationId": "WS-11"
  },
  {
    "id": "OP24",
    "name": "Montaż panelu przedniego na ramie [CZAS TESTOWY]",
    "standardTimeSeconds": 480,
    "vaTimeSeconds": 408,
    "nvaTimeSeconds": 72,
    "predecessorIds": [
      "OP22",
      "OP23",
      "OP14"
    ],
    "sequenceNumber": 12,
    "assignedWorkstationId": "WS-12"
  },
  {
    "id": "OP25",
    "name": "Montaż panelu tylnego na ramie [CZAS TESTOWY]",
    "standardTimeSeconds": 480,
    "vaTimeSeconds": 408,
    "nvaTimeSeconds": 72,
    "predecessorIds": [
      "OP22",
      "OP23",
      "OP16"
    ],
    "sequenceNumber": 13,
    "assignedWorkstationId": "WS-13"
  },
  {
    "id": "OP19",
    "name": "Test",
    "standardTimeSeconds": 1800,
    "vaTimeSeconds": 1650,
    "nvaTimeSeconds": 150,
    "predecessorIds": [
      "OP24",
      "OP25",
      "OP17"
    ],
    "sequenceNumber": 14,
    "assignedWorkstationId": "WS-14"
  },
  {
    "id": "OP20",
    "name": "Montaż „trumny” na ramie",
    "standardTimeSeconds": 1200,
    "vaTimeSeconds": 1010,
    "nvaTimeSeconds": 190,
    "predecessorIds": [
      "OP19",
      "OP18"
    ],
    "sequenceNumber": 15,
    "assignedWorkstationId": "WS-15"
  },
  {
    "id": "OP21",
    "name": "Pakowanie",
    "standardTimeSeconds": 1320,
    "vaTimeSeconds": 1200,
    "nvaTimeSeconds": 120,
    "predecessorIds": [
      "OP20"
    ],
    "sequenceNumber": 16,
    "assignedWorkstationId": "WS-16"
  }
],bom:[
  {
    "id": "EKO-0",
    "partNumber": "EKO-OP10-01",
    "name": "Profil stelaża pionowy",
    "quantityPerUnit": 4,
    "container": "Pallet",
    "packageQuantity": 40,
    "associatedProcessStepId": "OP10",
    "unitCost": 42
  },
  {
    "id": "EKO-1",
    "partNumber": "EKO-OP10-02",
    "name": "Poprzeczka stelaża",
    "quantityPerUnit": 6,
    "container": "Pallet",
    "packageQuantity": 60,
    "associatedProcessStepId": "OP10",
    "unitCost": 28
  },
  {
    "id": "EKO-2",
    "partNumber": "EKO-OP10-03",
    "name": "Kątownik łączący stelaż",
    "quantityPerUnit": 8,
    "container": "BoxKLT",
    "packageQuantity": 100,
    "associatedProcessStepId": "OP10",
    "unitCost": 4.5
  },
  {
    "id": "EKO-3",
    "partNumber": "EKO-OP10-04",
    "name": "Śruba M8x20",
    "quantityPerUnit": 32,
    "container": "BoxKLT",
    "packageQuantity": 500,
    "associatedProcessStepId": "OP10",
    "unitCost": 0.65
  },
  {
    "id": "EKO-4",
    "partNumber": "EKO-OP10-05",
    "name": "Nakrętka kołnierzowa M8",
    "quantityPerUnit": 32,
    "container": "BoxKLT",
    "packageQuantity": 500,
    "associatedProcessStepId": "OP10",
    "unitCost": 0.48
  },
  {
    "id": "EKO-5",
    "partNumber": "EKO-OP11-01",
    "name": "Rama bazowa",
    "quantityPerUnit": 1,
    "container": "Pallet",
    "packageQuantity": 8,
    "associatedProcessStepId": "OP11",
    "unitCost": 320
  },
  {
    "id": "EKO-6",
    "partNumber": "EKO-OP11-02",
    "name": "Podkładka poziomująca",
    "quantityPerUnit": 4,
    "container": "BoxKLT",
    "packageQuantity": 100,
    "associatedProcessStepId": "OP11",
    "unitCost": 2.2
  },
  {
    "id": "EKO-7",
    "partNumber": "EKO-OP11-03",
    "name": "Wspornik mocowania stelaża",
    "quantityPerUnit": 4,
    "container": "BoxKLT",
    "packageQuantity": 40,
    "associatedProcessStepId": "OP11",
    "unitCost": 14
  },
  {
    "id": "EKO-8",
    "partNumber": "EKO-OP11-04",
    "name": "Śruba M10x30",
    "quantityPerUnit": 8,
    "container": "BoxKLT",
    "packageQuantity": 200,
    "associatedProcessStepId": "OP11",
    "unitCost": 1.2
  },
  {
    "id": "EKO-9",
    "partNumber": "EKO-OP11-05",
    "name": "Podkładka płaska M10",
    "quantityPerUnit": 8,
    "container": "BoxKLT",
    "packageQuantity": 500,
    "associatedProcessStepId": "OP11",
    "unitCost": 0.22
  },
  {
    "id": "EKO-10",
    "partNumber": "EKO-OP12-01",
    "name": "Płyta montażowa wewnętrzna",
    "quantityPerUnit": 1,
    "container": "Pallet",
    "packageQuantity": 20,
    "associatedProcessStepId": "OP12",
    "unitCost": 185
  },
  {
    "id": "EKO-11",
    "partNumber": "EKO-OP12-02",
    "name": "Szyna montażowa DIN",
    "quantityPerUnit": 2,
    "container": "Tray",
    "packageQuantity": 30,
    "associatedProcessStepId": "OP12",
    "unitCost": 18
  },
  {
    "id": "EKO-12",
    "partNumber": "EKO-OP12-03",
    "name": "Wiązka przewodów wewnętrzna",
    "quantityPerUnit": 1,
    "container": "BoxKLT",
    "packageQuantity": 10,
    "associatedProcessStepId": "OP12",
    "unitCost": 95
  },
  {
    "id": "EKO-13",
    "partNumber": "EKO-OP12-04",
    "name": "Przepust kablowy",
    "quantityPerUnit": 6,
    "container": "BoxKLT",
    "packageQuantity": 100,
    "associatedProcessStepId": "OP12",
    "unitCost": 3.8
  },
  {
    "id": "EKO-14",
    "partNumber": "EKO-OP12-05",
    "name": "Opaska kablowa",
    "quantityPerUnit": 12,
    "container": "BoxKLT",
    "packageQuantity": 1000,
    "associatedProcessStepId": "OP12",
    "unitCost": 0.18
  },
  {
    "id": "EKO-15",
    "partNumber": "EKO-OP13-01",
    "name": "Skrzydło drzwi lewe",
    "quantityPerUnit": 1,
    "container": "Pallet",
    "packageQuantity": 12,
    "associatedProcessStepId": "OP13",
    "unitCost": 210
  },
  {
    "id": "EKO-16",
    "partNumber": "EKO-OP13-02",
    "name": "Zawias drzwi lewych",
    "quantityPerUnit": 3,
    "container": "BoxKLT",
    "packageQuantity": 60,
    "associatedProcessStepId": "OP13",
    "unitCost": 9.5
  },
  {
    "id": "EKO-17",
    "partNumber": "EKO-OP13-03",
    "name": "Komplet uszczelki drzwi lewych",
    "quantityPerUnit": 1,
    "container": "Carton",
    "packageQuantity": 20,
    "associatedProcessStepId": "OP13",
    "unitCost": 24
  },
  {
    "id": "EKO-18",
    "partNumber": "EKO-OP13-04",
    "name": "Zamek drzwi lewych",
    "quantityPerUnit": 1,
    "container": "BoxKLT",
    "packageQuantity": 40,
    "associatedProcessStepId": "OP13",
    "unitCost": 32
  },
  {
    "id": "EKO-19",
    "partNumber": "EKO-OP13-05",
    "name": "Nit zrywalny 4x10",
    "quantityPerUnit": 12,
    "container": "BoxKLT",
    "packageQuantity": 1000,
    "associatedProcessStepId": "OP13",
    "unitCost": 0.25
  },
  {
    "id": "EKO-20",
    "partNumber": "EKO-OP14-01",
    "name": "Panel przedni",
    "quantityPerUnit": 1,
    "container": "Pallet",
    "packageQuantity": 15,
    "associatedProcessStepId": "OP14",
    "unitCost": 160
  },
  {
    "id": "EKO-21",
    "partNumber": "EKO-OP14-02",
    "name": "Ramka panelu sterowania",
    "quantityPerUnit": 1,
    "container": "Tray",
    "packageQuantity": 20,
    "associatedProcessStepId": "OP14",
    "unitCost": 38
  },
  {
    "id": "EKO-22",
    "partNumber": "EKO-OP14-03",
    "name": "Przycisk podświetlany",
    "quantityPerUnit": 2,
    "container": "BoxKLT",
    "packageQuantity": 50,
    "associatedProcessStepId": "OP14",
    "unitCost": 22
  },
  {
    "id": "EKO-23",
    "partNumber": "EKO-OP14-04",
    "name": "Tabliczka opisowa panelu",
    "quantityPerUnit": 1,
    "container": "Carton",
    "packageQuantity": 100,
    "associatedProcessStepId": "OP14",
    "unitCost": 4.8
  },
  {
    "id": "EKO-24",
    "partNumber": "EKO-OP14-05",
    "name": "Śruba panelu M4x12",
    "quantityPerUnit": 8,
    "container": "BoxKLT",
    "packageQuantity": 500,
    "associatedProcessStepId": "OP14",
    "unitCost": 0.16
  },
  {
    "id": "EKO-25",
    "partNumber": "EKO-OP15-01",
    "name": "Skrzydło drzwi prawe",
    "quantityPerUnit": 1,
    "container": "Pallet",
    "packageQuantity": 12,
    "associatedProcessStepId": "OP15",
    "unitCost": 210
  },
  {
    "id": "EKO-26",
    "partNumber": "EKO-OP15-02",
    "name": "Zawias drzwi prawych",
    "quantityPerUnit": 3,
    "container": "BoxKLT",
    "packageQuantity": 60,
    "associatedProcessStepId": "OP15",
    "unitCost": 9.5
  },
  {
    "id": "EKO-27",
    "partNumber": "EKO-OP15-03",
    "name": "Komplet uszczelki drzwi prawych",
    "quantityPerUnit": 1,
    "container": "Carton",
    "packageQuantity": 20,
    "associatedProcessStepId": "OP15",
    "unitCost": 24
  },
  {
    "id": "EKO-28",
    "partNumber": "EKO-OP15-04",
    "name": "Zamek drzwi prawych",
    "quantityPerUnit": 1,
    "container": "BoxKLT",
    "packageQuantity": 40,
    "associatedProcessStepId": "OP15",
    "unitCost": 32
  },
  {
    "id": "EKO-29",
    "partNumber": "EKO-OP15-05",
    "name": "Śruba zawiasu M5x16",
    "quantityPerUnit": 12,
    "container": "BoxKLT",
    "packageQuantity": 500,
    "associatedProcessStepId": "OP15",
    "unitCost": 0.28
  },
  {
    "id": "EKO-30",
    "partNumber": "EKO-OP16-01",
    "name": "Panel tylny",
    "quantityPerUnit": 1,
    "container": "Pallet",
    "packageQuantity": 15,
    "associatedProcessStepId": "OP16",
    "unitCost": 145
  },
  {
    "id": "EKO-31",
    "partNumber": "EKO-OP16-02",
    "name": "Kratka wentylacyjna",
    "quantityPerUnit": 2,
    "container": "Carton",
    "packageQuantity": 20,
    "associatedProcessStepId": "OP16",
    "unitCost": 18
  },
  {
    "id": "EKO-32",
    "partNumber": "EKO-OP16-03",
    "name": "Wkład filtra wentylacyjnego",
    "quantityPerUnit": 2,
    "container": "Carton",
    "packageQuantity": 40,
    "associatedProcessStepId": "OP16",
    "unitCost": 12
  },
  {
    "id": "EKO-33",
    "partNumber": "EKO-OP16-04",
    "name": "Uszczelka panelu tylnego",
    "quantityPerUnit": 1,
    "container": "Carton",
    "packageQuantity": 30,
    "associatedProcessStepId": "OP16",
    "unitCost": 19
  },
  {
    "id": "EKO-34",
    "partNumber": "EKO-OP16-05",
    "name": "Śruba panelu M5x12",
    "quantityPerUnit": 10,
    "container": "BoxKLT",
    "packageQuantity": 500,
    "associatedProcessStepId": "OP16",
    "unitCost": 0.24
  },
  {
    "id": "EKO-35",
    "partNumber": "EKO-OP17-01",
    "name": "Panel dachowy",
    "quantityPerUnit": 1,
    "container": "Pallet",
    "packageQuantity": 12,
    "associatedProcessStepId": "OP17",
    "unitCost": 190
  },
  {
    "id": "EKO-36",
    "partNumber": "EKO-OP17-02",
    "name": "Wspornik dachu",
    "quantityPerUnit": 4,
    "container": "BoxKLT",
    "packageQuantity": 40,
    "associatedProcessStepId": "OP17",
    "unitCost": 12
  },
  {
    "id": "EKO-37",
    "partNumber": "EKO-OP17-03",
    "name": "Komplet uszczelnienia dachu",
    "quantityPerUnit": 1,
    "container": "Carton",
    "packageQuantity": 20,
    "associatedProcessStepId": "OP17",
    "unitCost": 26
  },
  {
    "id": "EKO-38",
    "partNumber": "EKO-OP17-04",
    "name": "Śruba dachowa M6x20",
    "quantityPerUnit": 12,
    "container": "BoxKLT",
    "packageQuantity": 300,
    "associatedProcessStepId": "OP17",
    "unitCost": 0.42
  },
  {
    "id": "EKO-39",
    "partNumber": "EKO-OP17-05",
    "name": "Zaślepka otworu dachowego",
    "quantityPerUnit": 4,
    "container": "BoxKLT",
    "packageQuantity": 200,
    "associatedProcessStepId": "OP17",
    "unitCost": 1.1
  },
  {
    "id": "EKO-40",
    "partNumber": "EKO-OP18-01",
    "name": "Korpus zespołu górnego",
    "quantityPerUnit": 1,
    "container": "Pallet",
    "packageQuantity": 8,
    "associatedProcessStepId": "OP18",
    "unitCost": 280
  },
  {
    "id": "EKO-41",
    "partNumber": "EKO-OP18-02",
    "name": "Pokrywa zespołu górnego",
    "quantityPerUnit": 1,
    "container": "Pallet",
    "packageQuantity": 12,
    "associatedProcessStepId": "OP18",
    "unitCost": 120
  },
  {
    "id": "EKO-42",
    "partNumber": "EKO-OP18-03",
    "name": "Izolator mocowania zespołu",
    "quantityPerUnit": 4,
    "container": "BoxKLT",
    "packageQuantity": 100,
    "associatedProcessStepId": "OP18",
    "unitCost": 5.5
  },
  {
    "id": "EKO-43",
    "partNumber": "EKO-OP18-04",
    "name": "Złącze zespołu górnego",
    "quantityPerUnit": 2,
    "container": "Tray",
    "packageQuantity": 40,
    "associatedProcessStepId": "OP18",
    "unitCost": 16
  },
  {
    "id": "EKO-44",
    "partNumber": "EKO-OP18-05",
    "name": "Śruba zespołu M6x16",
    "quantityPerUnit": 8,
    "container": "BoxKLT",
    "packageQuantity": 500,
    "associatedProcessStepId": "OP18",
    "unitCost": 0.36
  },
  {
    "id": "EKO-45",
    "partNumber": "EKO-OP19-01",
    "name": "Etykieta wyniku testu",
    "quantityPerUnit": 1,
    "container": "Carton",
    "packageQuantity": 1000,
    "associatedProcessStepId": "OP19",
    "unitCost": 0.12
  },
  {
    "id": "EKO-46",
    "partNumber": "EKO-OP19-02",
    "name": "Plomba kontroli jakości",
    "quantityPerUnit": 2,
    "container": "BoxKLT",
    "packageQuantity": 500,
    "associatedProcessStepId": "OP19",
    "unitCost": 0.35
  },
  {
    "id": "EKO-47",
    "partNumber": "EKO-OP19-03",
    "name": "Chusteczka bezpyłowa",
    "quantityPerUnit": 2,
    "container": "Carton",
    "packageQuantity": 200,
    "associatedProcessStepId": "OP19",
    "unitCost": 0.45
  },
  {
    "id": "EKO-48",
    "partNumber": "EKO-OP19-04",
    "name": "Karta pomiarowa wyrobu",
    "quantityPerUnit": 1,
    "container": "Carton",
    "packageQuantity": 500,
    "associatedProcessStepId": "OP19",
    "unitCost": 0.08
  },
  {
    "id": "EKO-49",
    "partNumber": "EKO-OP19-05",
    "name": "Jednorazowa osłona złącza testowego",
    "quantityPerUnit": 2,
    "container": "BoxKLT",
    "packageQuantity": 100,
    "associatedProcessStepId": "OP19",
    "unitCost": 0.6
  },
  {
    "id": "EKO-50",
    "partNumber": "EKO-OP20-01",
    "name": "Wspornik zespołu do ramy",
    "quantityPerUnit": 4,
    "container": "BoxKLT",
    "packageQuantity": 40,
    "associatedProcessStepId": "OP20",
    "unitCost": 18
  },
  {
    "id": "EKO-51",
    "partNumber": "EKO-OP20-02",
    "name": "Poduszka wibroizolacyjna",
    "quantityPerUnit": 4,
    "container": "BoxKLT",
    "packageQuantity": 80,
    "associatedProcessStepId": "OP20",
    "unitCost": 8.5
  },
  {
    "id": "EKO-52",
    "partNumber": "EKO-OP20-03",
    "name": "Śruba mocująca M8x35",
    "quantityPerUnit": 8,
    "container": "BoxKLT",
    "packageQuantity": 200,
    "associatedProcessStepId": "OP20",
    "unitCost": 0.85
  },
  {
    "id": "EKO-53",
    "partNumber": "EKO-OP20-04",
    "name": "Podkładka sprężysta M8",
    "quantityPerUnit": 8,
    "container": "BoxKLT",
    "packageQuantity": 500,
    "associatedProcessStepId": "OP20",
    "unitCost": 0.19
  },
  {
    "id": "EKO-54",
    "partNumber": "EKO-OP20-05",
    "name": "Przewód wyrównawczy z końcówkami",
    "quantityPerUnit": 1,
    "container": "BoxKLT",
    "packageQuantity": 30,
    "associatedProcessStepId": "OP20",
    "unitCost": 7.8
  },
  {
    "id": "EKO-55",
    "partNumber": "EKO-OP21-01",
    "name": "Paleta transportowa",
    "quantityPerUnit": 1,
    "container": "Pallet",
    "packageQuantity": 15,
    "associatedProcessStepId": "OP21",
    "unitCost": 48
  },
  {
    "id": "EKO-56",
    "partNumber": "EKO-OP21-02",
    "name": "Karton ochronny wyrobu",
    "quantityPerUnit": 1,
    "container": "Pallet",
    "packageQuantity": 20,
    "associatedProcessStepId": "OP21",
    "unitCost": 32
  },
  {
    "id": "EKO-57",
    "partNumber": "EKO-OP21-03",
    "name": "Narożnik ochronny piankowy",
    "quantityPerUnit": 8,
    "container": "Carton",
    "packageQuantity": 120,
    "associatedProcessStepId": "OP21",
    "unitCost": 1.4
  },
  {
    "id": "EKO-58",
    "partNumber": "EKO-OP21-04",
    "name": "Odcinek taśmy spinającej 3 m",
    "quantityPerUnit": 4,
    "container": "Carton",
    "packageQuantity": 100,
    "associatedProcessStepId": "OP21",
    "unitCost": 1.65
  },
  {
    "id": "EKO-59",
    "partNumber": "EKO-OP21-05",
    "name": "Etykieta wysyłkowa",
    "quantityPerUnit": 2,
    "container": "Carton",
    "packageQuantity": 1000,
    "associatedProcessStepId": "OP21",
    "unitCost": 0.15
  }
]};
