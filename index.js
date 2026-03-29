import express from "express";
import fetch from "node-fetch";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// 1. Configuracion del Servidor Express (Fake Port para Render)
const app = express();
const PORT = process.env.PORT || 3000;

// Ruta principal para verificar el estado
app.get("/", (req, res) => {
  res.send("Hostara Backend: Activo y escuchando pedidos.");
});

// Ruta dedicada para el Pinger (mantiene vivo el servicio)
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

app.listen(PORT, () => {
  console.log(`Servidor HTTP escuchando en puerto ${PORT} (Render Keep-Alive)`);
});

// 2. Configuracion de Firebase
if (!process.env.FIREBASE_KEY) {
  console.error("Error: No se encontro la variable FIREBASE_KEY");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

console.log("Escuchando nuevos pedidos para Carlo Essential...");

// 3. Logica del Listener de Firestore
let initialized = false;

db.collection("orders").onSnapshot(async (snap) => {
  // Evitamos que se disparen notificaciones por pedidos viejos al arrancar
  if (!initialized) {
    initialized = true;
    console.log("Conexion establecida. Esperando nuevos pedidos...");
    return;
  }

  for (const change of snap.docChanges()) {
    // Solo actuamos si el documento es nuevo ("added")
    if (change.type === "added") {
      console.log("Nuevo pedido detectado!");

      try {
        const response = await fetch("https://ntfy.sh/Carlo_essential", {
          method: "POST",
          headers: {
            "Title": "Nuevo pedido en tu tienda",
            "Priority": "high",
            // Eliminamos los tags que generan iconos visuales
            "Icon": "https://carloessential.com.ar/logo.webp",
            "Click": "https://carlo-notificaciones.vercel.app/admin.html",
            "Content-Type": "text/plain; charset=utf-8"
          },
          body: "Clic para verlo"
        });

        if (response.ok) {
          console.log("Notificacion enviada correctamente a ntfy.");
        } else {
          console.error("Error en ntfy:", response.statusText);
        }
      } catch (error) {
        console.error("Error al conectar con ntfy:", error.message);
      }
    }
  }
});
